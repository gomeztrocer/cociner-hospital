-- CocinerHosp: sesiones opacas y operaciones internas para usuario + PIN.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_sessions_token_hash_idx ON public.app_sessions (token_hash);
CREATE INDEX IF NOT EXISTS app_sessions_expires_at_idx ON public.app_sessions (expires_at);
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_sessions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.cociner_auth_login(p_username TEXT, p_pin TEXT, p_token_hash TEXT, p_expires_at TIMESTAMPTZ)
RETURNS TABLE(id UUID, username TEXT, nombre_completo TEXT, rol TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE u public.usuarios%ROWTYPE;
BEGIN
  SELECT usr.* INTO u FROM public.usuarios AS usr
  WHERE usr.username = lower(trim(p_username))
    AND usr.activo = true
    AND crypt(
      p_pin,
      CASE WHEN usr.pin_hash LIKE '$2b$%' THEN '$2a$' || substring(usr.pin_hash FROM 5) ELSE usr.pin_hash END
    ) = CASE WHEN usr.pin_hash LIKE '$2b$%' THEN '$2a$' || substring(usr.pin_hash FROM 5) ELSE usr.pin_hash END;
  IF NOT FOUND THEN RETURN; END IF;
  DELETE FROM public.app_sessions WHERE expires_at <= now();
  INSERT INTO public.app_sessions (user_id, token_hash, expires_at) VALUES (u.id, p_token_hash, p_expires_at);
  RETURN QUERY SELECT u.id, u.username, coalesce(u.nombre_completo, u.username), u.rol;
END; $$;

CREATE OR REPLACE FUNCTION public.cociner_logout(p_token_hash TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.app_sessions WHERE token_hash = p_token_hash;
$$;

CREATE OR REPLACE FUNCTION public.cociner_change_own_pin(p_token_hash TEXT, p_current_pin TEXT, p_new_pin TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  UPDATE public.usuarios u SET pin_hash = crypt(p_new_pin, gen_salt('bf', 12))
  FROM public.app_sessions s
  WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND s.user_id = u.id
    AND u.activo = true
    AND crypt(
      p_current_pin,
      CASE WHEN u.pin_hash LIKE '$2b$%' THEN '$2a$' || substring(u.pin_hash FROM 5) ELSE u.pin_hash END
    ) = CASE WHEN u.pin_hash LIKE '$2b$%' THEN '$2a$' || substring(u.pin_hash FROM 5) ELSE u.pin_hash END;
  IF NOT FOUND THEN RAISE EXCEPTION 'PIN actual incorrecto o sesión caducada'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.cociner_admin_list(p_token_hash TEXT)
RETURNS TABLE(id UUID, username TEXT, nombre_completo TEXT, rol TEXT, centro_id TEXT, activo BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_sessions s JOIN public.usuarios u ON u.id = s.user_id WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.activo AND u.rol IN ('admin', 'chef_ejecutivo')) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY SELECT u.id, u.username, coalesce(u.nombre_completo, u.username), u.rol, u.centro_id, u.activo, u.created_at FROM public.usuarios u ORDER BY u.nombre_completo;
END; $$;

CREATE OR REPLACE FUNCTION public.cociner_admin_create(p_token_hash TEXT, p_nombre TEXT, p_username TEXT, p_pin TEXT, p_rol TEXT, p_centro_id TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_sessions s JOIN public.usuarios u ON u.id = s.user_id WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.activo AND u.rol = 'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_rol NOT IN ('cocinero', 'chef_ejecutivo', 'admin') THEN RAISE EXCEPTION 'Rol inválido'; END IF;
  INSERT INTO public.usuarios (nombre_completo, username, pin_hash, rol, centro_id, activo) VALUES (trim(p_nombre), lower(trim(p_username)), crypt(p_pin, gen_salt('bf', 12)), p_rol, p_centro_id, true);
END; $$;

CREATE OR REPLACE FUNCTION public.cociner_admin_toggle(p_token_hash TEXT, p_usuario_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_id UUID; target public.usuarios%ROWTYPE;
BEGIN
  SELECT u.id INTO actor_id FROM public.app_sessions s JOIN public.usuarios u ON u.id = s.user_id WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.activo AND u.rol = 'admin';
  IF actor_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT * INTO target FROM public.usuarios WHERE id = p_usuario_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;
  IF target.id = actor_id AND target.activo THEN RAISE EXCEPTION 'No puedes desactivar tu propia cuenta'; END IF;
  IF target.rol = 'admin' AND target.activo AND (SELECT count(*) FROM public.usuarios WHERE rol = 'admin' AND activo) <= 1 THEN RAISE EXCEPTION 'Debe quedar al menos un administrador activo'; END IF;
  UPDATE public.usuarios SET activo = NOT target.activo WHERE id = target.id;
END; $$;

CREATE OR REPLACE FUNCTION public.cociner_admin_change_pin(p_token_hash TEXT, p_usuario_id UUID, p_pin TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_sessions s JOIN public.usuarios u ON u.id = s.user_id WHERE s.token_hash = p_token_hash AND s.expires_at > now() AND u.activo AND u.rol = 'admin') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE public.usuarios SET pin_hash = crypt(p_pin, gen_salt('bf', 12)) WHERE id = p_usuario_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;
END; $$;

REVOKE ALL ON FUNCTION public.cociner_auth_login(TEXT, TEXT, TEXT, TIMESTAMPTZ), public.cociner_logout(TEXT), public.cociner_change_own_pin(TEXT, TEXT, TEXT), public.cociner_admin_list(TEXT), public.cociner_admin_create(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT), public.cociner_admin_toggle(TEXT, UUID), public.cociner_admin_change_pin(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cociner_auth_login(TEXT, TEXT, TEXT, TIMESTAMPTZ), public.cociner_logout(TEXT), public.cociner_change_own_pin(TEXT, TEXT, TEXT), public.cociner_admin_list(TEXT), public.cociner_admin_create(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT), public.cociner_admin_toggle(TEXT, UUID), public.cociner_admin_change_pin(TEXT, UUID, TEXT) TO service_role;

-- Ejecutar solo tras publicar y comprobar la nueva app:
-- DROP FUNCTION IF EXISTS public.verificar_usuario(TEXT);

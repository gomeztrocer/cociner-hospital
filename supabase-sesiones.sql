-- CocinerHosp: sesiones opacas para el acceso con usuario + PIN.
-- La tabla conserva hashes de tokens. No expone filas a la API pública.

CREATE TABLE IF NOT EXISTS public.app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_sessions_token_hash_idx
  ON public.app_sessions (token_hash);

CREATE INDEX IF NOT EXISTS app_sessions_expires_at_idx
  ON public.app_sessions (expires_at);

ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

-- Solo las Edge Functions, usando la clave de servidor, acceden a estas filas.
REVOKE ALL ON TABLE public.app_sessions FROM anon, authenticated;

-- El login se mueve a la Edge Function cociner-auth. Esta RPC devolvía el hash
-- del PIN a cualquier cliente que conociera un usuario.
DROP FUNCTION IF EXISTS public.verificar_usuario(TEXT);

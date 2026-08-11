import type { UnidadCatalogo } from '../types/catalogo'

export const UNIDADES_CATALOGO_FALLBACK: UnidadCatalogo[] = [
  'pieza', 'filete', 'muslo', 'unidad', 'kg', 'litro',
  'barqueta', 'caja', 'cubeta', 'gastronorm',
].map((nombre) => ({ id: `fallback:${nombre}`, nombre }))

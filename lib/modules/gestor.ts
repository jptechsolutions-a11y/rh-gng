/**
 * Usuário "gestor" (gerado a partir dos líderes do QLP) só acessa estes módulos.
 * Em Uniformes ele apenas solicita e acompanha (a gestão das solicitações é do admin).
 */
export const GESTOR_PREFIXOS = [
  '/inicio',
  '/avaliacao',
  '/indicadores',
  '/qlp',
  '/ic',
  '/experiencia',
  '/uniformes',
] as const;

export function gestorPodeAcessar(pathname: string): boolean {
  return GESTOR_PREFIXOS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

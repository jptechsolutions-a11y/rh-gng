export type TabKey = 'roteiro' | 'formulario' | 'percepcao';

export function parseTab(value: string | undefined | null): TabKey {
  if (value === 'formulario' || value === 'percepcao') return value;
  return 'roteiro';
}

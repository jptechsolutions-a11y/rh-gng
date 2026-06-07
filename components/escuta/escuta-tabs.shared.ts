export type TabKey = 'roteiro' | 'formulario' | 'percepcao' | 'reunioes' | 'nuvem';

export function parseTab(value: string | undefined | null): TabKey {
  if (
    value === 'formulario' ||
    value === 'percepcao' ||
    value === 'reunioes' ||
    value === 'nuvem'
  ) return value;
  return 'roteiro';
}

export type TipoPergunta = 'unica' | 'multipla' | 'texto' | 'nota';

export const TIPO_LABEL: Record<TipoPergunta, string> = {
  unica: 'Escolha única',
  multipla: 'Múltipla escolha',
  texto: 'Texto livre',
  nota: 'Nota (1 a 5)',
};

export type Valor = string | string[] | number;

export interface PerguntaInput {
  texto: string;
  tipo: TipoPergunta;
  obrigatoria: boolean;
  opcoes: string[];
}

/** Candidatos de chapa: como digitado, com zeros à esquerda (8 dígitos) e sem zeros. */
export function candidatosChapa(raw: string): string[] {
  const s = raw.trim().replace(/\s+/g, '');
  if (!s) return [];
  const semZeros = s.replace(/^0+(?=\d)/, '');
  return Array.from(new Set([s, s.padStart(8, '0'), semZeros]));
}

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
export function gerarSlug(tamanho = 10): string {
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

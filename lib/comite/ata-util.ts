export const NOME_PARTICIPANTE_MAX = 120;
export const PARTICIPANTES_MAX = 40;

/** Limpa a lista de participantes: tira espaços sobrando, vazios e repetidos (sem diferenciar maiúsculas). */
export function limparParticipantes(entrada: ReadonlyArray<string>): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const bruto of entrada) {
    const nome = bruto.replace(/\s+/g, ' ').trim();
    const chave = nome.toLowerCase();
    if (!nome || vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(nome);
  }
  return saida;
}

/** Lê participantes do banco (jsonb) com segurança: só textos não vazios. */
export function participantesDoBanco(valor: unknown): string[] {
  return Array.isArray(valor) ? limparParticipantes(valor.filter((v): v is string => typeof v === 'string')) : [];
}

export interface ResumoAta {
  total: number;
  aprovados: number;
  naoAprovados: number;
  pendentes: number;
}

export function resumirDecisoes(decisoes: ReadonlyArray<'aprovado' | 'nao_aprovado' | null>): ResumoAta {
  const aprovados = decisoes.filter((d) => d === 'aprovado').length;
  const naoAprovados = decisoes.filter((d) => d === 'nao_aprovado').length;
  return { total: decisoes.length, aprovados, naoAprovados, pendentes: decisoes.length - aprovados - naoAprovados };
}

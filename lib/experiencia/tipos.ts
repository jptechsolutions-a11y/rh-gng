/** Linha do arquivo: um colaborador em experiência (já filtrado: PERLOG e Ativo). */
export interface ExpLinhaInput {
  filialCodigo: string;
  chapa: string;
  nome: string;
  dtAdmissao: string | null; // yyyy-mm-dd
  avaliadorArquivo: string | null;
  prev35: string | null;
  status35: string | null; // PFP | PDP | RDP | RFP
  prev70: string | null;
  status70: string | null;
}

/** Quantos dias antes do prazo a pendência já vira alerta. */
export const DIAS_ALERTA = 5;

export type ExpEtapa = '35' | '70';
export type ExpSituacao = 'atrasada' | 'alerta' | 'prazo';

/** Pendência (uma por colaborador × etapa) enviada ao dashboard. */
export interface ExpPendencia {
  filial: string;
  chapa: string;
  nome: string;
  admissao: string | null;
  gestor: string;
  etapa: ExpEtapa;
  prazo: string; // yyyy-mm-dd (data prevista)
  /** dias até o prazo: negativo = atrasada há N dias */
  dias: number;
  situacao: ExpSituacao;
}

export interface ExpResumoImport {
  id: string;
  dataRef: string;
  colaboradores: number;
}

export const SEM_GESTOR = 'Sem gestor';

/** Pendente = PFP/PDP (ou aguardando). Realizada = RDP/RFP/concluída. */
export const statusPendente = (s: string | null | undefined) => {
  const t = (s ?? '').trim().toUpperCase();
  return t.startsWith('PFP') || t.startsWith('PDP') || t.includes('AGUARDANDO');
};

/** Classifica pelo prazo vs. hoje (yyyy-mm-dd). */
export function classificar(prazo: string, hoje: string): { dias: number; situacao: ExpSituacao } {
  const d = Math.round((Date.parse(prazo + 'T00:00:00Z') - Date.parse(hoje + 'T00:00:00Z')) / 86400000);
  return { dias: d, situacao: d < 0 ? 'atrasada' : d <= DIAS_ALERTA ? 'alerta' : 'prazo' };
}

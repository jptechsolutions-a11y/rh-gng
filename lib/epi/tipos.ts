export type StatusEpi = 'REGULAR' | 'TROCAR' | 'SEM_EMPRESTIMO';

export const STATUS_LABEL: Record<StatusEpi, string> = {
  REGULAR: 'Regular',
  TROCAR: 'Trocar EPI',
  SEM_EMPRESTIMO: 'Sem empréstimo',
};

/** Linha da aba "Base de dados" do painel de EPI (já filtrada para PERLOG), como trafega do navegador ao servidor. */
export interface EpiLinhaInput {
  filialCodigo: string;
  regional: string | null;
  bandeira: string | null;
  secao: string | null;
  chapa: string;
  nome: string;
  funcao: string | null;
  dataAdmissao: string | null; // ISO yyyy-mm-dd
  codsituacao: string | null;
  itemRisco: string | null;
  codEpi: string | null;
  epi: string;
  durabilidade: number | null;
  diasAVencer: number | null;
  dataEmprestimo: string | null; // ISO yyyy-mm-dd
  status: StatusEpi;
  tst: string | null;
}

/** Linha enxuta que vai para o dashboard (cliente). */
export interface EpiRow {
  filial: string;
  secao: string;
  chapa: string;
  nome: string;
  funcao: string;
  epi: string;
  risco: string;
  status: StatusEpi;
  dias: number | null; // dias a vencer (só quando há empréstimo)
  dtEmp: string | null;
  adm: string | null;
  sit: string;
  tst: string;
}

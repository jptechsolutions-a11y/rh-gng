import { calcVariacao, type Variacao } from '@/app/(app)/indicadores/bh/variacao';

export type SnapshotRow = {
  filialId: string | null;
  filialNome: string | null;
  filialCodigo: string | null;
  chapa: string;
  nome: string;
  funcao: string | null;
  secao: string | null;
  horasDecimal: number;
  valorPgto: number;
};

export type Resumo = {
  colaboradores: number;
  totalHoras: number;
  valorTotal: number;
  mediaHoras: number;
};

export function agregarResumo(rows: SnapshotRow[]): Resumo {
  const totalHoras = rows.reduce((a, r) => a + r.horasDecimal, 0);
  const valorTotal = rows.reduce((a, r) => a + r.valorPgto, 0);
  const comSaldo = rows.filter((r) => r.horasDecimal > 0);
  const mediaHoras = comSaldo.length === 0 ? 0 : totalHoras / comSaldo.length;
  return {
    colaboradores: rows.length,
    totalHoras: round2(totalHoras),
    valorTotal: round2(valorTotal),
    mediaHoras: round2(mediaHoras),
  };
}

export function top5Por(
  rows: SnapshotRow[],
  campo: 'funcao' | 'secao',
): Array<{ label: string; valor: number; valorPgto: number }> {
  const map = new Map<string, { horas: number; valor: number }>();
  for (const r of rows) {
    const k = (r[campo] ?? '').trim();
    if (!k) continue;
    const cur = map.get(k) ?? { horas: 0, valor: 0 };
    cur.horas += r.horasDecimal;
    cur.valor += r.valorPgto;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, valor: round2(v.horas), valorPgto: round2(v.valor) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
}

export type ResumoFilial = {
  filialId: string | null;
  filialNome: string | null;
  saldoAtual: number;
  saldoAnterior: number;
  variacao: Variacao;
};

export function agregarResumoPorFilial(atual: SnapshotRow[], anterior: SnapshotRow[]): ResumoFilial[] {
  const sumBy = (rows: SnapshotRow[]) => {
    const m = new Map<string, { nome: string | null; total: number }>();
    for (const r of rows) {
      const key = r.filialId ?? `__sem__:${r.filialCodigo ?? ''}`;
      const cur = m.get(key) ?? { nome: r.filialNome, total: 0 };
      cur.total += r.horasDecimal;
      m.set(key, cur);
    }
    return m;
  };
  const A = sumBy(atual);
  const B = sumBy(anterior);
  const keys = new Set<string>([...A.keys(), ...B.keys()]);
  const out: ResumoFilial[] = [];
  for (const k of keys) {
    const a = A.get(k); const b = B.get(k);
    const saldoAtual    = round2(a?.total ?? 0);
    const saldoAnterior = round2(b?.total ?? 0);
    out.push({
      filialId: k.startsWith('__sem__') ? null : k,
      filialNome: a?.nome ?? b?.nome ?? null,
      saldoAtual, saldoAnterior,
      variacao: calcVariacao(saldoAtual, saldoAnterior),
    });
  }
  return out.sort((x, y) => (y.saldoAtual - x.saldoAtual));
}

export type DetalhadoRow = SnapshotRow & {
  saldoAnterior: number | null;
  variacao: Variacao;
  novo: boolean;
};

export function montarDetalhado(atual: SnapshotRow[], anterior: SnapshotRow[]): DetalhadoRow[] {
  const ant = new Map<string, number>();
  for (const r of anterior) ant.set(r.chapa, (ant.get(r.chapa) ?? 0) + r.horasDecimal);
  return atual.map((r) => {
    const prev = ant.has(r.chapa) ? round2(ant.get(r.chapa)!) : null;
    return {
      ...r,
      saldoAnterior: prev,
      variacao: calcVariacao(r.horasDecimal, prev),
      novo: prev == null,
    };
  });
}

function round2(n: number) { return Math.round(n * 100) / 100; }

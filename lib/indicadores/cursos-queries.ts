import { calcVariacao, type Variacao } from '@/app/(app)/indicadores/bh/variacao';

export type CursosSnapshotRow = {
  filialId: string | null;
  filialNome: string | null;
  filialCodigo: string | null;
  codfilialOrigem: string;
  chapa: string;
  nome: string;
  funcao: string | null;
  secao: string | null;
  regional: string | null;
  bandeira: string | null;
  codsituacao: string | null;
  tipo: string | null;
  dataTreinamento: string | null;
  pendencia: string | null;
};

export type ResumoCursos = {
  colaboradores: number;
  totalPendencias: number;
  mediaPorPessoa: number;
};

export function agregarResumoCursos(rows: CursosSnapshotRow[]): ResumoCursos {
  const totalPendencias = rows.length;
  const colaboradores = new Set(rows.map((r) => r.chapa)).size;
  const mediaPorPessoa = colaboradores === 0 ? 0 : totalPendencias / colaboradores;
  return {
    colaboradores,
    totalPendencias,
    mediaPorPessoa: Math.round(mediaPorPessoa * 100) / 100,
  };
}

export function top5PorCursos(
  rows: CursosSnapshotRow[],
  campo: 'funcao' | 'secao' | 'tipo',
): Array<{ label: string; valor: number; pct: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = (r[campo] ?? '').trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...map.entries()]
    .map(([label, valor]) => ({
      label, valor,
      pct: Math.round((valor / total) * 1000) / 10,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
}

export type ResumoFilialCursos = {
  filialId: string | null;
  filialNome: string | null;
  filialCodigo: string | null;
  qtdAtual: number;
  qtdAnterior: number;
  qtdColaboradores: number;
  variacao: Variacao;
};

export function agregarResumoPorFilialCursos(
  atual: CursosSnapshotRow[],
  anterior: CursosSnapshotRow[],
): ResumoFilialCursos[] {
  type Cur = {
    nome: string | null;
    codigo: string | null;
    qtd: number;
    chapas: Set<string>;
  };
  const sumBy = (rows: CursosSnapshotRow[]) => {
    const m = new Map<string, Cur>();
    for (const r of rows) {
      const key = r.filialId ?? `__sem__:${r.filialCodigo ?? r.codfilialOrigem ?? ''}`;
      const cur = m.get(key) ?? {
        nome: r.filialNome,
        codigo: r.filialCodigo ?? r.codfilialOrigem,
        qtd: 0,
        chapas: new Set<string>(),
      };
      cur.qtd += 1;
      cur.chapas.add(r.chapa);
      m.set(key, cur);
    }
    return m;
  };
  const A = sumBy(atual);
  const B = sumBy(anterior);
  const keys = new Set<string>([...A.keys(), ...B.keys()]);
  const out: ResumoFilialCursos[] = [];
  for (const k of keys) {
    const a = A.get(k); const b = B.get(k);
    const qtdAtual    = a?.qtd ?? 0;
    const qtdAnterior = b?.qtd ?? 0;
    out.push({
      filialId: k.startsWith('__sem__') ? null : k,
      filialNome: a?.nome ?? b?.nome ?? null,
      filialCodigo: a?.codigo ?? b?.codigo ?? null,
      qtdAtual, qtdAnterior,
      qtdColaboradores: a?.chapas.size ?? 0,
      variacao: calcVariacao(qtdAtual, qtdAnterior),
    });
  }
  // Ordena por quem mais reduziu (delta mais negativo) para quem menos reduziu
  // (ou aumentou). Empate cai no maior volume atual.
  return out.sort((x, y) => (x.variacao.delta - y.variacao.delta) || (y.qtdAtual - x.qtdAtual));
}

export type DetalhadoCursosRow = {
  filialId: string | null;
  chapa: string;
  nome: string;
  funcao: string | null;
  secao: string | null;
  qtdPendencias: number;
  qtdAnterior: number;
  variacao: Variacao;
  ocorrencias: Array<{ tipo: string | null; pendencia: string | null; data: string | null }>;
};

export function montarDetalhadoCursos(
  atual: CursosSnapshotRow[],
  anterior: CursosSnapshotRow[],
): DetalhadoCursosRow[] {
  const antMap = new Map<string, number>();
  for (const r of anterior) antMap.set(r.chapa, (antMap.get(r.chapa) ?? 0) + 1);

  const map = new Map<string, DetalhadoCursosRow>();
  for (const r of atual) {
    const key = `${r.filialId ?? r.codfilialOrigem}|${r.chapa}`;
    const cur = map.get(key) ?? {
      filialId: r.filialId,
      chapa: r.chapa,
      nome: r.nome,
      funcao: r.funcao,
      secao: r.secao,
      qtdPendencias: 0,
      qtdAnterior: antMap.get(r.chapa) ?? 0,
      variacao: { delta: 0, deltaPct: null, tendencia: 'neutro' as const },
      ocorrencias: [],
    };
    cur.qtdPendencias += 1;
    cur.ocorrencias.push({ tipo: r.tipo, pendencia: r.pendencia, data: r.dataTreinamento });
    map.set(key, cur);
  }
  for (const v of map.values()) {
    v.variacao = calcVariacao(v.qtdPendencias, v.qtdAnterior);
    v.ocorrencias.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
  }
  return [...map.values()].sort((a, b) => b.qtdPendencias - a.qtdPendencias);
}

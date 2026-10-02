'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Users, ClipboardList, Building2, LayoutGrid, Briefcase, X } from 'lucide-react';
import { SubTabs } from '@/components/ui/sub-tabs';
import type { VagaRow } from './VagasQuadroTable';
import { VagasPivotTable } from './VagasPivotTable';
import { VagasRankingBars } from './VagasRankingBars';
import type { VagaStatus } from '@/db/schema';

type SubTab = 'indicadores' | 'detalhado';
type Dim = 'status' | 'filial' | 'secao' | 'funcao';

const DIM_LABEL: Record<Dim, string> = {
  status: 'Status',
  filial: 'Filial',
  secao: 'Seção',
  funcao: 'Função',
};

const valorDim: Record<Dim, (r: VagaRow) => string> = {
  status: (r) => r.statusNome,
  filial: (r) => r.filialCodigo,
  secao: (r) => r.secao ?? 'Sem seção',
  funcao: (r) => r.funcao,
};

const DIMS = Object.keys(valorDim) as Dim[];

function ranking(rows: VagaRow[], dim: Dim, limite?: number) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = valorDim[dim](r);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const arr = Array.from(map.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  return limite ? arr.slice(0, limite) : arr;
}

export function VagasView({
  rows,
  statusOptions,
  podeEditar,
}: {
  rows: VagaRow[];
  statusOptions: VagaStatus[];
  podeEditar: boolean;
}) {
  const [subTab, setSubTab] = useState<SubTab>('indicadores');
  const [filtros, setFiltros] = useState<Partial<Record<Dim, string>>>({});

  function alternar(dim: Dim, valor: string) {
    setFiltros((f) => {
      const next = { ...f };
      if (next[dim] === valor) delete next[dim];
      else next[dim] = valor;
      return next;
    });
  }

  const filiais = useMemo(
    () => Array.from(new Set(rows.map((r) => r.filialCodigo))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [rows],
  );

  const filtrosAtivos = DIMS.filter((d) => filtros[d] != null);

  const casa = (r: VagaRow, ignorar?: Dim) =>
    DIMS.every((d) => d === ignorar || filtros[d] == null || valorDim[d](r) === filtros[d]);

  // Filtro cruzado (estilo Power BI): cada gráfico considera os filtros de TODOS
  // os outros, mas ignora o próprio — assim a barra selecionada continua
  // visível ao lado das irmãs em vez de o gráfico colapsar numa barra só.
  const dados = useMemo(
    () => ({
      status: ranking(rows.filter((r) => casa(r, 'status')), 'status'),
      filial: ranking(rows.filter((r) => casa(r, 'filial')), 'filial'),
      secao: ranking(rows.filter((r) => casa(r, 'secao')), 'secao', 10),
      funcao: ranking(rows.filter((r) => casa(r, 'funcao')), 'funcao', 10),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, filtros],
  );

  const rowsFiltradas = useMemo(
    () => rows.filter((r) => casa(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, filtros],
  );

  return (
    <div className="space-y-5">
      <SubTabs<SubTab>
        value={subTab}
        onChange={setSubTab}
        items={[
          { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
          { id: 'detalhado', label: 'Detalhado', icon: Users },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">Filial</span>
          <select
            value={filtros.filial ?? ''}
            onChange={(e) =>
              setFiltros((f) => {
                const n = { ...f };
                if (e.target.value) n.filial = e.target.value; else delete n.filial;
                return n;
              })
            }
            className="rounded-lg border border-conecta-primary/15 bg-white px-3 py-1.5 text-sm font-display font-semibold text-conecta-primary"
          >
            <option value="">Todas as filiais</option>
            {filiais.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        {filtrosAtivos.length > 0 && (<>
          <span className="font-display text-[10px] uppercase tracking-[0.22em] text-conecta-muted font-semibold">
            Filtros
          </span>
          {filtrosAtivos.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFiltros((f) => { const n = { ...f }; delete n[d]; return n; })}
              className="inline-flex items-center gap-1.5 rounded-full bg-conecta-accent/10 border border-conecta-accent/30 text-conecta-accent px-2.5 py-1 text-[11px] font-display font-semibold hover:bg-conecta-accent/20 transition-colors"
              title="Remover filtro"
            >
              {DIM_LABEL[d]}: {filtros[d]}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFiltros({})}
            className="text-[11px] font-display font-semibold text-conecta-muted hover:text-conecta-accent underline underline-offset-2"
          >
            Limpar tudo
          </button>
          <span className="ml-auto text-[11px] font-display font-semibold tabular-nums text-conecta-muted">
            {rowsFiltradas.length} / {rows.length} vagas
          </span>
        </>)}
      </div>

      {subTab === 'indicadores' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VagasRankingBars
            titulo="Vagas por status"
            icon={ClipboardList}
            color="orange"
            labelWidthClass="w-40"
            data={dados.status}
            selected={filtros.status ?? null}
            onSelect={(v) => alternar('status', v)}
          />
          <VagasRankingBars
            titulo="Vagas em aberto por filial"
            icon={Building2}
            labelWidthClass="w-12"
            data={dados.filial}
            selected={filtros.filial ?? null}
            onSelect={(v) => alternar('filial', v)}
          />
          <VagasRankingBars
            titulo="Vagas em aberto por seção (top 10)"
            icon={LayoutGrid}
            labelWidthClass="w-32"
            data={dados.secao}
            selected={filtros.secao ?? null}
            onSelect={(v) => alternar('secao', v)}
          />
          <VagasRankingBars
            titulo="Vagas em aberto por função (top 10)"
            icon={Briefcase}
            labelWidthClass="w-32"
            data={dados.funcao}
            selected={filtros.funcao ?? null}
            onSelect={(v) => alternar('funcao', v)}
          />
        </div>
      ) : (
        <VagasPivotTable rows={rowsFiltradas} statusOptions={statusOptions} podeEditar={podeEditar} />
      )}
    </div>
  );
}

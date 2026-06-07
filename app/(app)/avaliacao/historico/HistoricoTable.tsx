'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Filter } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';
import { ClassificacaoBadge } from '@/components/avaliacao/ClassificacaoBadge';
import { EvolucaoIndicator } from '@/components/avaliacao/EvolucaoIndicator';
import { calcularEvolucao, type Classificacao } from '@/lib/avaliacao/calculos';
import type { HistoricoRow } from '@/actions/avaliacao';

type Filtros = Record<string, string | undefined>;

export function HistoricoTable({
  lista,
  filtros,
}: {
  lista: HistoricoRow[];
  filtros: Filtros;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(k: string, v?: string) {
    const u = new URLSearchParams(sp?.toString() ?? '');
    if (!v) u.delete(k);
    else u.set(k, v);
    u.delete('page');
    router.push(`/avaliacao/historico?${u.toString()}`);
  }

  const selectClass =
    'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';
  const inputClass =
    'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';

  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader
          label="Filtros"
          icon={Filter}
          action={
            <button
              type="button"
              onClick={() => router.push('/avaliacao/historico')}
              className="text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent transition-colors"
            >
              Limpar
            </button>
          }
        />
      </div>

      <div className="px-5 grid gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Input
          placeholder="Avaliado"
          defaultValue={filtros.nomeAvaliado ?? ''}
          onBlur={(e) => setParam('nomeAvaliado', e.target.value)}
          className={inputClass}
        />
        <Input
          placeholder="Gestor"
          defaultValue={filtros.nomeGestor ?? ''}
          onBlur={(e) => setParam('nomeGestor', e.target.value)}
          className={inputClass}
        />
        <Input
          type="date"
          defaultValue={filtros.dataInicio ?? ''}
          onChange={(e) => setParam('dataInicio', e.target.value)}
          className={inputClass}
        />
        <Input
          type="date"
          defaultValue={filtros.dataFim ?? ''}
          onChange={(e) => setParam('dataFim', e.target.value)}
          className={inputClass}
        />
        <select
          className={selectClass}
          defaultValue={filtros.classificacao ?? ''}
          onChange={(e) => setParam('classificacao', e.target.value)}
        >
          <option value="">Classificação: todas</option>
          <option>EXCELENTE</option>
          <option>BOM</option>
          <option>REGULAR</option>
          <option>PRECISA MELHORAR</option>
        </select>
        <select
          className={selectClass}
          defaultValue={filtros.evolucao ?? ''}
          onChange={(e) => setParam('evolucao', e.target.value)}
        >
          <option value="">Evolução: todas</option>
          <option value="positiva">Positiva</option>
          <option value="negativa">Negativa</option>
          <option value="estavel">Estável</option>
          <option value="primeira">Primeira</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="conecta-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Avaliado</th>
              <th>Gestor</th>
              <th>Filial</th>
              <th>Pontuação</th>
              <th>Classificação</th>
              <th>Evolução</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => {
              const ant = r.anterior !== null ? Number(r.anterior) : null;
              const atual = Number(r.pontuacao_final ?? 0);
              const ev = calcularEvolucao(atual, ant);
              const delta = ant !== null ? Number((atual - ant).toFixed(2)) : undefined;
              return (
                <tr key={r.id}>
                  <td className="text-conecta-muted text-xs">{r.data_avaliacao}</td>
                  <td>
                    <span className="font-display font-semibold text-conecta-primary">
                      {r.avaliado_nome}
                    </span>
                  </td>
                  <td className="text-conecta-muted">{r.gestor_nome}</td>
                  <td className="text-conecta-muted">{r.filial_nome}</td>
                  <td>
                    <span className="font-display font-bold text-conecta-accent tabular-nums">
                      {atual.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <ClassificacaoBadge
                      value={(r.classificacao ?? 'PRECISA MELHORAR') as Classificacao}
                    />
                  </td>
                  <td>
                    <EvolucaoIndicator tipo={ev} delta={delta} />
                  </td>
                  <td className="text-right">
                    <Link
                      className="inline-flex items-center gap-1 text-conecta-accent font-display font-semibold text-xs hover:underline"
                      href={`/avaliacao/${r.id}`}
                    >
                      Ver <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lista.length === 0 && (
        <p className="py-8 text-center text-sm text-conecta-muted">
          Nenhuma avaliação encontrada.
        </p>
      )}
    </ConectaCard>
  );
}

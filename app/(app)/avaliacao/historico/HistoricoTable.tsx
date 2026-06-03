'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="grid gap-2 md:grid-cols-4">
          <Input
            placeholder="Nome do avaliado"
            defaultValue={filtros.nomeAvaliado ?? ''}
            onBlur={(e) => setParam('nomeAvaliado', e.target.value)}
          />
          <Input
            placeholder="Nome do gestor"
            defaultValue={filtros.nomeGestor ?? ''}
            onBlur={(e) => setParam('nomeGestor', e.target.value)}
          />
          <Input
            type="date"
            defaultValue={filtros.dataInicio ?? ''}
            onChange={(e) => setParam('dataInicio', e.target.value)}
          />
          <Input
            type="date"
            defaultValue={filtros.dataFim ?? ''}
            onChange={(e) => setParam('dataFim', e.target.value)}
          />
          <select
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
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
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
            defaultValue={filtros.evolucao ?? ''}
            onChange={(e) => setParam('evolucao', e.target.value)}
          >
            <option value="">Evolução: todas</option>
            <option value="positiva">Positiva</option>
            <option value="negativa">Negativa</option>
            <option value="estavel">Estável</option>
            <option value="primeira">Primeira</option>
          </select>
          <Button variant="outline" onClick={() => router.push('/avaliacao/historico')}>
            Limpar
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-perlog-slate">
                <th className="pb-2">Data</th>
                <th className="pb-2">Avaliado</th>
                <th className="pb-2">Gestor</th>
                <th className="pb-2">Filial</th>
                <th className="pb-2">Pontuação</th>
                <th className="pb-2">Classificação</th>
                <th className="pb-2">Evolução</th>
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
                  <tr key={r.id} className="border-t">
                    <td className="py-1 pr-2">{r.data_avaliacao}</td>
                    <td className="py-1 pr-2">{r.avaliado_nome}</td>
                    <td className="py-1 pr-2">{r.gestor_nome}</td>
                    <td className="py-1 pr-2">{r.filial_nome}</td>
                    <td className="py-1 pr-2 font-semibold">{atual.toFixed(2)}</td>
                    <td className="py-1 pr-2">
                      <ClassificacaoBadge
                        value={(r.classificacao ?? 'PRECISA MELHORAR') as Classificacao}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <EvolucaoIndicator tipo={ev} delta={delta} />
                    </td>
                    <td className="py-1">
                      <Link
                        className="text-perlog-orange underline"
                        href={`/avaliacao/${r.id}`}
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <p className="py-6 text-center text-sm text-perlog-slate">
            Nenhuma avaliação encontrada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

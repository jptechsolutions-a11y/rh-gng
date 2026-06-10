import type { ResumoFilialInconsist } from '@/lib/indicadores/inconsist-queries';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Building2 } from 'lucide-react';

export function TabelaResumoFilialInconsist({ rows }: { rows: ResumoFilialInconsist[] }) {
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader label="Resumo por filial" icon={Building2} />
      </div>
      <div className="overflow-x-auto">
        <table className="conecta-table">
          <thead>
            <tr>
              <th>Filial</th>
              <th className="text-right">Colaboradores</th>
              <th className="text-right">Inconsistências</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.filialId ?? r.filialCodigo ?? Math.random()}>
                <td>
                  <div className="flex items-center gap-2">
                    {r.filialCodigo && (
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary">
                        {r.filialCodigo}
                      </span>
                    )}
                    <span className="font-display font-semibold text-conecta-primary">
                      {r.filialNome ?? '—'}
                    </span>
                  </div>
                </td>
                <td className="text-right text-conecta-muted tabular-nums">
                  {r.qtdColaboradores.toLocaleString('pt-BR')}
                </td>
                <td className="text-right">
                  <span className="font-display font-bold text-conecta-accent tabular-nums">
                    {r.qtdInconsist.toLocaleString('pt-BR')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-conecta-muted">Sem dados.</p>
      )}
    </ConectaCard>
  );
}

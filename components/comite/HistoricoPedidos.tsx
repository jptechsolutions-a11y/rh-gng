import { History } from 'lucide-react';
import { nomeMes, type PedidoAnterior } from '@/lib/comite/tipos';

const dataBr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;

/** Pedidos de meses anteriores que o comitê não aprovou: quando foi pedido, o motivo do pedido e o motivo da não aprovação. */
export function HistoricoPedidos({ historico, titulo = 'Já solicitado antes e não aprovado' }: { historico: PedidoAnterior[]; titulo?: string }) {
  if (historico.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <div className="flex items-center gap-1.5 font-display text-[10px] uppercase tracking-[0.2em] font-semibold text-amber-800">
        <History className="h-3.5 w-3.5" /> {titulo}
      </div>
      <ul className="mt-2 space-y-3">
        {historico.map((p) => {
          const solicitado = dataBr(p.solicitadoEm);
          const decidido = dataBr(p.decididoEm);
          return (
            <li key={p.id} className="border-l-2 border-amber-400 pl-3">
              <div className="font-semibold">
                Solicitado {solicitado ? `em ${solicitado} ` : ''}para o comitê de {nomeMes(p.mes)}
              </div>
              <div className="mt-0.5">
                <span className="font-semibold">Motivo da solicitação:</span>{' '}
                <span className="whitespace-pre-wrap">{p.justificativa}</span>
              </div>
              <div className="mt-0.5">
                <span className="font-semibold text-rose-800">
                  Não aprovado{decidido ? ` em ${decidido}` : ''}{p.decididoPor ? ` por ${p.decididoPor}` : ''}.
                </span>{' '}
                <span className="font-semibold">Motivo:</span>{' '}
                <span className="whitespace-pre-wrap">{p.motivoReprovacao}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

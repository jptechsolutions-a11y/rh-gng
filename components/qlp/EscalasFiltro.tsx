'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Clock, X } from 'lucide-react';
import type { FilialOpt } from '@/db/queries/qlp-escalas';
import { TURNOS } from '@/lib/qlp/turno';

const selectClass =
  'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';
const labelClass =
  'flex items-center gap-2 text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-conecta-muted';

/**
 * Filtros da tela de escalas (filial e turno). Os valores vão na URL
 * (?filial=<id>&turno=<manha|tarde|noturno|sem>), então dá para compartilhar o link.
 */
export function EscalasFiltro({
  filiais,
  filialId,
  turno,
}: {
  filiais: FilialOpt[];
  filialId: string | null;
  /** '' = todos; 'manha' | 'tarde' | 'noturno' | 'sem'. */
  turno: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function aplicar(novo: { filial?: string; turno?: string }) {
    const filial = novo.filial ?? filialId ?? '';
    const t = novo.turno ?? turno;
    const qs = new URLSearchParams();
    if (filial) qs.set('filial', filial);
    if (t) qs.set('turno', t);
    const texto = qs.toString();
    start(() => router.push(texto ? `${pathname}?${texto}` : pathname));
  }

  const temFiltro = Boolean(filialId || turno);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex items-center gap-3">
        <label htmlFor="filtro-filial" className={labelClass}>
          <Building2 className="h-3.5 w-3.5 text-conecta-accent" />
          Filial
        </label>
        <select
          id="filtro-filial"
          className={`${selectClass} min-w-[240px]`}
          value={filialId ?? ''}
          onChange={(e) => aplicar({ filial: e.target.value })}
          disabled={pending}
        >
          <option value="">Todas as filiais</option>
          {filiais.map((f) => (
            <option key={f.id} value={f.id}>
              {f.codigo} · {f.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="filtro-turno" className={labelClass}>
          <Clock className="h-3.5 w-3.5 text-conecta-accent" />
          Turno
        </label>
        <select
          id="filtro-turno"
          className={`${selectClass} min-w-[220px]`}
          value={turno}
          onChange={(e) => aplicar({ turno: e.target.value })}
          disabled={pending}
        >
          <option value="">Todos os turnos</option>
          {TURNOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo} ({t.faixa})
            </option>
          ))}
          <option value="sem">Sem horário</option>
        </select>
      </div>

      {temFiltro && (
        <button
          type="button"
          onClick={() => aplicar({ filial: '', turno: '' })}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-lg border border-conecta-primary/15 px-2.5 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-conecta-muted hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" /> Limpar
        </button>
      )}
      {pending && <span className="text-[12px] text-conecta-muted">Atualizando…</span>}
    </div>
  );
}

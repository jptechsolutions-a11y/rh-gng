'use client';

import { useState, useTransition } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { removerLider } from '@/actions/qlp/lideres';
import { EditarLiderModal } from './EditarLiderModal';
import { TransferirTimeModal, type LiderDestino } from './TransferirTimeModal';

interface FilialOpt {
  id: string;
  codigo: string;
  nome: string;
  regional: string | null;
}

export function LiderActions({
  liderId,
  nome,
  funcao,
  tier,
  nivel,
  escopoNacional,
  filiaisEscopo,
  colaboradorFilialId,
  filiais,
  diretos,
  lideresDestino,
}: {
  liderId: string;
  nome: string;
  funcao: string;
  tier: string;
  nivel: string | null;
  escopoNacional: boolean;
  filiaisEscopo: string[];
  colaboradorFilialId: string | null;
  filiais: FilialOpt[];
  diretos: number;
  lideresDestino: LiderDestino[];
}) {
  const [pending, start] = useTransition();
  const [editar, setEditar] = useState(false);
  const [transferir, setTransferir] = useState(false);

  function remover() {
    if (!confirm(`Remover ${nome} da posição de líder? Os vínculos do time dele serão quebrados.`)) return;
    start(async () => {
      await removerLider(liderId);
      location.reload();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {diretos > 0 && (
        <button
          onClick={() => setTransferir(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-conecta-accent/10 text-conecta-accent hover:bg-conecta-accent/20 px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] transition"
          title="Transferir todo o time para outro líder"
        >
          <ArrowRightLeft className="h-3 w-3" />
          Transferir time
        </button>
      )}
      <button
        onClick={() => setEditar(true)}
        className="rounded-lg bg-conecta-primary/5 text-conecta-primary hover:bg-conecta-primary/10 px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] transition"
      >
        Editar
      </button>
      <button
        onClick={remover}
        disabled={pending}
        className="rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] disabled:opacity-50 transition"
      >
        {pending ? '…' : 'Remover'}
      </button>
      {editar && (
        <EditarLiderModal
          liderId={liderId}
          nome={nome}
          funcao={funcao}
          tier={tier}
          nivel={nivel}
          escopoNacionalInicial={escopoNacional}
          filiaisEscopoInicial={filiaisEscopo}
          colaboradorFilialId={colaboradorFilialId}
          filiais={filiais}
          onClose={() => setEditar(false)}
        />
      )}
      {transferir && (
        <TransferirTimeModal
          liderOrigem={{ id: liderId, nome, funcao, tier }}
          diretos={diretos}
          lideresDestino={lideresDestino}
          onClose={() => setTransferir(false)}
        />
      )}
    </div>
  );
}

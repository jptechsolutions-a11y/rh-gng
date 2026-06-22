'use client';

import { useState, useTransition } from 'react';
import { removerLider } from '@/actions/qlp/lideres';
import { EditarLiderModal } from './EditarLiderModal';

interface FilialOpt {
  id: string;
  codigo: string;
  nome: string;
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
}) {
  const [pending, start] = useTransition();
  const [editar, setEditar] = useState(false);

  function remover() {
    if (!confirm(`Remover ${nome} da posição de líder? Os vínculos do time dele serão quebrados.`)) return;
    start(async () => {
      await removerLider(liderId);
      location.reload();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => setEditar(true)}
        className="rounded-lg bg-conecta-primary/5 text-conecta-primary hover:bg-conecta-primary/10 px-3 py-1.5 text-xs font-semibold transition"
      >
        Editar
      </button>
      <button
        onClick={remover}
        disabled={pending}
        className="rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 transition"
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
    </div>
  );
}

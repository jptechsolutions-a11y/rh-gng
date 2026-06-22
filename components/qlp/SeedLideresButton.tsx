'use client';

import { useState, useTransition } from 'react';
import { seedLideresInicial } from '@/actions/qlp/lideres';

export function SeedLideresButton() {
  const [pending, start] = useTransition();
  const [resultado, setResultado] = useState<{ criados: number; jaExistiam: number } | null>(null);

  function onClick() {
    if (
      !confirm(
        'Pré-preencher líderes a partir do quadro?\n\n' +
          'Cria um registro de líder para cada colaborador classificado como ' +
          'gerente / subgerente / coord. Não recria os já existentes — pode rodar várias vezes.\n\n' +
          'Defaults aplicados:\n' +
          '· nacional → escopo nacional (todas as filiais)\n' +
          '· regional/subgerente → escopo só com a filial atual do colaborador\n\n' +
          'Você pode editar o escopo de cada um depois.',
      )
    )
      return;
    start(async () => {
      try {
        const r = await seedLideresInicial();
        setResultado(r);
        if (r.criados > 0) location.reload();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'erro');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded-lg bg-conecta-primary text-white px-4 py-2 text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
      >
        {pending ? 'Pré-preenchendo…' : '⚡ Pré-preencher do quadro'}
      </button>
      {resultado && resultado.criados === 0 && (
        <span className="text-xs text-conecta-muted">
          Nada a criar ({resultado.jaExistiam} já existiam).
        </span>
      )}
    </div>
  );
}

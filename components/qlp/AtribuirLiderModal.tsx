'use client';

import { useEffect, useState, useTransition } from 'react';
import { atribuirVinculo, removerVinculo } from '@/actions/qlp/vinculos';

interface ColaboradorAlvo {
  id: string;
  nome: string;
  funcao: string;
  lider_id: string | null;
}

interface LiderOpt {
  id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  nome: string;
  funcao: string;
  codfilial: number;
}

export function AtribuirLiderModal({
  colaborador,
  onClose,
}: {
  colaborador: ColaboradorAlvo;
  onClose: () => void;
}) {
  const [lideres, setLideres] = useState<LiderOpt[]>([]);
  const [liderId, setLiderId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/qlp/lideres-elegiveis?colaboradorId=${colaborador.id}`)
      .then((r) => r.json())
      .then((data) => {
        setLideres(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [colaborador.id]);

  function submit() {
    setErro(null);
    if (!liderId) {
      setErro('escolha um líder');
      return;
    }
    if (!motivo.trim()) {
      setErro('motivo é obrigatório');
      return;
    }
    start(async () => {
      try {
        await atribuirVinculo({ colaboradorId: colaborador.id, liderId, motivo });
        onClose();
        location.reload();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao salvar');
      }
    });
  }

  function remover() {
    setErro(null);
    if (!motivo.trim()) {
      setErro('motivo é obrigatório para remover');
      return;
    }
    if (!confirm('Remover o vínculo atual? O colaborador ficará sem líder.')) return;
    start(async () => {
      try {
        await removerVinculo(colaborador.id, motivo);
        onClose();
        location.reload();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao remover');
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3 shadow-xl">
        <h2 className="text-lg font-semibold">
          {colaborador.lider_id ? 'Mover líder' : 'Atribuir líder'}
        </h2>
        <p className="text-sm text-slate-600">
          <strong>{colaborador.nome}</strong> <span className="text-slate-500">· {colaborador.funcao}</span>
        </p>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Líder</label>
          {loading ? (
            <p className="text-sm text-slate-500">Carregando líderes elegíveis…</p>
          ) : lideres.length === 0 ? (
            <p className="text-sm text-rose-600">
              Nenhum líder elegível para esta filial/tier. Verifique se há líderes cadastrados com escopo cobrindo esta filial.
            </p>
          ) : (
            <select
              className="w-full border border-slate-300 rounded-lg p-2 text-sm"
              value={liderId}
              onChange={(e) => setLiderId(e.target.value)}
            >
              <option value="">— selecionar —</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  [{l.tier}] {l.nome} · {l.funcao}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Motivo (obrigatório)</label>
          <textarea
            className="w-full border border-slate-300 rounded-lg p-2 text-sm"
            placeholder="ex. distribuição inicial, troca de setor, redistribuição de carga…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        </div>

        {erro && <div className="text-red-600 text-sm">{erro}</div>}

        <div className="flex justify-between items-center gap-2 pt-2">
          {colaborador.lider_id && (
            <button
              onClick={remover}
              disabled={pending}
              className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm disabled:opacity-50"
            >
              Remover vínculo
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-3 py-2 text-sm text-slate-700">
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={pending || !liderId}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
            >
              {pending ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

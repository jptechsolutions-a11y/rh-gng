'use client';

import { useState, useTransition } from 'react';
import { Trash2, Pencil, Plus, X, Check } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import {
  criarStatusVaga,
  editarStatusVaga,
  alternarAtivoStatusVaga,
  excluirStatusVaga,
} from '@/actions/vagas/status';
import type { VagaStatus } from '@/db/schema';

export function StatusCatalogoManager({ statusInicial }: { statusInicial: VagaStatus[] }) {
  const [lista, setLista] = useState(statusInicial);
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function refrescarLocal(fn: (l: VagaStatus[]) => VagaStatus[]) {
    setLista((l) => fn(l));
  }

  function onCriar() {
    const nome = novoNome.trim();
    if (!nome) return;
    setErro(null);
    start(async () => {
      try {
        await criarStatusVaga(nome);
        setNovoNome('');
        refrescarLocal((l) => [
          ...l,
          { id: crypto.randomUUID(), nome, ordem: l.length, sistema: false, ativo: true, createdAt: new Date() },
        ]);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao criar status');
      }
    });
  }

  function onSalvarEdicao(id: string) {
    const nome = editNome.trim();
    if (!nome) return;
    const ordemAtual = lista.find((s) => s.id === id)?.ordem ?? 0;
    setErro(null);
    start(async () => {
      try {
        await editarStatusVaga(id, nome, ordemAtual);
        refrescarLocal((l) => l.map((s) => (s.id === id ? { ...s, nome } : s)));
        setEditandoId(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao editar status');
      }
    });
  }

  function onAlternarAtivo(id: string, ativo: boolean) {
    setErro(null);
    start(async () => {
      try {
        await alternarAtivoStatusVaga(id, ativo);
        refrescarLocal((l) => l.map((s) => (s.id === id ? { ...s, ativo } : s)));
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao alterar status');
      }
    });
  }

  function onExcluir(id: string) {
    if (!confirm('Excluir este status? Só é possível se nenhuma vaga estiver usando ele.')) return;
    setErro(null);
    start(async () => {
      try {
        await excluirStatusVaga(id);
        refrescarLocal((l) => l.filter((s) => s.id !== id));
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao excluir status');
      }
    });
  }

  return (
    <ConectaCard noPadding>
      <div className="p-5 space-y-4">
        <SectionHeader label="Catálogo de status" />

        {erro && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>
        )}

        <div className="flex gap-2">
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Novo status (ex.: Exames admissionais)"
            className="flex-1 rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !novoNome.trim()}
            onClick={onCriar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-3 py-2 text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Incluir
          </button>
        </div>

        <ul className="divide-y divide-conecta-primary/8">
          {lista
            .slice()
            .sort((a, b) => a.ordem - b.ordem)
            .map((s) => (
              <li key={s.id} className="py-2.5 flex items-center gap-3">
                {editandoId === s.id ? (
                  <>
                    <input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="flex-1 rounded-lg border border-conecta-primary/15 px-2 py-1.5 text-sm"
                    />
                    <button type="button" onClick={() => onSalvarEdicao(s.id)} disabled={pending} className="text-emerald-700">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setEditandoId(null)} className="text-slate-500">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-sm ${s.ativo ? 'text-conecta-text' : 'text-slate-400 line-through'}`}>
                      {s.nome} {s.sistema && <span className="text-[10px] uppercase text-conecta-muted">· sistema</span>}
                    </span>
                    {!s.sistema && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setEditandoId(s.id); setEditNome(s.nome); }}
                          className="text-conecta-primary"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onAlternarAtivo(s.id, !s.ativo)}
                          className="text-[11px] font-display font-semibold uppercase tracking-wide text-conecta-muted hover:text-conecta-primary"
                        >
                          {s.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onExcluir(s.id)}
                          className="text-rose-600"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
        </ul>
      </div>
    </ConectaCard>
  );
}

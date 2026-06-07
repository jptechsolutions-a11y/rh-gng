'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Pencil, X } from 'lucide-react';
import { criarCriterio, atualizarCriterio, removerCriterio } from '@/actions/admin';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Criterio = { id: string; nome: string; escalaMax: number; peso: number; ordem: number; ativo: boolean };

const novo0: Omit<Criterio, 'id'> = { nome: '', escalaMax: 5, peso: 1, ordem: 0, ativo: true };

export function CriteriosClient({ criterios }: { criterios: Criterio[] }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Criterio, 'id'>>(novo0);
  const [novo, setNovo] = useState<Omit<Criterio, 'id'>>({ ...novo0, ordem: criterios.length });
  const [pending, start] = useTransition();

  const adicionar = () => {
    if (!novo.nome.trim()) { toast.error('Informe o nome'); return; }
    start(async () => {
      try {
        await criarCriterio(novo);
        toast.success('Critério criado');
        setNovo({ ...novo0, ordem: criterios.length + 1 });
        router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const iniciarEdicao = (c: Criterio) => {
    setEditId(c.id);
    setDraft({ nome: c.nome, escalaMax: c.escalaMax, peso: c.peso, ordem: c.ordem, ativo: c.ativo });
  };

  const salvar = (id: string) => {
    start(async () => {
      try {
        await atualizarCriterio(id, draft);
        toast.success('Atualizado');
        setEditId(null);
        router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const excluir = async (c: Criterio) => {
    if (!(await confirmar({ titulo: 'Excluir critério', descricao: `Excluir o critério "${c.nome}"?`, perigo: true, confirmLabel: 'Excluir' }))) return;
    start(async () => {
      try {
        await removerCriterio(c.id);
        toast.success('Removido');
        router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  return (
    <div className="space-y-4">
      {/* Novo */}
      <div className="rounded-lg border border-perlog-orange/20 bg-perlog-orange/5 p-3 space-y-2">
        <p className="text-xs font-semibold text-perlog-navy uppercase">Novo critério</p>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <input placeholder="Nome do critério" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            className="h-9 sm:col-span-6 rounded-md border border-slate-200 bg-white text-sm px-3" />
          <input type="number" min={2} max={10} placeholder="Escala" value={novo.escalaMax} onChange={(e) => setNovo({ ...novo, escalaMax: Number(e.target.value) })}
            className="h-9 sm:col-span-2 rounded-md border border-slate-200 bg-white text-sm px-3" title="Escala máx" />
          <input type="number" step={0.1} placeholder="Peso" value={novo.peso} onChange={(e) => setNovo({ ...novo, peso: Number(e.target.value) })}
            className="h-9 sm:col-span-2 rounded-md border border-slate-200 bg-white text-sm px-3" title="Peso" />
          <input type="number" placeholder="Ordem" value={novo.ordem} onChange={(e) => setNovo({ ...novo, ordem: Number(e.target.value) })}
            className="h-9 sm:col-span-1 rounded-md border border-slate-200 bg-white text-sm px-3" title="Ordem" />
          <button onClick={adicionar} disabled={pending}
            className="h-9 sm:col-span-1 inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-perlog-slate">
            <th className="py-2 font-medium">Nome</th>
            <th className="py-2 font-medium w-20 text-center">Escala</th>
            <th className="py-2 font-medium w-20 text-center">Peso</th>
            <th className="py-2 font-medium w-16 text-center">Ordem</th>
            <th className="py-2 font-medium w-20">Status</th>
            <th className="py-2 font-medium text-right w-44">Ações</th>
          </tr>
        </thead>
        <tbody>
          {criterios.map((c) => (
            <tr key={c.id} className="border-b border-slate-50">
              {editId === c.id ? (
                <>
                  <td className="py-1.5 pr-2"><input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} className="h-8 w-full rounded border border-slate-200 px-2 text-sm" /></td>
                  <td className="py-1.5 px-1"><input type="number" min={2} max={10} value={draft.escalaMax} onChange={(e) => setDraft({ ...draft, escalaMax: Number(e.target.value) })} className="h-8 w-full rounded border border-slate-200 px-2 text-sm text-center" /></td>
                  <td className="py-1.5 px-1"><input type="number" step={0.1} value={draft.peso} onChange={(e) => setDraft({ ...draft, peso: Number(e.target.value) })} className="h-8 w-full rounded border border-slate-200 px-2 text-sm text-center" /></td>
                  <td className="py-1.5 px-1"><input type="number" value={draft.ordem} onChange={(e) => setDraft({ ...draft, ordem: Number(e.target.value) })} className="h-8 w-full rounded border border-slate-200 px-2 text-sm text-center" /></td>
                  <td className="py-1.5"><label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={draft.ativo} onChange={(e) => setDraft({ ...draft, ativo: e.target.checked })} />Ativo</label></td>
                  <td className="py-1.5 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => salvar(c.id)} disabled={pending} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-perlog-orange text-white"><Save className="h-3 w-3" />Salvar</button>
                      <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-200"><X className="h-3 w-3" /></button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-2 text-perlog-navy font-medium">{c.nome}</td>
                  <td className="py-2 text-center tabular-nums">0–{c.escalaMax}</td>
                  <td className="py-2 text-center tabular-nums">{c.peso}</td>
                  <td className="py-2 text-center tabular-nums">{c.ordem}</td>
                  <td className="py-2"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{c.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => iniciarEdicao(c)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-200 hover:bg-slate-50"><Pencil className="h-3 w-3" />Editar</button>
                      <button onClick={() => excluir(c)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-200 text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
          {criterios.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-perlog-slate">Nenhum critério.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

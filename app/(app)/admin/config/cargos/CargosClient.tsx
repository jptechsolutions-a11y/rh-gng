'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Pencil, X } from 'lucide-react';
import { criarCargo, atualizarCargo, removerCargo } from '@/actions/admin';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Cargo = { id: string; nome: string; ativo: boolean };

export function CargosClient({ cargos }: { cargos: Cargo[] }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [novo, setNovo] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editAtivo, setEditAtivo] = useState(true);
  const [pending, start] = useTransition();

  const adicionar = () => {
    if (!novo.trim()) return;
    start(async () => {
      try {
        await criarCargo(novo);
        toast.success('Cargo criado');
        setNovo('');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  const iniciarEdicao = (c: Cargo) => { setEditId(c.id); setEditNome(c.nome); setEditAtivo(c.ativo); };
  const cancelarEdicao = () => setEditId(null);

  const salvar = (id: string) => {
    start(async () => {
      try {
        await atualizarCargo(id, editNome, editAtivo);
        toast.success('Atualizado');
        setEditId(null);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  const excluir = async (c: Cargo) => {
    if (!(await confirmar({ titulo: 'Excluir cargo', descricao: `Excluir o cargo "${c.nome}"? Entrevistas existentes mantêm o cargo gravado.`, perigo: true, confirmLabel: 'Excluir' }))) return;
    start(async () => {
      try {
        await removerCargo(c.id);
        toast.success('Cargo removido');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') adicionar(); }}
          placeholder="Novo cargo (ex: ASSIST. ADMINISTRATIVO)"
          className="h-9 flex-1 rounded-md border border-slate-200 bg-white text-sm px-3"
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={pending || !novo.trim()}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-perlog-slate">
            <th className="py-2 font-medium">Nome</th>
            <th className="py-2 font-medium w-24">Status</th>
            <th className="py-2 font-medium text-right w-44">Ações</th>
          </tr>
        </thead>
        <tbody>
          {cargos.map((c) => (
            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
              {editId === c.id ? (
                <>
                  <td className="py-2 pr-2">
                    <input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white text-sm px-2"
                    />
                  </td>
                  <td className="py-2">
                    <label className="inline-flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={editAtivo} onChange={(e) => setEditAtivo(e.target.checked)} />
                      Ativo
                    </label>
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => salvar(c.id)} disabled={pending} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-perlog-orange text-white"><Save className="h-3 w-3" />Salvar</button>
                      <button onClick={cancelarEdicao} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-200"><X className="h-3 w-3" /></button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-2 text-perlog-navy font-medium">{c.nome}</td>
                  <td className="py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
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
          {cargos.length === 0 && (
            <tr><td colSpan={3} className="py-8 text-center text-perlog-slate text-sm">Nenhum cargo cadastrado.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

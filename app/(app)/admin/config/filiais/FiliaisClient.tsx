'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound, Power, X, CheckCircle2 } from 'lucide-react';
import { trocarSenhaFilial, alternarFilialAtiva } from '@/actions/admin';

type Filial = { id: string; codigo: string; nome: string; ativa: boolean };

export function FiliaisClient({ filiais }: { filiais: Filial[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Filial | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confSenha, setConfSenha] = useState('');
  const [pending, start] = useTransition();

  const toggleAtiva = (f: Filial) => {
    if (!confirm(`${f.ativa ? 'Desativar' : 'Ativar'} a filial ${f.codigo} ${f.nome}?`)) return;
    start(async () => {
      try {
        await alternarFilialAtiva(f.id, !f.ativa);
        toast.success(`Filial ${!f.ativa ? 'ativada' : 'desativada'}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  const salvarSenha = () => {
    if (!editando) return;
    if (novaSenha.length < 6) { toast.error('Senha mínima de 6 caracteres'); return; }
    if (novaSenha !== confSenha) { toast.error('Senhas não conferem'); return; }
    start(async () => {
      try {
        await trocarSenhaFilial(editando.codigo, novaSenha);
        toast.success(`Senha da filial ${editando.codigo} atualizada`);
        setEditando(null);
        setNovaSenha('');
        setConfSenha('');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar senha');
      }
    });
  };

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-perlog-slate">
            <th className="px-6 py-3 font-medium">Código</th>
            <th className="px-6 py-3 font-medium">Nome</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {filiais.map((f) => (
            <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50/60">
              <td className="px-6 py-3 font-mono text-perlog-navy font-semibold">{f.codigo}</td>
              <td className="px-6 py-3 text-perlog-navy">{f.nome}</td>
              <td className="px-6 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  f.ativa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {f.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </td>
              <td className="px-6 py-3 text-right">
                <div className="inline-flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setEditando(f); setNovaSenha(''); setConfSenha(''); }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 hover:bg-slate-50 text-perlog-navy"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Trocar senha
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAtiva(f)}
                    disabled={pending}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                      f.ativa
                        ? 'border-red-200 hover:bg-red-50 text-red-700'
                        : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" /> {f.ativa ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditando(null); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200">
            <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-perlog-navy">Trocar senha</h3>
                <p className="text-xs text-perlog-slate">Filial {editando.codigo} · {editando.nome}</p>
              </div>
              <button onClick={() => setEditando(null)} aria-label="Fechar"><X className="h-4 w-4 text-perlog-slate" /></button>
            </header>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-perlog-navy mb-1">Nova senha (mín. 6 caracteres)</label>
                <input
                  type="text"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Nova senha em texto plano"
                  autoFocus
                  className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-perlog-navy mb-1">Confirme a senha</label>
                <input
                  type="text"
                  value={confSenha}
                  onChange={(e) => setConfSenha(e.target.value)}
                  placeholder="Repita a senha"
                  className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3 font-mono"
                />
              </div>
              <p className="text-[11px] text-perlog-slate">A senha é armazenada com hash Argon2. Anote antes de salvar — não é possível recuperá-la depois.</p>
            </div>
            <footer className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
              <button onClick={() => setEditando(null)} className="px-3 py-1.5 rounded-md text-sm border border-slate-200 hover:bg-white">Cancelar</button>
              <button
                onClick={salvarSenha}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> {pending ? 'Salvando…' : 'Salvar nova senha'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

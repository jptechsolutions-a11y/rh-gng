'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound, Power, X, CheckCircle2, Pencil, Trash2, Plus } from 'lucide-react';
import {
  trocarSenhaFilial,
  alternarFilialAtiva,
  criarFilial,
  atualizarFilial,
  removerFilial,
} from '@/actions/admin';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Filial = { id: string; codigo: string; nome: string; ativa: boolean };
type Modo = null | { tipo: 'senha'; filial: Filial } | { tipo: 'editar'; filial: Filial } | { tipo: 'criar' };

export function FiliaisClient({ filiais }: { filiais: Filial[] }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [modo, setModo] = useState<Modo>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confSenha, setConfSenha] = useState('');
  const [pending, start] = useTransition();

  const abrirCriar = () => { setCodigo(''); setNome(''); setNovaSenha(''); setConfSenha(''); setModo({ tipo: 'criar' }); };
  const abrirEditar = (f: Filial) => { setCodigo(f.codigo); setNome(f.nome); setModo({ tipo: 'editar', filial: f }); };
  const abrirSenha = (f: Filial) => { setNovaSenha(''); setConfSenha(''); setModo({ tipo: 'senha', filial: f }); };
  const fechar = () => setModo(null);

  const toggleAtiva = async (f: Filial) => {
    if (!(await confirmar({ titulo: `${f.ativa ? 'Desativar' : 'Ativar'} filial`, descricao: `${f.ativa ? 'Desativar' : 'Ativar'} a filial ${f.codigo} ${f.nome}?`, confirmLabel: f.ativa ? 'Desativar' : 'Ativar' }))) return;
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

  const excluir = async (f: Filial) => {
    if (!(await confirmar({ titulo: 'Excluir filial', descricao: `Excluir definitivamente a filial ${f.codigo} ${f.nome}? Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir' }))) return;
    start(async () => {
      try {
        await removerFilial(f.id);
        toast.success('Filial excluída');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
      }
    });
  };

  const salvarSenha = () => {
    if (modo?.tipo !== 'senha') return;
    if (novaSenha.length < 6) { toast.error('Senha mínima de 6 caracteres'); return; }
    if (novaSenha !== confSenha) { toast.error('Senhas não conferem'); return; }
    start(async () => {
      try {
        await trocarSenhaFilial(modo.filial.codigo, novaSenha);
        toast.success(`Senha da filial ${modo.filial.codigo} atualizada`);
        fechar();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar senha');
      }
    });
  };

  const salvarCriar = () => {
    if (modo?.tipo !== 'criar') return;
    if (novaSenha !== confSenha) { toast.error('Senhas não conferem'); return; }
    start(async () => {
      try {
        await criarFilial({ codigo, nome, senha: novaSenha });
        toast.success(`Filial ${codigo} criada`);
        fechar();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao criar filial');
      }
    });
  };

  const salvarEditar = () => {
    if (modo?.tipo !== 'editar') return;
    start(async () => {
      try {
        await atualizarFilial(modo.filial.id, { codigo, nome });
        toast.success(`Filial ${codigo} atualizada`);
        fechar();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar filial');
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
        <div className="text-sm text-perlog-slate">{filiais.length} filiais cadastradas</div>
        <button
          type="button"
          onClick={abrirCriar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90"
        >
          <Plus className="h-4 w-4" /> Nova filial
        </button>
      </div>

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
                    onClick={() => abrirEditar(f)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 hover:bg-slate-50 text-perlog-navy"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => abrirSenha(f)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 hover:bg-slate-50 text-perlog-navy"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Senha
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAtiva(f)}
                    disabled={pending}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                      f.ativa
                        ? 'border-amber-200 hover:bg-amber-50 text-amber-700'
                        : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" /> {f.ativa ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => excluir(f)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-red-200 hover:bg-red-50 text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200">
            <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-perlog-navy">
                  {modo.tipo === 'senha' && 'Trocar senha'}
                  {modo.tipo === 'editar' && 'Editar filial'}
                  {modo.tipo === 'criar' && 'Nova filial'}
                </h3>
                {modo.tipo === 'senha' && (
                  <p className="text-xs text-perlog-slate">Filial {modo.filial.codigo} · {modo.filial.nome}</p>
                )}
              </div>
              <button onClick={fechar} aria-label="Fechar"><X className="h-4 w-4 text-perlog-slate" /></button>
            </header>

            <div className="px-5 py-4 space-y-3">
              {(modo.tipo === 'editar' || modo.tipo === 'criar') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-perlog-navy mb-1">Código</label>
                    <input
                      type="text"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder="Ex.: 01"
                      autoFocus
                      className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-perlog-navy mb-1">Nome</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome da filial"
                      className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                    />
                  </div>
                </>
              )}

              {(modo.tipo === 'senha' || modo.tipo === 'criar') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-perlog-navy mb-1">
                      {modo.tipo === 'senha' ? 'Nova senha' : 'Senha'} (mín. 6 caracteres)
                    </label>
                    <input
                      type="text"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Senha em texto plano"
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
                </>
              )}
            </div>

            <footer className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
              <button onClick={fechar} className="px-3 py-1.5 rounded-md text-sm border border-slate-200 hover:bg-white">Cancelar</button>
              <button
                onClick={() => {
                  if (modo.tipo === 'senha') salvarSenha();
                  else if (modo.tipo === 'editar') salvarEditar();
                  else salvarCriar();
                }}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> {pending ? 'Salvando…' : 'Salvar'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

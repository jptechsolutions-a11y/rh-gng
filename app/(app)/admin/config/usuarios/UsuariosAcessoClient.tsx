'use client';

import { useMemo, useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Plus, Pencil, KeyRound, Power, PowerOff, Search, X, Globe, Building2, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  criarUsuarioAcesso, editarUsuarioAcesso,
  resetarSenhaUsuarioAcesso, toggleUsuarioAcesso,
  type UsuarioAcessoLinha,
} from '@/actions/usuarios-acesso';

type Filial = { id: string; codigo: string; nome: string; ativa: boolean };

type FormMode = { tipo: 'criar' } | { tipo: 'editar'; usuario: UsuarioAcessoLinha };

const inputClass =
  'border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent';
const selectClass =
  'rounded-lg border border-conecta-primary/15 bg-white px-3 py-2 text-sm font-display text-conecta-primary focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25';

export function UsuariosAcessoClient({
  usuariosInicial, filiais,
}: { usuariosInicial: UsuarioAcessoLinha[]; filiais: Filial[] }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState<FormMode | null>(null);
  const [senhaOpen, setSenhaOpen] = useState<UsuarioAcessoLinha | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return usuariosInicial;
    return usuariosInicial.filter((u) =>
      u.usuario.toLowerCase().includes(q) || u.nome.toLowerCase().includes(q),
    );
  }, [usuariosInicial, busca]);

  const [pendingToggle, startToggle] = useTransition();
  function handleToggle(u: UsuarioAcessoLinha) {
    startToggle(async () => {
      try {
        await toggleUsuarioAcesso({ id: u.id, ativo: !u.ativo });
        toast.success(u.ativo ? 'Usuário desativado' : 'Usuário ativado');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha');
      }
    });
  }

  async function confirmToggle(u: UsuarioAcessoLinha) {
    const ok = await confirmar({
      titulo: u.ativo ? 'Desativar usuário?' : 'Ativar usuário?',
      descricao: u.ativo
        ? `O usuário "${u.usuario}" não conseguirá mais fazer login. Sessões ativas serão derrubadas.`
        : `O usuário "${u.usuario}" poderá fazer login novamente.`,
      confirmLabel: u.ativo ? 'Desativar' : 'Ativar',
    });
    if (ok) handleToggle(u);
  }

  return (
    <div className="space-y-5">
      <ConectaCard noPadding>
        <div className="p-5 flex items-center justify-between flex-wrap gap-3">
          <SectionHeader label={`${usuariosInicial.length} usuários`} icon={ShieldCheck} />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
              <Input
                placeholder="Buscar"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={`${inputClass} pl-9 w-56`}
              />
            </div>
            <Button variant="conecta" size="conecta" onClick={() => setFormOpen({ tipo: 'criar' })}>
              <Plus className="h-4 w-4" />
              Novo usuário
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="conecta-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Nome</th>
                <th>Escopo</th>
                <th>Filiais</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} className={u.ativo ? '' : 'opacity-55'}>
                  <td><span className="font-mono text-[12px] text-conecta-primary/80">{u.usuario}</span></td>
                  <td><span className="font-display font-semibold text-conecta-primary">{u.nome}</span></td>
                  <td>
                    {u.escopo === 'nacional' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-conecta-primary/10 text-conecta-primary font-display font-semibold text-[11px]">
                        <Globe className="h-3 w-3" /> Nacional
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-conecta-accent/10 text-conecta-accent font-display font-semibold text-[11px]">
                        <Building2 className="h-3 w-3" /> Regional
                      </span>
                    )}
                  </td>
                  <td className="text-conecta-muted text-[12px] tabular-nums">
                    {u.escopo === 'nacional' ? 'todas' : `${u.qtdFiliais}`}
                  </td>
                  <td>
                    {u.ativo ? (
                      <span className="text-emerald-700 font-display font-semibold text-[12px]">Ativo</span>
                    ) : (
                      <span className="text-red-700 font-display font-semibold text-[12px]">Inativo</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => setFormOpen({ tipo: 'editar', usuario: u })}
                        className="grid place-items-center h-7 w-7 rounded-md border border-conecta-primary/15 text-conecta-primary hover:bg-conecta-accent/10 hover:border-conecta-accent hover:text-conecta-accent transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Resetar senha"
                        onClick={() => setSenhaOpen(u)}
                        className="grid place-items-center h-7 w-7 rounded-md border border-conecta-primary/15 text-conecta-primary hover:bg-conecta-accent/10 hover:border-conecta-accent hover:text-conecta-accent transition-colors"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title={u.ativo ? 'Desativar' : 'Ativar'}
                        disabled={pendingToggle}
                        onClick={() => confirmToggle(u)}
                        className="grid place-items-center h-7 w-7 rounded-md border border-conecta-primary/15 text-conecta-primary hover:bg-conecta-accent/10 hover:border-conecta-accent hover:text-conecta-accent transition-colors disabled:opacity-50"
                      >
                        {u.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtrados.length === 0 && (
          <p className="py-8 text-center text-sm text-conecta-muted">Nenhum usuário cadastrado.</p>
        )}
      </ConectaCard>

      {formOpen && (
        <FormDialog
          mode={formOpen}
          filiais={filiais}
          onClose={() => setFormOpen(null)}
          onSaved={() => { setFormOpen(null); router.refresh(); }}
        />
      )}

      {senhaOpen && (
        <SenhaDialog
          usuario={senhaOpen}
          onClose={() => setSenhaOpen(null)}
          onSaved={() => { setSenhaOpen(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

function FormDialog({
  mode, filiais, onClose, onSaved,
}: {
  mode: FormMode;
  filiais: Filial[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const inicial = mode.tipo === 'editar' ? mode.usuario : null;
  const [usuario, setUsuario] = useState(inicial?.usuario ?? '');
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [senha, setSenha] = useState('');
  const [escopo, setEscopo] = useState<'lista' | 'nacional'>(inicial?.escopo ?? 'lista');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set(inicial?.filiaisIds ?? []));
  const [pending, start] = useTransition();
  const [buscaFil, setBuscaFil] = useState('');

  const filiaisFiltradas = useMemo(() => {
    const q = buscaFil.trim().toLowerCase();
    if (!q) return filiais;
    return filiais.filter((f) => f.codigo.toLowerCase().includes(q) || f.nome.toLowerCase().includes(q));
  }, [filiais, buscaFil]);

  function toggleFilial(id: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function submit() {
    start(async () => {
      try {
        const filiaisIds = [...selecionadas];
        if (mode.tipo === 'criar') {
          await criarUsuarioAcesso({ usuario, nome, senha, escopo, filiaisIds });
          toast.success('Usuário criado');
        } else {
          await editarUsuarioAcesso({ id: mode.usuario.id, nome, escopo, filiaisIds });
          toast.success('Usuário atualizado');
        }
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao salvar');
      }
    });
  }

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-conecta-primary/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(680px,95vw)] max-h-[92vh] overflow-hidden rounded-xl bg-white border border-conecta-primary/10 flex flex-col"
          style={{ boxShadow: '0 20px 60px -16px rgba(13,43,107,0.45)' }}
        >
          <span aria-hidden className="absolute top-0 left-0 right-0 h-1" style={{ background: '#E8621A' }} />
          <div className="p-6 pt-7 border-b border-conecta-primary/10">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <span className="h-[2px] w-6 bg-conecta-accent" />
                <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
                  Usuário personalizado
                </span>
              </div>
              <Dialog.Close className="text-conecta-muted hover:text-conecta-primary transition-colors" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <Dialog.Title className="font-display text-[20px] font-extrabold text-conecta-primary tracking-tight">
              {mode.tipo === 'criar' ? 'Novo usuário' : `Editar ${mode.usuario.usuario}`}
            </Dialog.Title>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid gap-3 md:grid-cols-2">
              <Campo label="Usuário (login)">
                <Input
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className={inputClass}
                  disabled={mode.tipo === 'editar'}
                  placeholder="ex: maria.silva"
                />
              </Campo>
              <Campo label="Nome completo">
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={inputClass}
                  placeholder="ex: Maria Silva"
                />
              </Campo>
            </div>

            {mode.tipo === 'criar' && (
              <Campo label="Senha inicial">
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className={inputClass}
                  placeholder="mínimo 6 caracteres"
                />
              </Campo>
            )}

            <div>
              <label className="block font-display text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-2">
                Escopo de acesso
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                <label className={`relative cursor-pointer rounded-lg border p-3 flex items-start gap-2 transition-colors ${escopo === 'lista' ? 'border-conecta-accent bg-conecta-accent/5' : 'border-conecta-primary/15 hover:border-conecta-accent/40'}`}>
                  <input
                    type="radio"
                    name="escopo"
                    checked={escopo === 'lista'}
                    onChange={() => setEscopo('lista')}
                    className="mt-1 accent-[#E8621A]"
                  />
                  <div>
                    <div className="font-display font-semibold text-conecta-primary text-sm">Regional</div>
                    <div className="text-[12px] text-conecta-muted leading-snug">Lista de filiais selecionadas abaixo.</div>
                  </div>
                </label>
                <label className={`relative cursor-pointer rounded-lg border p-3 flex items-start gap-2 transition-colors ${escopo === 'nacional' ? 'border-conecta-accent bg-conecta-accent/5' : 'border-conecta-primary/15 hover:border-conecta-accent/40'}`}>
                  <input
                    type="radio"
                    name="escopo"
                    checked={escopo === 'nacional'}
                    onChange={() => setEscopo('nacional')}
                    className="mt-1 accent-[#E8621A]"
                  />
                  <div>
                    <div className="font-display font-semibold text-conecta-primary text-sm">Nacional</div>
                    <div className="text-[12px] text-conecta-muted leading-snug">Todas as filiais (atuais e futuras).</div>
                  </div>
                </label>
              </div>
            </div>

            {escopo === 'lista' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-display text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary">
                    Filiais permitidas <span className="text-conecta-muted">({selecionadas.size}/{filiais.length})</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelecionadas(new Set(filiais.map((f) => f.id)))}
                      className="text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent"
                    >
                      Marcar todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelecionadas(new Set())}
                      className="text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="relative mb-2">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none" />
                  <Input
                    placeholder="Buscar filial por código ou nome"
                    value={buscaFil}
                    onChange={(e) => setBuscaFil(e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <div className="grid gap-1 max-h-72 overflow-y-auto pr-1 border border-conecta-primary/10 rounded-lg p-2">
                  {filiaisFiltradas.map((f) => {
                    const checked = selecionadas.has(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${checked ? 'bg-conecta-accent/10' : 'hover:bg-conecta-primary/5'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFilial(f.id)}
                          className="accent-[#E8621A]"
                        />
                        <span className="font-mono text-[11px] text-conecta-primary/80 w-12">{f.codigo}</span>
                        <span className="text-[13px] text-conecta-primary truncate">{f.nome}</span>
                        {!f.ativa && (
                          <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-red-700">inativa</span>
                        )}
                      </label>
                    );
                  })}
                  {filiaisFiltradas.length === 0 && (
                    <p className="py-4 text-center text-sm text-conecta-muted">Nenhuma filial encontrada.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-conecta-primary/10 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="conecta-outline">Cancelar</Button>
            </Dialog.Close>
            <Button variant="conecta" onClick={submit} disabled={pending}>
              {pending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SenhaDialog({
  usuario, onClose, onSaved,
}: { usuario: UsuarioAcessoLinha; onClose: () => void; onSaved: () => void }) {
  const [senha, setSenha] = useState('');
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      try {
        await resetarSenhaUsuarioAcesso({ id: usuario.id, senha });
        toast.success('Senha redefinida');
        onSaved();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha');
      }
    });
  }

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-conecta-primary/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(440px,95vw)] overflow-hidden rounded-xl bg-white border border-conecta-primary/10"
          style={{ boxShadow: '0 20px 60px -16px rgba(13,43,107,0.45)' }}
        >
          <span aria-hidden className="absolute top-0 left-0 right-0 h-1" style={{ background: '#E8621A' }} />
          <div className="p-6 pt-7">
            <Dialog.Title className="font-display text-[18px] font-extrabold text-conecta-primary tracking-tight">
              Resetar senha de {usuario.usuario}
            </Dialog.Title>
            <Dialog.Description className="text-[12px] text-conecta-muted mt-1">
              Sessões ativas serão derrubadas após a troca.
            </Dialog.Description>
            <div className="mt-4">
              <label className="block font-display text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1.5">
                Nova senha
              </label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={inputClass}
                placeholder="mínimo 6 caracteres"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="conecta-outline">Cancelar</Button>
              </Dialog.Close>
              <Button variant="conecta" onClick={submit} disabled={pending || senha.length < 6}>
                {pending ? 'Salvando…' : 'Resetar'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-display text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

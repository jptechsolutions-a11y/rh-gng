'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, UsersRound } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { salvarResponsaveisIc } from '@/actions/ic/responsaveis';
import type { IcResponsavelInput } from '@/lib/ic/tipos';

interface Item extends IcResponsavelInput { filiaisTxt: string }

export function IcResponsaveisEditor({ inicial }: { inicial: IcResponsavelInput[] }) {
  const router = useRouter();
  const [itens, setItens] = useState<Item[]>(inicial.map((r) => ({ ...r, filiaisTxt: r.filiais.join(', ') })));
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  const set = (i: number, p: Partial<Item>) => { setOk(false); setItens((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x))); };

  function salvar() {
    setErro(null); setOk(false);
    start(async () => {
      try {
        await salvarResponsaveisIc(
          itens.map((x) => ({
            id: x.id, nome: x.nome, cor: x.cor, imagem: x.imagem,
            filiais: x.filiaisTxt.split(/[,;\s]+/).map((f) => f.trim()).filter(Boolean),
          })),
        );
        setOk(true);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao salvar');
      }
    });
  }

  const inp = 'rounded-lg border border-conecta-primary/15 px-3 py-1.5 text-sm w-full';

  return (
    <div className="space-y-4 max-w-4xl">
      <ConectaCard>
        <SectionHeader label="Responsáveis da corrida" icon={UsersRound} />
        <p className="mt-3 text-sm text-conecta-muted">
          Cada responsável (ou grupo) é um &ldquo;cavalo&rdquo;. Informe as filiais separadas por vírgula. A imagem é opcional: coloque o arquivo
          na pasta <code className="font-mono text-xs">public/ic/personagens/</code> e informe o caminho (ex.: <code className="font-mono text-xs">/ic/personagens/amanda.png</code>).
        </p>
      </ConectaCard>

      {itens.map((r, i) => (
        <ConectaCard key={r.id ?? `novo-${i}`}>
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto_auto] items-end">
            <label className="block"><span className="text-[10px] font-display uppercase tracking-wide text-conecta-muted font-semibold">Nome / grupo</span>
              <input className={inp} value={r.nome} onChange={(e) => set(i, { nome: e.target.value })} /></label>
            <label className="block"><span className="text-[10px] font-display uppercase tracking-wide text-conecta-muted font-semibold">Filiais</span>
              <input className={inp} value={r.filiaisTxt} onChange={(e) => set(i, { filiaisTxt: e.target.value })} placeholder="264, 773, 783" /></label>
            <label className="block"><span className="text-[10px] font-display uppercase tracking-wide text-conecta-muted font-semibold">Imagem (opcional)</span>
              <input className={inp} value={r.imagem ?? ''} onChange={(e) => set(i, { imagem: e.target.value || null })} placeholder="/ic/personagens/nome.png" /></label>
            <label className="block"><span className="text-[10px] font-display uppercase tracking-wide text-conecta-muted font-semibold">Cor</span>
              <input type="color" className="h-9 w-14 rounded-lg border border-conecta-primary/15 bg-white" value={r.cor} onChange={(e) => set(i, { cor: e.target.value })} /></label>
            <button type="button" onClick={() => { setOk(false); setItens((l) => l.filter((_, k) => k !== i)); }}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
          </div>
        </ConectaCard>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setItens((l) => [...l, { nome: '', cor: '#0D2B6B', imagem: null, filiais: [], filiaisTxt: '' }])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-conecta-accent/50 text-conecta-accent px-4 py-2 text-[11px] font-display font-semibold uppercase tracking-[0.12em] hover:bg-conecta-accent/5">
          <Plus className="h-4 w-4" /> Adicionar responsável
        </button>
        <span className="flex-1" />
        {ok && <span className="text-sm text-emerald-700 font-semibold">Salvo!</span>}
        <button type="button" disabled={pending} onClick={salvar}
          className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-accent text-white px-5 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-60">
          <Save className="h-4 w-4" /> {pending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      {erro && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}
    </div>
  );
}

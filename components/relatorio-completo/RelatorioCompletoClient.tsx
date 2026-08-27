'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileBarChart, Loader2 } from 'lucide-react';
import { ConectaCard } from '@/components/ui/conecta-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type Filial = { id: string; codigo: string; nome: string };

export function RelatorioCompletoClient({ filiais }: { filiais: Filial[] }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(filiais.map((f) => f.id)));
  const [gerando, setGerando] = useState(false);

  const toggle = (id: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const todas = sel.size === filiais.length && filiais.length > 0;
  const toggleTodas = () => setSel(todas ? new Set() : new Set(filiais.map((f) => f.id)));

  const gerar = async () => {
    if (sel.size < 2) {
      toast.error('Selecione ao menos 2 CDs para comparar');
      return;
    }
    setGerando(true);
    try {
      const res = await fetch('/api/relatorio-completo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filialIds: [...sel] }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Falha (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') ?? '';
      const nome = /filename="([^"]+)"/.exec(cd)?.[1] ?? 'Relatorio_Consolidado_Indicadores.pptx';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório consolidado gerado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar');
    } finally {
      setGerando(false);
    }
  };

  return (
    <ConectaCard>
      <div className="flex items-center gap-2">
        <span className="h-[2px] w-6 bg-conecta-accent" />
        <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
          Apresentação
        </span>
      </div>
      <h2 className="font-display text-[22px] font-extrabold text-conecta-primary tracking-tight mt-1.5">
        Relatório consolidado de indicadores
      </h2>
      <p className="text-[13px] text-conecta-muted mt-1">
        Um PowerPoint consolidado comparando os CDs selecionados, com tabela geral
        e um ranking por indicador (Banco de Horas, Inconsistências, Cursos,
        Feriados, Vagas). Selecione ao menos 2 CDs.
      </p>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={toggleTodas}
          className="text-[13px] font-medium text-conecta-accent"
        >
          {todas ? 'Limpar seleção' : 'Selecionar todas'}
        </button>
        <span className="text-[12px] text-conecta-muted">
          {sel.size} de {filiais.length}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filiais.map((f) => {
          const on = sel.has(f.id);
          return (
            <label
              key={f.id}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] cursor-pointer transition-colors',
                on
                  ? 'border-conecta-accent bg-conecta-accent/5'
                  : 'border-conecta-primary/15',
              )}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(f.id)}
                className="accent-conecta-accent"
              />
              <span className="font-medium text-conecta-primary">{f.codigo}</span>
              <span className="text-conecta-muted truncate">{f.nome}</span>
            </label>
          );
        })}
      </div>

      <Button onClick={gerar} disabled={gerando} className="mt-5">
        {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4" />}
        {gerando ? 'Gerando relatório…' : 'Gerar relatório consolidado'}
      </Button>
    </ConectaCard>
  );
}

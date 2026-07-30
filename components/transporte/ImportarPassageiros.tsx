'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Upload, X, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  previewImportPassageiros, aplicarImportPassageiros,
  type PreviewImportPassageiros,
} from '@/actions/transporte-importar';

export function ImportarPassageiros({
  filialId,
  onImported,
}: {
  filialId: string;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewImportPassageiros | null>(null);
  const [pending, start] = useTransition();

  const reset = () => {
    setFile(null);
    setPreview(null);
  };

  const onPreview = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('arquivo', file);
    start(async () => {
      try {
        const p = await previewImportPassageiros(fd, filialId);
        setPreview(p);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao processar planilha');
      }
    });
  };

  const onApply = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('arquivo', file);
    start(async () => {
      try {
        const r = await aplicarImportPassageiros(fd, filialId);
        toast.success(
          `Importado: ${r.novos} novos, ${r.atualizados} atualizados, ${r.mantidos} mantidos, ${r.desligados} desligados`,
        );
        reset();
        setOpen(false);
        onImported();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao aplicar importação');
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium border border-conecta-primary/20 text-conecta-primary hover:bg-slate-50"
      >
        <Upload className="h-4 w-4" /> Importar planilha
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-conecta-primary/8 p-4 space-y-4"
      style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-conecta-primary flex items-center gap-1.5">
          <Upload className="h-4 w-4 text-conecta-accent" /> Importar lista de passageiros
        </h3>
        <button type="button" onClick={() => { setOpen(false); reset(); }}
          className="text-conecta-muted hover:text-conecta-primary">
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-conecta-muted">
        Envie uma planilha (XLS/XLSX) com colunas <strong>Chapa</strong>, <strong>Nome</strong> e <strong>Cidade</strong>.
        Passageiros já alocados a uma rota continuam alocados. Novos entram como &ldquo;sem rota&rdquo;
        e quem sair da planilha é marcado como inativo.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }}
          className="block text-xs text-conecta-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-conecta-primary file:text-white file:text-xs file:font-medium file:cursor-pointer"
        />
        <button
          type="button"
          disabled={!file || pending}
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-conecta-primary/20 text-conecta-primary hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {pending && !preview ? 'Processando...' : 'Pré-visualizar'}
        </button>
        {preview && (
          <button
            type="button"
            disabled={pending}
            onClick={onApply}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-conecta-accent text-white hover:bg-conecta-accent/90 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> {pending ? 'Aplicando...' : 'Aplicar importação'}
          </button>
        )}
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Total na planilha" value={preview.totalLinhas} />
            <Stat label="Novos" value={preview.novos} tone="emerald" />
            <Stat label="Atualizados" value={preview.atualizados} tone="amber" />
            <Stat label="Desligados" value={preview.desligados} tone="rose" />
          </div>

          {preview.novos > 0 && (
            <Detalhes titulo={`Novos (${preview.novos})`}>
              {preview.amostras.novos.map((n) => (
                <div key={n.chapa} className="text-xs py-0.5">
                  <span className="font-mono text-conecta-muted">{n.chapa}</span> · {n.nome}
                  {n.cidade ? ` · ${n.cidade}` : ''}
                </div>
              ))}
            </Detalhes>
          )}

          {preview.desligados > 0 && (
            <Detalhes titulo={`Desligados (${preview.desligados})`} icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}>
              {preview.amostras.desligados.map((d) => (
                <div key={d.chapa ?? d.nome} className="text-xs py-0.5">
                  <span className="font-mono text-conecta-muted">{d.chapa ?? '—'}</span> · {d.nome}
                </div>
              ))}
            </Detalhes>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'emerald' | 'amber' | 'rose' }) {
  const toneClass: Record<typeof tone, string> = {
    slate: 'bg-slate-50 text-conecta-primary border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
  };
  return (
    <div className={`rounded-lg border p-2 ${toneClass[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide font-medium">{label}</div>
      <div className="font-display text-lg font-extrabold">{value}</div>
    </div>
  );
}

function Detalhes({ titulo, children, icon }: { titulo: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <details className="rounded-lg border border-slate-200 p-2">
      <summary className="cursor-pointer text-xs font-semibold text-conecta-primary flex items-center gap-1.5">
        {icon}{titulo}
      </summary>
      <div className="mt-2 max-h-40 overflow-y-auto">{children}</div>
    </details>
  );
}

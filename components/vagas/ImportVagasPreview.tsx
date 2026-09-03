'use client';

import { useState, useTransition } from 'react';
import { previewImportVagasAction, aplicarImportVagasAction } from '@/actions/vagas/importar';
import type { ImportSummaryVagas } from '@/lib/vagas/import-sync';

export function ImportVagasPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportSummaryVagas | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function onPreview() {
    if (!file) return;
    setErro(null);
    setSucesso(null);
    const fd = new FormData();
    fd.append('arquivo', file);
    start(async () => {
      try {
        const p = await previewImportVagasAction(fd);
        setPreview(p);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao processar');
      }
    });
  }

  async function onApply() {
    if (!file) return;
    if (!confirm('Aplicar este import? Vagas "Em aberto" serão criadas/fechadas automaticamente conforme a planilha.')) return;
    setErro(null);
    const fd = new FormData();
    fd.append('arquivo', file);
    start(async () => {
      try {
        const r = await aplicarImportVagasAction(fd);
        setSucesso(
          `Import aplicado: ${r.vagasCriadas} vagas criadas, ${r.vagasFechadas} fechadas automaticamente, ${r.linhasZeradas} combinações zeradas.`,
        );
        setPreview(null);
        setFile(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao aplicar');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-conecta-primary/10 p-4">
        <label className="block text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-2">
          Planilha do Quadro de Vagas
        </label>
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setSucesso(null);
          }}
          className="block w-full text-sm text-conecta-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-conecta-primary file:text-white hover:file:brightness-110 file:font-display file:font-semibold file:cursor-pointer"
        />
        <div className="flex gap-2 mt-3">
          <button
            disabled={!file || pending}
            onClick={onPreview}
            className="rounded-lg bg-conecta-primary text-white px-4 py-2 text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
          >
            {pending && !preview ? 'Processando…' : 'Pré-visualizar'}
          </button>
          {preview && (
            <button
              disabled={pending}
              onClick={onApply}
              className="rounded-lg bg-conecta-accent text-white px-4 py-2 text-sm font-display font-semibold hover:brightness-110 disabled:opacity-50 transition"
            >
              {pending ? 'Aplicando…' : 'Aplicar import'}
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>
      )}
      {sucesso && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 text-sm">
          {sucesso}
        </div>
      )}

      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total no arquivo" value={preview.totalLinhas} />
          <Stat label="Linhas válidas" value={preview.linhasValidas} />
          <Stat label="Vagas a criar" value={preview.vagasCriadas} tone="emerald" />
          <Stat label="Vagas a fechar" value={preview.vagasFechadas} tone="amber" />
          <Stat label="Combinações zeradas" value={preview.linhasZeradas} tone="amber" />
          <Stat label="Filiais desconhecidas" value={preview.filiaisDesconhecidas.length} tone="rose" />
          {preview.filiaisDesconhecidas.length > 0 && (
            <div className="col-span-full rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">
              Códigos de filial não cadastrados (linhas ignoradas): {preview.filiaisDesconhecidas.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClass: Record<typeof tone, string> = {
    slate: 'bg-white text-conecta-primary border-conecta-primary/10',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    rose: 'bg-rose-50 text-rose-900 border-rose-200',
  };
  return (
    <div className={`rounded-2xl border p-3 ${toneClass[tone]}`}>
      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold">{label}</div>
      <div className="font-display text-2xl font-extrabold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

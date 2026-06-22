'use client';

import { useState, useTransition } from 'react';
import { previewImport, aplicarSync, type PreviewResultado } from '@/actions/qlp/importar';

export function ImportPreview() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResultado | null>(null);
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
        const p = await previewImport(fd);
        setPreview(p);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'erro ao processar');
      }
    });
  }

  async function onApply() {
    if (!file) return;
    if (!confirm('Aplicar este sync? Vínculos de colaboradores com mudança de tier/filial serão removidos.')) return;
    setErro(null);
    const fd = new FormData();
    fd.append('arquivo', file);
    start(async () => {
      try {
        const r = await aplicarSync(fd);
        setSucesso(
          `Sync aplicado: ${r.novos} novos, ${r.atualizados} atualizados, ${r.desligados} desligados, ${r.pendencias} pendências.`,
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Arquivo XLS do Quadro Perlog</label>
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setSucesso(null);
          }}
          className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white hover:file:bg-slate-800"
        />
        <div className="flex gap-2 mt-3">
          <button
            disabled={!file || pending}
            onClick={onPreview}
            className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm disabled:opacity-50"
          >
            {pending && !preview ? 'Processando…' : 'Pré-visualizar'}
          </button>
          {preview && (
            <button
              disabled={pending}
              onClick={onApply}
              className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm disabled:opacity-50"
            >
              {pending ? 'Aplicando…' : 'Aplicar sync'}
            </button>
          )}
        </div>
      </div>

      {erro && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}
      {sucesso && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 text-sm">{sucesso}</div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total no XLS" value={preview.totalLinhas} />
            <Stat label="Novos" value={preview.novos} tone="emerald" />
            <Stat label="Atualizados (sem quebra)" value={preview.atualizadosSemQuebra} />
            <Stat label="Mudança de tier" value={preview.mudancaTier} tone="amber" />
            <Stat label="Mudança de filial" value={preview.mudancaFilial} tone="amber" />
            <Stat label="Desligados" value={preview.desligados} tone="rose" />
            <Stat label="Funções novas" value={preview.funcoesNovas.length} />
            <Stat label="Filiais desconhecidas" value={preview.filiaisDesconhecidas.length} tone="rose" />
          </div>

          {preview.amostras.novos.length > 0 && (
            <Detalhes titulo={`Novos (${preview.novos}) — primeiros ${preview.amostras.novos.length}`}>
              <ul className="text-sm space-y-1">
                {preview.amostras.novos.map((n) => (
                  <li key={n.chapa}>
                    <span className="font-mono text-xs">{n.chapa}</span> · {n.nome} · {n.funcao} · filial {n.codfilial}
                  </li>
                ))}
              </ul>
            </Detalhes>
          )}
          {preview.amostras.mudancaTier.length > 0 && (
            <Detalhes titulo={`Mudança de tier (${preview.mudancaTier})`}>
              <ul className="text-sm space-y-1">
                {preview.amostras.mudancaTier.map((m) => (
                  <li key={m.chapa}>
                    <span className="font-mono text-xs">{m.chapa}</span> · {m.nome} · {m.de} → {m.para}
                  </li>
                ))}
              </ul>
            </Detalhes>
          )}
          {preview.amostras.mudancaFilial.length > 0 && (
            <Detalhes titulo={`Mudança de filial (${preview.mudancaFilial})`}>
              <ul className="text-sm space-y-1">
                {preview.amostras.mudancaFilial.map((m) => (
                  <li key={m.chapa}>
                    <span className="font-mono text-xs">{m.chapa}</span> · {m.nome} · {m.de} → {m.para}
                  </li>
                ))}
              </ul>
            </Detalhes>
          )}
          {preview.amostras.desligados.length > 0 && (
            <Detalhes titulo={`Desligados (${preview.desligados})`}>
              <ul className="text-sm space-y-1">
                {preview.amostras.desligados.map((d) => (
                  <li key={d.chapa}>
                    <span className="font-mono text-xs">{d.chapa}</span> · {d.nome}
                  </li>
                ))}
              </ul>
            </Detalhes>
          )}
          {preview.funcoesNovas.length > 0 && (
            <Detalhes titulo={`Funções novas (${preview.funcoesNovas.length})`}>
              <ul className="text-sm space-y-1">
                {preview.funcoesNovas.map((f) => (
                  <li key={f.funcao}>
                    {f.funcao} <span className="text-slate-500">→ {f.tier}{f.nivel ? `/${f.nivel}` : ''} · {f.trilha}</span>
                  </li>
                ))}
              </ul>
            </Detalhes>
          )}
          {preview.filiaisDesconhecidas.length > 0 && (
            <Detalhes titulo={`Filiais desconhecidas (${preview.filiaisDesconhecidas.length})`}>
              <p className="text-sm text-slate-600">
                Estes <code>codfilial</code> aparecem no XLS mas não estão cadastrados em <code>filiais</code>:
              </p>
              <p className="font-mono text-xs mt-2">{preview.filiaisDesconhecidas.join(', ')}</p>
            </Detalhes>
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
    slate: 'bg-slate-50 text-slate-900 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    rose: 'bg-rose-50 text-rose-900 border-rose-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${toneClass[tone]}`}>
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Detalhes({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">{titulo}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

'use client';

import { useState } from 'react';
import { X, FileSpreadsheet } from 'lucide-react';

export function ExportarQuadroModal({
  filiais,
  onClose,
}: {
  filiais: string[];
  onClose: () => void;
}) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const todasSelecionadas = filiais.length > 0 && selecionadas.size === filiais.length;
  const podeExportar = todasSelecionadas || selecionadas.size > 0;

  const toggleTodas = () => {
    setSelecionadas(todasSelecionadas ? new Set() : new Set(filiais));
  };

  const toggleUma = (f: string) => {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const href = todasSelecionadas
    ? '/api/qlp/quadro/export'
    : `/api/qlp/quadro/export?filiais=${Array.from(selecionadas).join(',')}`;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-conecta-primary/40 px-4">
      <div
        className="bg-white rounded-xl border border-conecta-accent/30 p-4 space-y-3 w-full max-w-md"
        style={{ boxShadow: '0 12px 40px -10px rgba(13,43,107,0.3)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-conecta-primary">Exportar quadro</h3>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-conecta-muted" />
          </button>
        </div>
        <p className="text-xs text-conecta-muted">Selecione a(s) filial(is) a exportar.</p>

        <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 cursor-pointer text-sm font-medium text-conecta-primary">
          <input
            type="checkbox"
            checked={todasSelecionadas}
            onChange={toggleTodas}
            className="accent-conecta-accent"
          />
          Todas as filiais
        </label>

        <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-100 rounded-md p-2">
          {filiais.length === 0 ? (
            <p className="text-xs text-conecta-muted px-2 py-1.5">Nenhuma filial disponível.</p>
          ) : (
            filiais.map((f) => (
              <label
                key={f}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer text-sm text-conecta-primary"
              >
                <input
                  type="checkbox"
                  checked={selecionadas.has(f)}
                  onChange={() => toggleUma(f)}
                  className="accent-conecta-accent"
                />
                Filial {f}
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-slate-200 text-conecta-muted hover:bg-slate-50"
          >
            Cancelar
          </button>
          {podeExportar ? (
            <a
              href={href}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-conecta-accent text-white hover:bg-conecta-accent/90"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-conecta-accent/40 text-white cursor-not-allowed">
              <FileSpreadsheet className="h-4 w-4" /> Exportar
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

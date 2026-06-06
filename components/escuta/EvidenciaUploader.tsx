'use client';
import { useRef, useState } from 'react';
import { Camera, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type FotoEnviada = { path: string; size: number; previewUrl: string };

const MAX = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/jpg'];

export function EvidenciaUploader({
  fotos, onChange,
}: {
  fotos: FotoEnviada[];
  onChange: (next: FotoEnviada[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const slots = 3 - fotos.length;

  async function enviar(files: FileList | File[]) {
    setErro(null);
    const lista = Array.from(files).slice(0, slots);
    if (lista.length === 0) return;
    setBusy(true);
    try {
      const novas: FotoEnviada[] = [];
      for (const f of lista) {
        if (!ALLOWED.includes(f.type)) { setErro('Apenas JPG ou PNG.'); continue; }
        if (f.size > MAX) { setErro('Máximo 10MB por foto.'); continue; }
        const fd = new FormData();
        fd.append('file', f);
        const r = await fetch('/api/escuta/upload', { method: 'POST', body: fd });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setErro(j.erro || 'Falha no upload');
          continue;
        }
        const { path, size } = await r.json();
        novas.push({ path, size, previewUrl: URL.createObjectURL(f) });
      }
      onChange([...fotos, ...novas].slice(0, 3));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function remover(i: number) {
    const foto = fotos[i];
    if (foto) URL.revokeObjectURL(foto.previewUrl);
    onChange(fotos.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <label className="block text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary">
        Fotos de evidência da reunião (1 a 3)
      </label>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          if (slots > 0 && !busy) enviar(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-2xl border-2 border-dashed p-5 transition-colors',
          drag ? 'border-conecta-accent bg-conecta-accent/5' : 'border-conecta-primary/20 bg-white',
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {fotos.map((f, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-conecta-primary/10 bg-conecta-light">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.previewUrl} alt="" className="w-full h-32 object-cover" />
              <button
                type="button"
                onClick={() => remover(i)}
                aria-label="Remover foto"
                className="absolute top-1 right-1 grid place-items-center h-7 w-7 rounded-full bg-white/95 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {slots > 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="grid place-items-center h-32 rounded-xl border border-dashed border-conecta-primary/30 text-conecta-muted hover:text-conecta-accent hover:border-conecta-accent transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <div className="text-center">
                  <Camera className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-xs">Adicionar foto</div>
                </div>
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-conecta-muted mt-3">
          Adicione fotos que registrem a realização da reunião. Arraste ou clique. JPG/PNG, máx 10MB cada.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        hidden
        onChange={(e) => e.target.files && enviar(e.target.files)}
      />

      {erro && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
    </div>
  );
}

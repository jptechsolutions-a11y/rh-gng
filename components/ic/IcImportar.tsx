'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { parseBaseIc, semanaDoNomeArquivo } from '@/lib/ic/parse';
import { concluirImportIc, descartarImportIc, enviarLoteIc, iniciarImportIc } from '@/actions/ic/importar';

const LOTE = 500;

export function IcImportar({ semanas }: { semanas: { semanaRef: string; arquivo: string; por: string; em: string; total: number }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [semana, setSemana] = useState(() => new Date().toISOString().slice(0, 10));
  const [fase, setFase] = useState<'idle' | 'lendo' | 'enviando' | 'ok'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [prog, setProg] = useState(0);

  async function processar(file: File) {
    setErro(null); setMsg(null); setProg(0);
    let importId: string | null = null;
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) throw new Error('informe a data da semana');
      setFase('lendo');
      setMsg('Lendo a planilha no navegador… arquivos grandes levam até 1 minuto.');
      const buf = await file.arrayBuffer();
      // Só a aba BASE é lida (a outra aba é um recorte dela).
      const wb = XLSX.read(buf, { type: 'array', cellDates: true, sheets: 'BASE' });
      const { pendencias, headcount, totalBase } = parseBaseIc(wb);
      if (pendencias.length === 0) throw new Error('Nenhuma pendência da bandeira PERLOG encontrada na aba BASE');

      setFase('enviando');
      const func = headcount.reduce((s, h) => s + h.qtd, 0);
      setMsg(`${pendencias.length} pendências PERLOG e ${func} funcionários (de ${totalBase} linhas na base). Enviando…`);
      importId = await iniciarImportIc(file.name, semana);
      for (let i = 0; i < pendencias.length; i += LOTE) {
        await enviarLoteIc(importId, pendencias.slice(i, i + LOTE));
        setProg(Math.min(100, Math.round(((i + LOTE) / pendencias.length) * 100)));
      }
      await concluirImportIc(importId, headcount, pendencias.length);
      setFase('ok');
      setMsg(`Semana de ${semana.split('-').reverse().join('/')} importada: ${pendencias.length} pendências.`);
      router.refresh();
    } catch (e) {
      if (importId) await descartarImportIc(importId).catch(() => {});
      setFase('idle'); setMsg(null);
      setErro(e instanceof Error ? e.message : 'erro na importação');
    }
  }

  const ocupado = fase === 'lendo' || fase === 'enviando';

  return (
    <div className="space-y-5 max-w-2xl">
      <ConectaCard>
        <SectionHeader label="Importar semana do IC" icon={Upload} />
        <p className="mt-4 text-sm text-conecta-text">
          Envie o arquivo <strong>IC SEMANAL (.xlsx)</strong>. O sistema lê a aba <strong>BASE</strong>, mantém só a bandeira{' '}
          <strong>PERLOG</strong> e guarda a semana no histórico. Reimportar a <em>mesma data</em> substitui aquela semana.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <span className="font-display text-[11px] uppercase tracking-wide text-conecta-muted font-semibold">Data da semana</span>
          <input type="date" value={semana} onChange={(e) => setSemana(e.target.value)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5" />
        </label>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xlsm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              const sug = semanaDoNomeArquivo(f.name);
              if (sug && sug !== semana) { setSemana(sug); }
              void processar(f);
            }
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={ocupado}
          onClick={() => input.current?.click()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-conecta-accent text-white px-4 py-2.5 text-[12px] font-display font-semibold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-60"
        >
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {ocupado ? 'Importando…' : 'Escolher arquivo'}
        </button>
        <p className="mt-2 text-[11px] text-conecta-muted">
          Ao escolher o arquivo, a data da semana é sugerida pelo nome (ex.: &ldquo;27-10&rdquo;). Confira antes de importar semanas passadas.
        </p>

        {msg && (
          <div className="mt-4 rounded-lg border border-conecta-primary/15 bg-slate-50 p-3 text-sm flex items-center gap-2">
            {fase === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Loader2 className="h-4 w-4 animate-spin text-conecta-accent" />}
            {msg}
            {fase === 'enviando' && <span className="ml-auto font-display font-bold tabular-nums">{prog}%</span>}
          </div>
        )}
        {erro && <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}
      </ConectaCard>

      <ConectaCard>
        <SectionHeader label="Semanas importadas" />
        {semanas.length === 0 ? (
          <p className="mt-4 text-sm text-conecta-muted">Nenhuma importação ainda.</p>
        ) : (
          <ul className="mt-4 divide-y divide-conecta-primary/8 text-sm">
            {semanas.map((w) => (
              <li key={w.semanaRef} className="py-2 flex flex-wrap items-center gap-3">
                <span className="font-display font-bold text-conecta-primary w-24">{w.semanaRef.split('-').reverse().join('/')}</span>
                <span className="tabular-nums">{w.total} pendências</span>
                <span className="text-[11px] text-conecta-muted ml-auto">{w.arquivo} · {w.por} · {new Date(w.em).toLocaleString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        )}
      </ConectaCard>
    </div>
  );
}

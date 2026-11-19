'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { dataDoNomeArquivo, parseAvaliacoes } from '@/lib/experiencia/parse';
import { statusPendente } from '@/lib/experiencia/tipos';
import { concluirImportExp, descartarImportExp, enviarLoteExp, iniciarImportExp } from '@/actions/experiencia/importar';

const LOTE = 500;

export function ExpImportar({ bases }: { bases: { dataRef: string; arquivo: string; por: string; em: string; total: number }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [fase, setFase] = useState<'idle' | 'lendo' | 'enviando' | 'ok'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [prog, setProg] = useState(0);

  async function processar(file: File) {
    setErro(null); setMsg(null); setProg(0);
    let importId: string | null = null;
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('informe a data da extração');
      setFase('lendo');
      setMsg('Lendo a planilha no navegador…');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const { linhas, totalArquivo } = parseAvaliacoes(wb);
      if (linhas.length === 0) throw new Error('Nenhum colaborador PERLOG ativo encontrado no arquivo');
      const pend = linhas.reduce((s, l) => s + +statusPendente(l.status35) + +statusPendente(l.status70), 0);

      setFase('enviando');
      setMsg(`${linhas.length} colaboradores PERLOG ativos (de ${totalArquivo} linhas) · ${pend} avaliações pendentes. Enviando…`);
      importId = await iniciarImportExp(file.name, data);
      for (let i = 0; i < linhas.length; i += LOTE) {
        await enviarLoteExp(importId, linhas.slice(i, i + LOTE));
        setProg(Math.min(100, Math.round(((i + LOTE) / linhas.length) * 100)));
      }
      await concluirImportExp(importId, linhas.length);
      setFase('ok');
      setMsg(`Base de ${data.split('-').reverse().join('/')} importada: ${linhas.length} colaboradores, ${pend} pendências.`);
      router.refresh();
    } catch (e) {
      if (importId) await descartarImportExp(importId).catch(() => {});
      setFase('idle'); setMsg(null);
      setErro(e instanceof Error ? e.message : 'erro na importação');
    }
  }

  const ocupado = fase === 'lendo' || fase === 'enviando';

  return (
    <div className="space-y-5 max-w-2xl">
      <ConectaCard>
        <SectionHeader label="Importar avaliações de experiência" icon={Upload} />
        <p className="mt-4 text-sm text-conecta-text">
          Envie o arquivo <strong>AVALIAÇÕES (.xls/.xlsx)</strong>. O sistema mantém só a bandeira <strong>PERLOG</strong> e colaboradores{' '}
          <strong>Ativos</strong>, e guarda cada extração no histórico. Reimportar a <em>mesma data</em> substitui aquela base.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <span className="font-display text-[11px] uppercase tracking-wide text-conecta-muted font-semibold">Data da extração</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="rounded-lg border border-conecta-primary/15 px-3 py-1.5" />
        </label>
        <input
          ref={input}
          type="file"
          accept=".xls,.xlsx,.xlsm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              const sug = dataDoNomeArquivo(f.name);
              if (sug && sug !== data) setData(sug);
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
          A data é sugerida pelo nome do arquivo (ex.: &ldquo;11.11&rdquo;). Confira antes de importar bases antigas.
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
        <SectionHeader label="Bases importadas" />
        {bases.length === 0 ? (
          <p className="mt-4 text-sm text-conecta-muted">Nenhuma importação ainda.</p>
        ) : (
          <ul className="mt-4 divide-y divide-conecta-primary/8 text-sm">
            {bases.map((w) => (
              <li key={w.dataRef} className="py-2 flex flex-wrap items-center gap-3">
                <span className="font-display font-bold text-conecta-primary w-24">{w.dataRef.split('-').reverse().join('/')}</span>
                <span className="tabular-nums">{w.total} colaboradores</span>
                <span className="text-[11px] text-conecta-muted ml-auto">{w.arquivo} · {w.por} · {new Date(w.em).toLocaleString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        )}
      </ConectaCard>
    </div>
  );
}

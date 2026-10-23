'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { parseBaseEpi } from '@/lib/epi/parse';
import { concluirImportEpi, descartarImportEpi, enviarLoteEpi, iniciarImportEpi } from '@/actions/epi/importar';

const LOTE = 500;

export function EpiImportar({ ultima }: { ultima: { arquivo: string; por: string; em: string; linhas: number } | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [fase, setFase] = useState<'idle' | 'lendo' | 'enviando' | 'ok'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [prog, setProg] = useState(0);

  async function processar(file: File) {
    setErro(null);
    setMsg(null);
    setProg(0);
    let importId: string | null = null;
    try {
      setFase('lendo');
      setMsg('Lendo a planilha no navegador… arquivos grandes levam até 1 minuto.');
      const buf = await file.arrayBuffer();
      // Só a aba "Base de dados" é lida — o resto do .xlsm (tabelas dinâmicas, macro) é ignorado.
      const wb = XLSX.read(buf, { type: 'array', cellDates: true, sheets: 'Base de dados' });
      const { linhas, totalBase } = parseBaseEpi(wb);
      if (linhas.length === 0) throw new Error('Nenhuma linha da bandeira PERLOG encontrada na aba "Base de dados"');

      setFase('enviando');
      setMsg(`${linhas.length} linhas PERLOG (de ${totalBase} na base). Enviando…`);
      importId = await iniciarImportEpi(file.name);
      for (let i = 0; i < linhas.length; i += LOTE) {
        await enviarLoteEpi(importId, linhas.slice(i, i + LOTE));
        setProg(Math.min(100, Math.round(((i + LOTE) / linhas.length) * 100)));
      }
      await concluirImportEpi(importId, linhas.length);
      setFase('ok');
      setMsg(`Importação concluída: ${linhas.length} linhas PERLOG.`);
      router.refresh();
    } catch (e) {
      if (importId) await descartarImportEpi(importId).catch(() => {});
      setFase('idle');
      setMsg(null);
      setErro(e instanceof Error ? e.message : 'erro na importação');
    }
  }

  const ocupado = fase === 'lendo' || fase === 'enviando';

  return (
    <div className="space-y-5 max-w-2xl">
      <ConectaCard>
        <SectionHeader label="Importar painel de EPI" icon={Upload} />
        <p className="mt-4 text-sm text-conecta-text">
          Envie o arquivo <strong>Painel Empréstimo EPI (.xlsm / .xlsx)</strong>. O sistema lê a aba{' '}
          <strong>Base de dados</strong>, mantém só as filiais da bandeira <strong>PERLOG</strong> e substitui a base atual.
        </p>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xlsm,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void processar(f); e.target.value = ''; }}
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
        <SectionHeader label="Última importação" />
        {ultima ? (
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-conecta-muted">Arquivo</dt><dd className="font-semibold">{ultima.arquivo}</dd>
            <dt className="text-conecta-muted">Por</dt><dd>{ultima.por}</dd>
            <dt className="text-conecta-muted">Em</dt><dd>{new Date(ultima.em).toLocaleString('pt-BR')}</dd>
            <dt className="text-conecta-muted">Linhas PERLOG</dt><dd className="tabular-nums">{ultima.linhas}</dd>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-conecta-muted">Nenhuma importação ainda.</p>
        )}
      </ConectaCard>
    </div>
  );
}

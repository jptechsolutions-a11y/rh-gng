'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, CheckCircle2, AlertCircle, FileDown } from 'lucide-react';
import { previewCsvPessoas, importarPessoasCsv, type CsvLinha } from '@/actions/avaliacao-admin';

type Filial = { id: string; codigo: string; nome: string };

const EXEMPLO_CSV = 'matricula,nome,funcao,filial,regional,tipo\n12345,Maria Silva,ASSIST. ADMINISTRATIVO,001,Sul,colaborador\n12346,João Souza,GERENTE,001,Sul,ambos\n';

export function ImportarCsv({ filiais }: { filiais: Filial[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<CsvLinha[] | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string>('');

  const filiaisPorCodigo = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of filiais) m[f.codigo] = f.id;
    return m;
  }, [filiais]);

  const onFile = async (file: File) => {
    setNomeArquivo(file.name);
    const texto = await file.text();
    start(async () => {
      try {
        const r = await previewCsvPessoas(texto, filiaisPorCodigo);
        setPreview(r);
        const validas = r.filter((l) => l.ok).length;
        toast.success(`Pré-visualização: ${validas} válidas / ${r.length - validas} com erro`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao analisar CSV');
        setPreview(null);
      }
    });
  };

  const importar = () => {
    if (!preview) return;
    const validas = preview.filter((l) => l.ok);
    if (validas.length === 0) { toast.error('Nenhuma linha válida'); return; }
    start(async () => {
      try {
        const { inseridas, atualizadas } = await importarPessoasCsv(preview);
        toast.success(`Importadas: ${inseridas} novas, ${atualizadas} atualizadas`);
        setPreview(null);
        setNomeArquivo('');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao importar');
      }
    });
  };

  const baixarExemplo = () => {
    const blob = new Blob([EXEMPLO_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pessoas-exemplo.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validas = preview?.filter((l) => l.ok).length ?? 0;
  const invalidas = preview ? preview.length - validas : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-perlog-navy">Importar pessoas via CSV</h3>
          <p className="text-xs text-perlog-slate">
            Colunas: <code className="font-mono">matricula, nome, funcao, filial, regional, tipo</code>
            {' '}(tipo: <code>colaborador</code> | <code>gestor</code> | <code>ambos</code>; filial = código).
            Matrículas existentes são atualizadas.
          </p>
        </div>
        <button
          type="button"
          onClick={baixarExemplo}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm border border-slate-200 hover:bg-slate-50 text-perlog-navy"
        >
          <FileDown className="h-4 w-4" /> Baixar exemplo
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer text-perlog-navy">
          <Upload className="h-4 w-4" /> Escolher CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          />
        </label>
        {nomeArquivo && <span className="text-xs text-perlog-slate">{nomeArquivo}</span>}
        {preview && (
          <button
            type="button"
            onClick={importar}
            disabled={pending || validas === 0}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" /> Importar {validas} válidas
          </button>
        )}
      </div>

      {preview && (
        <div className="border border-slate-200 rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs text-perlog-slate flex gap-4">
            <span><strong className="text-emerald-700">{validas}</strong> válidas</span>
            <span><strong className="text-red-700">{invalidas}</strong> com erro</span>
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-white sticky top-0">
                <tr className="border-b border-slate-100 text-left text-perlog-slate">
                  <th className="px-3 py-2 font-medium w-14">Linha</th>
                  <th className="px-3 py-2 font-medium w-16">Status</th>
                  <th className="px-3 py-2 font-medium">Matrícula</th>
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((l) => (
                  <tr key={l.linha} className="border-b border-slate-50">
                    <td className="px-3 py-1.5 font-mono">{l.linha}</td>
                    <td className="px-3 py-1.5">
                      {l.ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" />OK</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700"><AlertCircle className="h-3 w-3" />Erro</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 font-mono">{l.data?.matricula ?? '—'}</td>
                    <td className="px-3 py-1.5">{l.data?.nome ?? '—'}</td>
                    <td className="px-3 py-1.5 text-perlog-slate">{l.erro ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

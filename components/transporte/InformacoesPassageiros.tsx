'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { toast } from 'sonner';
import { listarInformacoesPassageiros, importarCadastro } from '@/actions/transporte-cadastro';
import { Search, Phone, MapPin, Bus, Upload, X, CheckCircle2 } from 'lucide-react';

type Filial = { id: string; codigo: string; nome: string };
type Info = {
  id: string;
  nome: string;
  chapa: string | null;
  cpf: string | null;
  rotaNome: string | null;
  rotaTurno: string | null;
  veiculo: string | null;
  endereco: string | null;
  telefone1: string | null;
  telefone2: string | null;
  situacao: string | null;
};

const SITUACAO_TONE: Record<string, string> = {
  ATIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FÉRIAS: 'bg-sky-50 text-sky-700 border-sky-200',
  'AVISO PRÉVIO': 'bg-amber-50 text-amber-700 border-amber-200',
  'LICENÇA MATER.': 'bg-purple-50 text-purple-700 border-purple-200',
};

export function InformacoesPassageiros({
  perfil,
  filialId: initialFilialId,
  filiais,
}: {
  perfil: string;
  filialId?: string;
  filiais: Filial[];
}) {
  const isAdmin = perfil === 'admin';
  const [filialId, setFilialId] = useState(initialFilialId ?? filiais[0]?.id ?? '');
  const [dados, setDados] = useState<Info[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroRota, setFiltroRota] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [showImport, setShowImport] = useState(false);

  const carregar = async () => {
    if (!filialId) { setLoading(false); return; }
    setLoading(true);
    try {
      const d = await listarInformacoesPassageiros(isAdmin ? filialId : undefined);
      setDados(d as Info[]);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [filialId]);

  const rotas = useMemo(() =>
    [...new Set(dados.map(d => d.rotaNome).filter(Boolean))].sort() as string[],
    [dados]
  );

  const statusList = useMemo(() =>
    [...new Set(dados.map(d => d.situacao).filter(Boolean))].sort() as string[],
    [dados]
  );

  const filtrados = useMemo(() => {
    let result = dados;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      const qDigits = busca.replace(/\D/g, '');
      result = result.filter(d =>
        d.nome.toLowerCase().includes(q) ||
        (d.chapa ?? '').toLowerCase().includes(q) ||
        (d.endereco ?? '').toLowerCase().includes(q) ||
        (qDigits !== '' && (d.cpf ?? '').replace(/\D/g, '').includes(qDigits))
      );
    }
    if (filtroRota === '__sem_rota__') result = result.filter(d => !d.rotaNome);
    else if (filtroRota) result = result.filter(d => d.rotaNome === filtroRota);
    if (filtroStatus) result = result.filter(d => d.situacao === filtroStatus);
    return result;
  }, [dados, busca, filtroRota, filtroStatus]);

  if (loading) {
    return <div className="p-6 text-center text-conecta-muted text-sm">Carregando...</div>;
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        {isAdmin && filiais.length > 0 && (
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-medium text-conecta-primary mb-1">Filial</label>
            <select
              value={filialId}
              onChange={e => setFilialId(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
            >
              {filiais.map(f => (
                <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>
              ))}
            </select>
          </div>
        )}
        {filialId && !showImport && (
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium border border-conecta-primary/20 text-conecta-primary hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" /> Importar cadastro
          </button>
        )}
      </div>

      {showImport && filialId && (
        <ImportCadastroPanel
          filialId={filialId}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); carregar(); }}
        />
      )}

      {filialId && (
        <div className="bg-white rounded-xl border border-conecta-primary/8 p-3 flex flex-wrap items-center gap-3"
          style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.06)' }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-conecta-muted" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, chapa ou endereço..."
              className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-9 pr-3"
            />
          </div>
          <select value={filtroRota} onChange={e => setFiltroRota(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white text-xs px-2">
            <option value="">Todas as rotas</option>
            <option value="__sem_rota__">Sem rota</option>
            {rotas.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white text-xs px-2">
            <option value="">Todos os status</option>
            {statusList.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl border border-conecta-primary/8 overflow-hidden"
        style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-conecta-muted">
                <th className="px-3 py-3 font-medium">Nome</th>
                <th className="px-3 py-3 font-medium">CPF</th>
                <th className="px-3 py-3 font-medium">Rota</th>
                <th className="px-3 py-3 font-medium">Veículo</th>
                <th className="px-3 py-3 font-medium">Endereço</th>
                <th className="px-3 py-3 font-medium">Telefone 1</th>
                <th className="px-3 py-3 font-medium">Telefone 2</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-conecta-muted text-sm">
                    Nenhum passageiro encontrado
                  </td>
                </tr>
              ) : (
                filtrados.map(d => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-conecta-primary whitespace-nowrap">{d.nome}</td>
                    <td className="px-3 py-2 text-conecta-muted font-mono text-xs whitespace-nowrap">{d.cpf ?? '—'}</td>
                    <td className="px-3 py-2">
                      {d.rotaNome ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-conecta-primary">
                          <Bus className="h-3 w-3 text-conecta-accent" />{d.rotaNome}
                          <span className="text-[10px] text-conecta-muted">({d.rotaTurno})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">Sem rota</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-conecta-muted whitespace-nowrap">{d.veiculo ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-conecta-muted min-w-[200px]">
                      {d.endereco ? (
                        <span className="inline-flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />{d.endereco}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-conecta-muted whitespace-nowrap">
                      {d.telefone1 ? (
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{d.telefone1}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-conecta-muted whitespace-nowrap">
                      {d.telefone2 ? (
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{d.telefone2}</span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {d.situacao ? (
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${SITUACAO_TONE[d.situacao.toUpperCase()] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {d.situacao}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtrados.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-conecta-muted">
            Mostrando {filtrados.length} de {dados.length} passageiro(s)
          </div>
        )}
      </div>
    </div>
  );
}

function ImportCadastroPanel({
  filialId,
  onClose,
  onImported,
}: {
  filialId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [pending, start] = useTransition();

  const onApply = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('arquivo', file);
    start(async () => {
      try {
        const r = await importarCadastro(fd, filialId);
        toast.success(`Cadastro atualizado: ${r.total} registro(s) importado(s)`);
        onImported();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao importar cadastro');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-conecta-primary/8 p-4 space-y-3"
      style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-conecta-primary flex items-center gap-1.5">
          <Upload className="h-4 w-4 text-conecta-accent" /> Importar cadastro de passageiros
        </h3>
        <button type="button" onClick={onClose} className="text-conecta-muted hover:text-conecta-primary">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-conecta-muted">
        Envie uma planilha (XLS/XLSX) com colunas <strong>Chapa</strong>, <strong>Nome</strong>,{' '}
        <strong>CPF</strong>, <strong>Rua</strong>, <strong>Bairro</strong>, <strong>Cidade</strong>,{' '}
        <strong>Telefone1</strong>, <strong>Telefone2</strong> e <strong>Situação</strong>. Os dados são
        atualizados por chapa — registros já cadastrados são sobrescritos, novos são adicionados.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block text-xs text-conecta-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-conecta-primary file:text-white file:text-xs file:font-medium file:cursor-pointer"
        />
        <button
          type="button"
          disabled={!file || pending}
          onClick={onApply}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-conecta-accent text-white hover:bg-conecta-accent/90 disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> {pending ? 'Importando...' : 'Importar'}
        </button>
      </div>
    </div>
  );
}

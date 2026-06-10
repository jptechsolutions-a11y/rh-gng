import type { EscutaPresencaItem } from '@/db/schema';

export function ReuniaoLeitura({
  reuniao, fotoUrls,
}: {
  reuniao: {
    turma: string; dataReuniao: string; responsavel: string;
    filialNome: string | null; filialCodigo: string;
    percepcaoFinal: string;
    presenca: EscutaPresencaItem[];
  };
  fotoUrls: string[];
}) {
  const dataFmt = new Date(reuniao.dataReuniao).toLocaleDateString('pt-BR');
  const fotoPrincipal = fotoUrls[0];
  const fotosExtras = fotoUrls.slice(1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5">
        {/* Coluna esquerda — foto principal + bloco filial */}
        <div className="flex flex-col gap-4">
          {fotoPrincipal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <a
              href={fotoPrincipal}
              target="_blank"
              rel="noreferrer"
              className="group relative block rounded-2xl overflow-hidden border border-conecta-primary/15 bg-slate-100 shadow-card hover:shadow-elev transition-shadow"
            >
              <img
                src={fotoPrincipal}
                alt="Foto da turma"
                className="w-full h-full max-h-[420px] object-cover bg-slate-100"
              />
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/55 text-white text-[10px] font-semibold tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                ampliar
              </span>
            </a>
          ) : (
            <div className="rounded-2xl border border-dashed border-conecta-primary/20 bg-conecta-light/40 h-[280px] flex items-center justify-center text-xs text-conecta-muted">
              Sem foto da turma
            </div>
          )}

          <div className="rounded-2xl bg-white border border-conecta-primary/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-conecta-accent mb-3">
              Acolhemos hoje para construirmos o futuro juntos
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <InfoItem label="Filial" value={reuniao.filialNome ?? reuniao.filialCodigo} />
              <InfoItem label="Código" value={reuniao.filialCodigo} />
              <InfoItem label="Turma" value={reuniao.turma} />
              <InfoItem label="Data" value={dataFmt} />
              <div className="col-span-2">
                <InfoItem label="Responsável" value={reuniao.responsavel} />
              </div>
            </dl>
          </div>
        </div>

        {/* Coluna direita — header + tabela de presença */}
        <div className="rounded-2xl bg-white border border-conecta-primary/10 shadow-card overflow-hidden flex flex-col">
          <div className="bg-conecta-primary text-white px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon />
              <span className="font-display text-sm uppercase tracking-[0.18em] font-semibold">
                Turma {reuniao.turma} — {dataFmt}
              </span>
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em] text-white/80">
              {reuniao.presenca.length} {reuniao.presenca.length === 1 ? 'colaborador' : 'colaboradores'}
            </span>
          </div>
          <div className="px-5 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-conecta-muted border-b border-conecta-primary/10">
            Novos colaboradores da semana
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-conecta-light text-conecta-primary text-[11px] uppercase tracking-[0.14em]">
                <tr>
                  <th className="px-3 py-2 text-left">Filial</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Função</th>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-center w-24">Presença</th>
                </tr>
              </thead>
              <tbody>
                {reuniao.presenca.map((p, i) => (
                  <tr key={i} className="border-t border-conecta-primary/5">
                    <td className="px-3 py-2 text-conecta-muted">{reuniao.filialCodigo}</td>
                    <td className="px-3 py-2 font-medium">{p.nome}</td>
                    <td className="px-3 py-2 text-conecta-muted">{p.funcao}</td>
                    <td className="px-3 py-2 text-conecta-muted">{dataFmt}</td>
                    <td className="px-3 py-2 text-center">
                      {p.presente
                        ? <PresencaBadge ok />
                        : <PresencaBadge />}
                    </td>
                  </tr>
                ))}
                {reuniao.presenca.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-xs text-conecta-muted">
                      Nenhum participante registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Percepção */}
      <div className="rounded-2xl bg-white border border-conecta-accent/30 p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-accent mb-2">
          Percepção Final da G&amp;G
        </div>
        <p className="text-sm whitespace-pre-wrap">{reuniao.percepcaoFinal}</p>
      </div>

      {/* Fotos extras */}
      {fotosExtras.length > 0 && (
        <div>
          <SectionTitle>Evidências fotográficas</SectionTitle>
          <p className="text-xs text-conecta-muted mt-1">
            Clique em uma foto para abrir em tamanho original.
          </p>
          <div
            className={
              fotosExtras.length === 1
                ? 'mt-3'
                : fotosExtras.length === 2
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3'
            }
          >
            {fotosExtras.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <a
                key={i}
                href={u}
                target="_blank"
                rel="noreferrer"
                className="group relative block rounded-xl overflow-hidden border border-conecta-primary/15 bg-slate-100 shadow-card hover:shadow-elev transition-shadow"
              >
                <img
                  src={u}
                  alt={`Evidência ${i + 2}`}
                  className={`w-full ${fotosExtras.length === 1 ? 'max-h-[600px]' : 'max-h-[420px]'} h-auto object-contain bg-slate-100`}
                />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/55 text-white text-[10px] font-semibold tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                  Foto {i + 2} · ampliar
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary">{label}</dt>
      <dd className="text-sm text-conecta-text mt-0.5">{value}</dd>
    </div>
  );
}

function PresencaBadge({ ok = false }: { ok?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
        ok
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {ok ? 'SIM' : 'NÃO'}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-[2px] w-6 bg-conecta-accent" />
      <h2 className="font-display text-[11px] uppercase tracking-[0.22em] font-semibold text-conecta-primary">
        {children}
      </h2>
    </div>
  );
}

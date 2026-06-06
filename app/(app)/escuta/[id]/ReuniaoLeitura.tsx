import { PilarIcone } from '@/components/escuta/PilarIcone';
import type { EscutaPresencaItem } from '@/db/schema';

type Pilar = { id: number; ordem: number; nome: string; icone: string };

export function ReuniaoLeitura({
  reuniao, pilares, fotoUrls,
}: {
  reuniao: {
    turma: string; dataReuniao: string; responsavel: string;
    filialNome: string | null; filialCodigo: string;
    percepcoes: Record<string, string>; percepcaoFinal: string;
    presenca: EscutaPresencaItem[];
  };
  pilares: Pilar[];
  fotoUrls: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
        <Info label="Filial" value={reuniao.filialNome ?? reuniao.filialCodigo} />
        <Info label="Turma" value={reuniao.turma} />
        <Info label="Data" value={new Date(reuniao.dataReuniao).toLocaleDateString('pt-BR')} />
        <Info label="Responsável" value={reuniao.responsavel} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pilares.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white border border-conecta-primary/10 p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="grid place-items-center h-9 w-9 rounded-lg bg-conecta-primary text-white">
                <PilarIcone chave={p.icone} className="h-4 w-4" />
              </span>
              <div className="font-display font-extrabold text-conecta-primary">{p.ordem}. {p.nome}</div>
            </div>
            <p className="text-sm text-conecta-text whitespace-pre-wrap">
              {reuniao.percepcoes[String(p.id)]?.trim() || (
                <span className="text-conecta-muted italic">Sem registro.</span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-conecta-accent/30 p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-accent mb-2">
          Percepção Final da G&amp;G
        </div>
        <p className="text-sm whitespace-pre-wrap">{reuniao.percepcaoFinal}</p>
      </div>

      {fotoUrls.length > 0 && (
        <div>
          <SectionTitle>Evidências fotográficas</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            {fotoUrls.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <a key={i} href={u} target="_blank" rel="noreferrer"
                 className="block rounded-xl overflow-hidden border border-conecta-primary/10 bg-conecta-light">
                <img src={u} alt={`Evidência ${i + 1}`} className="w-full h-44 object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle>Lista de presença</SectionTitle>
        <div className="overflow-x-auto rounded-2xl border border-conecta-primary/10 bg-white mt-3">
          <table className="w-full text-sm">
            <thead className="bg-conecta-light text-conecta-primary text-[11px] uppercase tracking-[0.14em]">
              <tr>
                <th className="px-3 py-2 text-left w-10">#</th>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Função</th>
                <th className="px-3 py-2 text-center w-28">Presença</th>
              </tr>
            </thead>
            <tbody>
              {reuniao.presenca.map((p, i) => (
                <tr key={i} className="border-t border-conecta-primary/5">
                  <td className="px-3 py-2 text-conecta-muted">{i + 1}</td>
                  <td className="px-3 py-2">{p.nome}</td>
                  <td className="px-3 py-2">{p.funcao}</td>
                  <td className="px-3 py-2 text-center">
                    {p.presente
                      ? <span className="text-emerald-700 font-semibold">SIM</span>
                      : <span className="text-red-700 font-semibold">NÃO</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-conecta-primary/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-conecta-primary">{label}</div>
      <div className="text-sm text-conecta-text mt-0.5">{value}</div>
    </div>
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

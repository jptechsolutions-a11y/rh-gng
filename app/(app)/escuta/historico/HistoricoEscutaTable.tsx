import Link from 'next/link';
import { Eye, Images } from 'lucide-react';

type Linha = {
  id: string; filialCodigo: string; filialNome: string | null;
  turma: string; dataReuniao: string; responsavel: string;
  totalPresentes: number | null; totalPessoas: number | null;
  fotos: Array<unknown>;
};

export function HistoricoEscutaTable({
  linhas, mostrarFilial,
}: { linhas: Linha[]; mostrarFilial: boolean }) {
  if (linhas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-conecta-primary/20 p-10 text-center text-conecta-muted">
        Nenhuma reunião registrada ainda.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-conecta-primary/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-conecta-light text-conecta-primary text-[11px] uppercase tracking-[0.14em]">
          <tr>
            <th className="px-3 py-2 text-left">Data</th>
            <th className="px-3 py-2 text-left">Turma</th>
            <th className="px-3 py-2 text-left">Responsável</th>
            {mostrarFilial && <th className="px-3 py-2 text-left">Filial</th>}
            <th className="px-3 py-2 text-center">Presentes</th>
            <th className="px-3 py-2 text-center">Fotos</th>
            <th className="px-3 py-2 w-20" />
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-t border-conecta-primary/5 hover:bg-conecta-light/40">
              <td className="px-3 py-2">{new Date(l.dataReuniao).toLocaleDateString('pt-BR')}</td>
              <td className="px-3 py-2 font-medium text-conecta-primary">{l.turma}</td>
              <td className="px-3 py-2">{l.responsavel}</td>
              {mostrarFilial && <td className="px-3 py-2">{l.filialNome ?? l.filialCodigo}</td>}
              <td className="px-3 py-2 text-center">
                <span className="font-semibold">{l.totalPresentes ?? 0}</span>
                <span className="text-conecta-muted"> / {l.totalPessoas ?? 0}</span>
              </td>
              <td className="px-3 py-2 text-center">
                <span className="inline-flex items-center gap-1 text-conecta-muted">
                  <Images className="h-3.5 w-3.5" /> {l.fotos.length}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <Link href={`/escuta/${l.id}`}
                      className="inline-flex items-center gap-1 text-conecta-accent hover:text-conecta-primary">
                  <Eye className="h-4 w-4" /> Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { obterAvaliacao } from '@/actions/avaliacao';
import { ClassificacaoBadge } from '@/components/avaliacao/ClassificacaoBadge';
import type { Classificacao } from '@/lib/avaliacao/calculos';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

type Detalhe = {
  d: { id: string; nota: number };
  fator: { texto: string } | null;
  competencia: { nome: string } | null;
};

export default async function Imprimir({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const dados = await obterAvaliacao(id);
  if (!dados) notFound();
  const { avaliacao, avaliado, gestor, filial, detalhes } = dados;
  const grupos = new Map<string, Detalhe[]>();
  for (const d of detalhes) {
    const k = d.competencia?.nome ?? '—';
    const lista = grupos.get(k) ?? [];
    lista.push(d);
    grupos.set(k, lista);
  }
  const pontuacao = Number(avaliacao.pontuacaoFinal ?? 0);
  return (
    <main className="laudo mx-auto max-w-3xl space-y-4 p-8 text-sm">
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body, html { background: white !important; }
          nav, aside, .no-print { display: none !important; }
        }
      `}</style>
      <header className="border-b pb-3">
        <h1 className="text-xl font-bold text-perlog-navy">Laudo de Avaliação de Desempenho</h1>
        <p className="text-xs text-perlog-slate">
          RH G&amp;G — gerado em {new Date().toLocaleString('pt-BR')}
        </p>
      </header>
      <section className="grid grid-cols-2 gap-2">
        <div>
          <b>Avaliado:</b> {avaliado?.nome} ({avaliado?.matricula})
        </div>
        <div>
          <b>Gestor:</b> {gestor?.nome} ({gestor?.matricula})
        </div>
        <div>
          <b>Filial:</b> {filial?.nome ?? '—'}
        </div>
        <div>
          <b>Data:</b> {avaliacao.dataAvaliacao}
        </div>
        <div>
          <b>Pontuação:</b> {pontuacao.toFixed(2)}/5.00
        </div>
        <div>
          <b>Classificação:</b>{' '}
          <ClassificacaoBadge
            value={(avaliacao.classificacao ?? 'PRECISA MELHORAR') as Classificacao}
          />
        </div>
      </section>
      {[...grupos.entries()].map(([comp, lista]) => (
        <section key={comp} className="break-inside-avoid">
          <h2 className="mt-3 text-base font-semibold text-perlog-navy">{comp}</h2>
          <table className="w-full text-xs">
            <tbody>
              {lista.map((d) => (
                <tr key={d.d.id} className="border-t">
                  <td className="py-1">{d.fator?.texto}</td>
                  <td className="w-12 text-right font-semibold">{d.d.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section>
        <h2 className="mt-3 text-base font-semibold">Feedback</h2>
        <p>
          <b>Pontos fortes:</b> {avaliacao.pontosFortes || '—'}
        </p>
        <p>
          <b>Oportunidades:</b> {avaliacao.oportunidades || '—'}
        </p>
        <p>
          <b>Comentários:</b> {avaliacao.comentarios || '—'}
        </p>
        <p>
          <b>Plano de desenvolvimento:</b> {avaliacao.planoDesenvolvimento || '—'}
        </p>
      </section>
      <div className="no-print mt-6 text-center">
        <PrintButton />
      </div>
    </main>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { getEntrevista } from '@/actions/entrevistas';
import { getRoteiro } from '@/db/queries/config';
import { db, schema } from '@/db/client';
import { eq } from 'drizzle-orm';
import { PerlogLogo } from '@/components/brand/PerlogLogo';
import { PrintToolbar } from './PrintToolbar';

export const dynamic = 'force-dynamic';

const COMPORTAMENTOS_LABELS: Record<string, string> = {
  comunicacao: 'Boa comunicação',
  interesse_vaga: 'Interesse pela vaga',
  postura: 'Postura profissional',
  pontualidade: 'Pontualidade',
  clareza: 'Clareza nas respostas',
  estabilidade_emocional: 'Estabilidade emocional',
  energia: 'Energia / disposição',
  comprometimento: 'Comprometimento',
  equipe: 'Facilidade para trabalho em equipe',
};
const COMPORTAMENTOS_ORDEM = [
  'comunicacao', 'interesse_vaga', 'postura', 'pontualidade', 'clareza',
  'estabilidade_emocional', 'energia', 'comprometimento', 'equipe',
] as const;
const NIVEL_LABEL: Record<string, string> = { sim: 'Sim', parcial: 'Parcial', nao: 'Não' };

function renderResposta(v: unknown): React.ReactNode {
  if (Array.isArray(v)) {
    return (
      <ul className="list-disc pl-5 text-[12px] text-slate-800 space-y-0.5">
        {v.map((it, i) => (<li key={i}>{String(it)}</li>))}
      </ul>
    );
  }
  if (v == null || v === '') return <span className="text-perlog-slate italic">Sem resposta</span>;
  if (typeof v === 'boolean') return <span>{v ? 'Sim' : 'Não'}</span>;
  return <span className="whitespace-pre-wrap">{String(v)}</span>;
}

export default async function ImprimirPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const e = await getEntrevista(id);
  if (!e) notFound();

  const [roteiro, filialRow] = await Promise.all([
    getRoteiro(e.cargoPretendido ?? 'TODOS'),
    db.select({ codigo: schema.filiais.codigo, nome: schema.filiais.nome })
      .from(schema.filiais).where(eq(schema.filiais.id, e.filialId)).limit(1),
  ]);
  const filial = filialRow[0];

  const respostas = (e.respostasRoteiro ?? {}) as Record<string, string | number | boolean | string[]>;
  const notas = (e.notasCriterios ?? {}) as Record<string, string>;

  const fmtDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—';
  const fmtDateTime = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const fmtCpf = (c: string) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

  return (
    <>
      <PrintToolbar id={id} entrevista={{
        id: e.id,
        nome: e.nome,
        status: e.status,
        gestorAprovador: e.gestorAprovador ?? null,
        motivoDecisao: e.motivoDecisao ?? null,
        dataRetorno: e.dataRetorno ?? null,
        aprovadoPeloGg: e.aprovadoPeloGg ?? null,
      }} />

      <div className="print-doc mx-auto my-6 max-w-[820px] bg-white shadow-elev print:shadow-none print:my-0 print:max-w-none">
        <header className="px-12 pt-12 pb-6 border-b-2 border-perlog-orange print:px-10">
          <div className="flex items-start justify-between gap-6">
            <PerlogLogo className="h-10 w-auto" />
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-perlog-slate">Gente &amp; Gestão</div>
              <div className="text-sm font-semibold text-perlog-navy">Ficha de Entrevista</div>
              <div className="text-xs text-perlog-slate mt-1">Documento gerado em {fmtDateTime(new Date())}</div>
            </div>
          </div>
        </header>

        <main className="px-12 py-8 print:px-10 space-y-7 text-[12px] leading-relaxed text-perlog-navy">
          <section>
            <SectionTitle n="1" title="Identificação do candidato" />
            <table className="w-full border-collapse">
              <tbody>
                <Row label="Nome" value={e.nome} />
                <Row label="CPF" value={fmtCpf(e.cpf)} />
                <Row label="Data de nascimento" value={fmtDate(e.dataNasc)} />
              </tbody>
            </table>
          </section>

          <section>
            <SectionTitle n="2" title="Dados da entrevista" />
            <table className="w-full border-collapse">
              <tbody>
                <Row label="Data da entrevista" value={fmtDateTime(e.dataHora)} />
                <Row label="Entrevistador(a)" value={e.recrutador ?? '—'} />
                <Row label="Unidade / CD" value={filial ? `${filial.codigo} — ${filial.nome}` : '—'} />
                <Row label="Cargo proposto" value={e.cargoPretendido ?? '—'} />
                <Row label="Estado civil" value={e.estadoCivil ?? '—'} />
                <Row label="Preferência de turno" value={(e.disponibilidadeTurnos ?? []).join(' · ') || '—'} />
              </tbody>
            </table>
          </section>

          {e.experiencias && (
            <section>
              <SectionTitle n="3" title="Experiências profissionais" />
              <p className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-3 text-[12px]">{e.experiencias}</p>
            </section>
          )}

          <section>
            <SectionTitle n="4" title="Roteiro da entrevista" />
            <div className="space-y-3">
              {roteiro.length === 0 && <p className="text-perlog-slate text-[12px]">Sem perguntas configuradas.</p>}
              {roteiro.map((q, i) => {
                const resp = respostas[q.id];
                return (
                  <div key={q.id} className="break-inside-avoid">
                    <div className="font-semibold text-[12px]">
                      <span className="text-perlog-orange">{String(i + 1).padStart(2, '0')}.</span> {q.pergunta}
                    </div>
                    <div className="mt-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] min-h-[1.8em]">
                      {renderResposta(resp)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <SectionTitle n="5" title="Comportamentos" />
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-perlog-navy text-white">
                  <th className="text-left px-3 py-2 font-semibold border border-perlog-navy">Comportamento</th>
                  <th className="text-center px-3 py-2 font-semibold border border-perlog-navy w-32">Avaliação</th>
                </tr>
              </thead>
              <tbody>
                {COMPORTAMENTOS_ORDEM.map((slug) => {
                  const v = notas[slug];
                  return (
                    <tr key={slug}>
                      <td className="px-3 py-2 border border-slate-300">{COMPORTAMENTOS_LABELS[slug]}</td>
                      <td className="text-center px-3 py-2 border border-slate-300 font-semibold">
                        {v && NIVEL_LABEL[v] ? NIVEL_LABEL[v] : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section>
            <SectionTitle n="6" title="Parecer final" />
            <table className="w-full border-collapse text-[12px]">
              <tbody>
                <Row label="Status" value={e.status} bold />
                <Row label="Avaliado pelo G&G" value={e.aprovadoPeloGg ? 'Sim' : 'Não'} />
                {e.parecer && <Row label="Parecer final" value={e.parecer} />}
                {(e.status === 'Aprovado' || e.status === 'Reprovado') && (
                  <>
                    <Row label="Gestor que decidiu" value={e.gestorAprovador ?? '—'} bold />
                    <Row label="Data da decisão" value={fmtDateTime(e.decisaoEm)} />
                  </>
                )}
                <Row label="Data de retorno" value={fmtDate(e.dataRetorno)} />
                <Row label="Motivo da decisão" value={e.motivoDecisao ?? '—'} />
                <Row label="Observações" value={e.observacoes ?? '—'} />
              </tbody>
            </table>
          </section>

          <section className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 mt-8 break-inside-avoid">
            <div className="text-center">
              <div className="border-t border-perlog-navy pt-2 text-[11px] text-perlog-slate">{e.recrutador ?? 'Entrevistador(a)'}</div>
            </div>
            <div className="text-center">
              <div className="border-t border-perlog-navy pt-2 text-[11px] text-perlog-slate">{e.nome} (candidato)</div>
            </div>
          </section>

          {e.consentimentoLgpdEm && (
            <p className="text-[10px] text-perlog-slate italic mt-4">
              Consentimento LGPD registrado em {fmtDateTime(e.consentimentoLgpdEm)}. Dados tratados conforme Lei 13.709/2018.
            </p>
          )}
        </main>

        <footer className="border-t border-slate-200 px-12 py-4 print:px-10 flex items-center justify-between text-[10px] text-perlog-slate">
          <span>Grupo Perlog — Gente &amp; Gestão · Filial {filial?.codigo ?? '—'} {filial?.nome ?? ''}</span>
          <span>Ficha #{e.id.slice(0, 8).toUpperCase()}</span>
        </footer>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 12mm 16mm 12mm; }
          body { background: white !important; }
          .print-doc { box-shadow: none !important; }
        }
      `}</style>
    </>
  );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="bg-perlog-navy text-white text-[13px] font-semibold px-3 py-1.5 mb-2 rounded-sm">
      {n} — {title}
    </h2>
  );
}

function Row({ label, value, bold }: { label: string; value: string | null | undefined; bold?: boolean }) {
  return (
    <tr>
      <td className="border border-slate-300 px-3 py-1.5 bg-slate-50 font-medium w-[35%]">{label}</td>
      <td className={`border border-slate-300 px-3 py-1.5 ${bold ? 'font-semibold' : ''}`}>{value ?? '—'}</td>
    </tr>
  );
}

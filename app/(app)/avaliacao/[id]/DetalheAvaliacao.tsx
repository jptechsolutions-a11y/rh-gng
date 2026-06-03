'use client';
import { useState, useTransition } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ClassificacaoBadge } from '@/components/avaliacao/ClassificacaoBadge';
import { RadarCompetencias } from '@/components/avaliacao/RadarCompetencias';
import { EvolucaoIndicator } from '@/components/avaliacao/EvolucaoIndicator';
import { calcularEvolucao, type Classificacao } from '@/lib/avaliacao/calculos';
import { atualizarPlanoDesenvolvimento } from '@/actions/avaliacao';

type Detalhe = {
  d: { id: string; nota: number };
  fator: { texto: string } | null;
  competencia: { nome: string } | null;
};
type Dados = {
  avaliacao: {
    id: string;
    dataAvaliacao: string;
    pontuacaoFinal: string | null;
    classificacao: string | null;
    pontosFortes: string | null;
    oportunidades: string | null;
    comentarios: string | null;
    planoDesenvolvimento: string | null;
  };
  avaliado: { nome: string; matricula: string } | null;
  gestor: { nome: string; matricula: string } | null;
  filial: { nome: string } | null;
  detalhes: Detalhe[];
  anterior: number | null;
};

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-perlog-orange/40 ${className}`}
    />
  );
}

export function DetalheAvaliacao({ dados }: { dados: Dados }) {
  const { avaliacao, avaliado, gestor, filial, detalhes, anterior } = dados;
  const [pdi, setPdi] = useState(avaliacao.planoDesenvolvimento ?? '');
  const [pending, start] = useTransition();

  const porComp = new Map<string, { competencia: string; soma: number; n: number }>();
  for (const d of detalhes) {
    const nome = d.competencia?.nome ?? '—';
    const ent = porComp.get(nome) ?? { competencia: nome, soma: 0, n: 0 };
    ent.soma += d.d.nota;
    ent.n += 1;
    porComp.set(nome, ent);
  }
  const radarData = [...porComp.values()].map((v) => ({
    competencia: v.competencia,
    media: Number((v.soma / v.n).toFixed(2)),
  }));

  const pontuacao = Number(avaliacao.pontuacaoFinal ?? 0);
  const evolucao = calcularEvolucao(pontuacao, anterior);
  const delta = anterior !== null ? Number((pontuacao - anterior).toFixed(2)) : undefined;

  function salvarPdi() {
    start(async () => {
      try {
        await atualizarPlanoDesenvolvimento({
          avaliacaoId: avaliacao.id,
          planoDesenvolvimento: pdi,
        });
        toast.success('PDI salvo');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar PDI');
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
          <div>
            <p className="text-xs text-perlog-slate">Avaliado</p>
            <p className="font-medium">{avaliado?.nome}</p>
            <p className="text-xs">{avaliado?.matricula}</p>
          </div>
          <div>
            <p className="text-xs text-perlog-slate">Gestor</p>
            <p className="font-medium">{gestor?.nome}</p>
            <p className="text-xs">{gestor?.matricula}</p>
          </div>
          <div>
            <p className="text-xs text-perlog-slate">Filial</p>
            <p className="font-medium">{filial?.nome ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-perlog-slate">Data</p>
            <p className="font-medium">{avaliacao.dataAvaliacao}</p>
          </div>
          <div>
            <p className="text-xs text-perlog-slate">Pontuação</p>
            <p className="text-2xl font-bold text-perlog-navy">{pontuacao.toFixed(2)}/5.00</p>
          </div>
          <div>
            <p className="text-xs text-perlog-slate">Classificação</p>
            <ClassificacaoBadge value={(avaliacao.classificacao ?? 'PRECISA MELHORAR') as Classificacao} />
          </div>
          <div>
            <p className="text-xs text-perlog-slate">Evolução</p>
            <EvolucaoIndicator tipo={evolucao} delta={delta} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <CardTitle className="mb-3 text-base">Radar por competência</CardTitle>
          <RadarCompetencias data={radarData} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <CardTitle className="mb-3 text-base">Fatores avaliados</CardTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-perlog-slate">
                <th className="pb-2">Competência</th>
                <th className="pb-2">Fator</th>
                <th className="pb-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {detalhes.map((d) => (
                <tr key={d.d.id} className="border-t">
                  <td className="py-1 pr-2">{d.competencia?.nome}</td>
                  <td className="py-1 pr-2">{d.fator?.texto}</td>
                  <td className="py-1 font-semibold">{d.d.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <CardTitle className="text-base">Feedback</CardTitle>
          <div>
            <p className="text-xs text-perlog-slate">Pontos fortes</p>
            <p className="whitespace-pre-wrap">{avaliacao.pontosFortes || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-perlog-slate">Oportunidades</p>
            <p className="whitespace-pre-wrap">{avaliacao.oportunidades || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-perlog-slate">Comentários</p>
            <p className="whitespace-pre-wrap">{avaliacao.comentarios || '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <CardTitle className="text-base">Plano de desenvolvimento</CardTitle>
          <Textarea rows={6} value={pdi} onChange={(e) => setPdi(e.target.value)} />
          <Button onClick={salvarPdi} disabled={pending}>
            Salvar PDI
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

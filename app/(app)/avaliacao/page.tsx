import Link from 'next/link';
import { BarChart3, Wrench, ArrowLeft, Target, Users2, MessageSquare, ScrollText, TrendingUp, Calendar } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { requireSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const ETAPAS = [
  {
    icon: Calendar,
    title: '1. Ciclos de avaliação',
    desc: 'Trimestral, semestral ou anual — admin define o ciclo, prazo de auto-avaliação e prazo de avaliação do gestor.',
  },
  {
    icon: Users2,
    title: '2. Cadastro de colaboradores',
    desc: 'Lista de colaboradores ativos por filial, ligada ao cargo e ao gestor responsável.',
  },
  {
    icon: Target,
    title: '3. Metas e competências',
    desc: 'Metas SMART por colaborador (até 5/ciclo) + matriz de competências comportamentais/técnicas (peso configurável).',
  },
  {
    icon: ScrollText,
    title: '4. Auto-avaliação',
    desc: 'Colaborador preenche notas em si mesmo + comentários. Gestor preenche notas do colaborador.',
  },
  {
    icon: MessageSquare,
    title: '5. Feedback e 1:1',
    desc: 'Reunião 1:1 registrada, feedback do gestor e plano de desenvolvimento individual (PDI) acordado.',
  },
  {
    icon: TrendingUp,
    title: '6. Acompanhamento',
    desc: 'Painel comparativo histórico do colaborador (evolução por ciclo), dashboards por filial e por cargo.',
  },
] as const;

export default async function AvaliacaoPage() {
  await requireSession();

  return (
    <>
      <TopBar titulo="Avaliação de Desempenho" subtitulo="Módulo em desenvolvimento" />
      <div className="p-6 space-y-6">
        <Link href="/inicio" className="inline-flex items-center gap-2 text-sm text-perlog-slate hover:text-perlog-navy">
          <ArrowLeft className="h-4 w-4" /> Voltar para o início
        </Link>

        {/* Banner em desenvolvimento */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="grid place-items-center h-12 w-12 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Wrench className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-amber-900">Em desenvolvimento</h2>
              <p className="text-sm text-amber-800 mt-1">
                O módulo de Avaliação de Desempenho está sendo planejado. Abaixo está a estrutura prevista para você validar e priorizar antes da implementação.
              </p>
              <p className="text-xs text-amber-700/80 mt-2">
                Quer ajustar algo na proposta? Cite os pontos e adapto antes de começar a desenvolver.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estrutura proposta */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-perlog-orange" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-perlog-slate">
              Estrutura proposta
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ETAPAS.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="hover:shadow-elev transition-shadow">
                <CardContent className="p-5">
                  <div className="grid place-items-center h-10 w-10 rounded-lg bg-perlog-orange/10 text-perlog-orange mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base mb-1">{title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Dados que ainda precisam ser definidos */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-perlog-slate mb-3">Definições pendentes</h3>
            <ul className="space-y-2 text-sm text-perlog-navy">
              <li className="flex items-start gap-2">
                <span className="text-perlog-orange font-bold mt-0.5">·</span>
                <span><strong>Ciclo padrão:</strong> trimestral, semestral ou anual?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-perlog-orange font-bold mt-0.5">·</span>
                <span><strong>Escala de notas:</strong> 1–5, 0–10 ou A/B/C/D?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-perlog-orange font-bold mt-0.5">·</span>
                <span><strong>Peso das competências:</strong> fixo (50% metas + 50% competências) ou configurável por cargo?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-perlog-orange font-bold mt-0.5">·</span>
                <span><strong>Auto-avaliação:</strong> obrigatória ou opcional? Visível para o gestor antes ou depois da avaliação dele?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-perlog-orange font-bold mt-0.5">·</span>
                <span><strong>Quem cadastra colaboradores:</strong> admin RH central ou filial?</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-perlog-orange font-bold mt-0.5">·</span>
                <span><strong>PDI:</strong> texto livre ou estruturado por trilha (cursos, prazos, mentor)?</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

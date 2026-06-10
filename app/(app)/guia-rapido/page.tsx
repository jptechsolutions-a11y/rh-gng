import { TopBar } from '@/components/layout/TopBar';
import { ConectaCard } from '@/components/ui/conecta-card';
import { CheckCircle2, AlertTriangle, TrendingDown, Info } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const SECOES = [
  {
    titulo: 'Sinais positivos',
    icon: CheckCircle2,
    cor: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    itens: [
      'Demonstra interesse em crescimento interno.',
      'Busca estabilidade e desenvolvimento.',
      'Relata resolução de problemas com autonomia.',
      'Demonstra flexibilidade operacional.',
      'Possui histórico de permanência em empregos anteriores.',
      'Fala sobre trabalho em equipe e responsabilidade.',
    ],
  },
  {
    titulo: 'Pontos de atenção',
    icon: AlertTriangle,
    cor: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    itens: [
      'Demonstra interesse apenas temporário.',
      'Objetivos totalmente desconectados da vaga.',
      'Forte resistência a horários, pressão ou rotina operacional.',
      'Relatos frequentes de conflitos com liderança.',
      'Mudanças constantes de emprego sem justificativa consistente.',
      'Dificuldade para explicar experiências anteriores.',
    ],
  },
  {
    titulo: 'Indicativos de turnover precoce',
    icon: TrendingDown,
    cor: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    itens: [
      'Busca apenas "algo temporário".',
      'Expectativa incompatível com a realidade da operação.',
      'Não demonstra disponibilidade operacional.',
      'Demonstra desinteresse durante a entrevista.',
      'Já inicia o processo falando sobre saída futura.',
    ],
  },
];

export default async function GuiaRapidoPage() {
  await requireSession();
  return (
    <>
      <TopBar titulo="Guia Rápido" subtitulo="Interpretação das respostas da entrevista" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SECOES.map((s) => {
            const Icon = s.icon;
            return (
              <ConectaCard key={s.titulo}>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`h-5 w-5 ${s.cor}`} />
                    <h2 className="font-display font-semibold text-conecta-primary">{s.titulo}</h2>
                  </div>
                  <ul className="space-y-2">
                    {s.itens.map((it) => (
                      <li key={it} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm text-slate-700 ${s.bg}`}>
                        <span className={`mt-0.5 ${s.cor} shrink-0`}>•</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ConectaCard>
            );
          })}
        </div>

        <ConectaCard>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-conecta-primary" />
              <h2 className="font-display font-semibold text-conecta-primary">Observação importante</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              O objetivo da entrevista não é apenas validar experiência técnica, mas entender comportamento, disponibilidade, aderência cultural e expectativa real sobre a rotina operacional dos CDs. Uma contratação assertiva reduz turnover, melhora o clima operacional e fortalece os resultados da unidade.
            </p>
          </div>
        </ConectaCard>
      </div>
    </>
  );
}

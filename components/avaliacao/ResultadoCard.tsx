import { Card, CardContent } from '@/components/ui/card';
import { ClassificacaoBadge } from './ClassificacaoBadge';
import type { Classificacao } from '@/lib/avaliacao/calculos';

export function ResultadoCard({
  pontuacao,
  classificacao,
}: {
  pontuacao: number;
  classificacao: Classificacao;
}) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="text-4xl font-bold text-perlog-navy">
          {pontuacao.toFixed(2)}
          <span className="text-xl text-perlog-slate">/5.00</span>
        </div>
        <div className="mt-3">
          <ClassificacaoBadge value={classificacao} className="text-base px-4 py-1" />
        </div>
      </CardContent>
    </Card>
  );
}

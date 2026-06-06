import {
  Activity, Utensils, Briefcase, MessageCircle, Lightbulb, type LucideIcon,
} from 'lucide-react';
import type { PilarChave } from '@/lib/escuta/pilares-fallback';

const MAP: Record<PilarChave, LucideIcon> = {
  adaptacao:   Activity,
  alimentacao: Utensils,
  trabalho:    Briefcase,
  comunicacao: MessageCircle,
  sugestoes:   Lightbulb,
};

export function PilarIcone({
  chave, className,
}: { chave: string; className?: string }) {
  const Icon = MAP[chave as PilarChave] ?? Activity;
  return <Icon className={className} />;
}

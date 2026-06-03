import { Card, CardContent, CardTitle } from '@/components/ui/card';

export function CompetenciaCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <CardTitle className="mb-3 text-base text-perlog-navy">{titulo}</CardTitle>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}

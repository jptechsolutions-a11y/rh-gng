import Link from 'next/link';
import { Home, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-conecta-light p-8">
      <div className="max-w-md w-full text-center rounded-2xl border border-conecta-primary/10 bg-white p-10 shadow-sm">
        <div className="mx-auto grid place-items-center h-14 w-14 rounded-xl bg-conecta-primary/8 text-conecta-primary">
          <Compass className="h-7 w-7" />
        </div>
        <p className="mt-5 font-display text-5xl font-extrabold text-conecta-primary">404</p>
        <h1 className="mt-2 font-display text-lg font-bold text-conecta-primary">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-conecta-muted">
          O endereço acessado não existe ou foi movido.
        </p>
        <Button asChild variant="conecta" size="conecta" className="mt-6 w-full text-sm">
          <Link href="/inicio">
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </div>
  );
}

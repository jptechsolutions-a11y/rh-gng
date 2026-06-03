import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'RH G&G — Perlog',
  description: 'Sistema de entrevistas e banco de talentos do Grupo Perlog',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased flex flex-col">
        <div className="flex-1 flex flex-col">
          <Providers>{children}</Providers>
        </div>
        <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-perlog-slate">
          Desenvolvido por <span className="font-semibold text-perlog-navy">Juliano Patrick</span> · Grupo Perlog — Gente &amp; Gestão
        </footer>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

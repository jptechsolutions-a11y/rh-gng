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
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

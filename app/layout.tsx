import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WEM — Wrestling Events Manager',
  description: 'Gestión financiera de eventos de wrestling',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

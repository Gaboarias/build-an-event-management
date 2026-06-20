import type { Metadata, Viewport } from 'next';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import AccountBar from '@/components/AccountBar';

export const metadata: Metadata = {
  title: 'WEM — Wrestling Event Manager',
  description: 'Gestión financiera de eventos de wrestling',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AccountBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';

import './globals.css';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'EmploymentX',
  description: 'Production-grade employment platform',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

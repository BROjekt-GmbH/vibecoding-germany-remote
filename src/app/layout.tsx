import type { Metadata } from 'next';
import './globals.css';

import { Header } from '@/components/layout/header';
import { FooterBar } from '@/components/layout/footer-bar';
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { ToastProvider } from '@/components/layout/toast';
import { WorkspaceOverlay } from '@/components/panels/workspace-overlay';
import { getUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'VCG Remote',
  description: 'Selbst-gehostetes tmux-Dashboard fuer Remote-Hosts',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VCG Remote',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <html lang="de" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#060809" />
      </head>
      <body>
        <ToastProvider>
          <Header user={user} />
          <FooterBar />
          <BottomTabBar />
          <WorkspaceOverlay />

          {/* Main content area */}
          <main
            style={{
              paddingTop: 'var(--header-height)',
              paddingLeft: 0,
              paddingBottom: 'var(--bottom-bar-height)',
              minHeight: '100vh',
              background: 'var(--bg-base)',
            }}
          >
            <div className="p-4 md:p-6">
              {children}
            </div>
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}

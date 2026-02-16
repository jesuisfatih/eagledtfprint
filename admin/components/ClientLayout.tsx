'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ToastContainer } from '@/components/ui';
import { AuthProvider } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const PUBLIC_PATHS = ['/login'];

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/design-approval');

  if (isPublicPath) {
    return (
      <AuthProvider>
        {children}
        <ToastContainer />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="app-main">
          <Header />
          <div className="app-content">
            {children}
          </div>
        </div>
      </div>
      <ToastContainer />
    </AuthProvider>
  );
}

'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/auth-context';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { ToastContainer } from '@/components/ui';

const PUBLIC_PATHS = ['/login'];

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

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

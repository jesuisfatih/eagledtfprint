'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ToastContainer } from '@/components/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const publicRoutes = ['/login', '/register', '/request-invitation', '/forgot-password', '/reset-password', '/qrpickup'];

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) checkAuth();
  }, [pathname, mounted]);

  const checkAuth = () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('eagle_token');
    const userId = localStorage.getItem('eagle_userId');
    const companyId = localStorage.getItem('eagle_companyId');
    const authenticated = !!(token && userId && companyId);
    setIsAuthenticated(authenticated);
    const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
    if (!authenticated && !isPublicRoute && mounted) router.push('/login');
  };

  if (!mounted) return <>{children}</>;

  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
  const isLanding = pathname === '/';

  if (isPublicRoute || isLanding) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>{children}</div>;
  }

  if (isAuthenticated === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-apple" />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header />
        <div className="app-content">{children}</div>
      </div>
      <ToastContainer />
    </div>
  );
}

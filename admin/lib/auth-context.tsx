'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  merchantId: string | null;
  loading: boolean;
  login: (token: string, merchantId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ['/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check auth status on mount
    const token = localStorage.getItem('eagle_admin_token');
    const storedMerchantId = localStorage.getItem('eagle_merchantId');
    
    if (token && storedMerchantId) {
      setIsAuthenticated(true);
      setMerchantId(storedMerchantId);
    } else if (!PUBLIC_PATHS.includes(pathname)) {
      // Redirect to login if not authenticated and not on a public path
      router.push('/login');
    }
    
    setLoading(false);
  }, [pathname, router]);

  const login = (token: string, merchantId: string) => {
    localStorage.setItem('eagle_admin_token', token);
    localStorage.setItem('eagle_merchantId', merchantId);
    setIsAuthenticated(true);
    setMerchantId(merchantId);
  };

  const logout = () => {
    localStorage.removeItem('eagle_admin_token');
    localStorage.removeItem('eagle_merchantId');
    setIsAuthenticated(false);
    setMerchantId(null);
    router.push('/login');
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // If not authenticated and not on public path, don't render children
  if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, merchantId, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

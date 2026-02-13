'use client';

import { useTheme } from '@/components/ThemeProvider';
import { accountsFetch } from '@/lib/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function Header() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [cartCount, setCartCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCartCount();
    loadUserInfo();
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.header-search input') as HTMLInputElement;
        searchInput?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadCartCount = async () => {
    try {
      const token = localStorage.getItem('eagle_token');
      const companyId = localStorage.getItem('eagle_companyId');
      const userId = localStorage.getItem('eagle_userId');
      if (!token || !companyId || !userId) return;
      const response = await accountsFetch(`/api/v1/carts/active?companyId=${companyId}&userId=${userId}`);
      if (response.ok && response.status !== 204) {
        const cart = await response.json();
        setCartCount(cart?.items?.length || 0);
      }
    } catch { setCartCount(0); }
  };

  const loadUserInfo = () => {
    const name = localStorage.getItem('eagle_userName') || '';
    const email = localStorage.getItem('eagle_userEmail') || '';
    setUserName(name || email.split('@')[0] || 'U');
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('eagle_token');
      localStorage.removeItem('eagle_userId');
      localStorage.removeItem('eagle_companyId');
      localStorage.removeItem('eagle_userEmail');
      localStorage.removeItem('eagle_userName');
      localStorage.removeItem('eagle_loginTime');
      sessionStorage.removeItem('eagle_token');
      sessionStorage.removeItem('eagle_checkout_autofill');
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('eagle_auth_db', 2);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const tx = db.transaction(['auth_store'], 'readwrite');
        const store = tx.objectStore('auth_store');
        await new Promise<void>((resolve, reject) => { const r = store.clear(); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
      } catch { /* ignore */ }
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const ch = new BroadcastChannel('eagle_auth');
        ch.postMessage({ type: 'logout', timestamp: Date.now() });
        ch.close();
      }
    } catch { /* ignore */ }
    router.push('/login');
  };

  const initials = userName ? userName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <header className="apple-header">
      <div className="header-search">
        <i className="ti ti-search header-search-icon" />
        <input placeholder="Search products..." onKeyDown={e => {
          if (e.key === 'Enter') router.push(`/products?search=${(e.target as HTMLInputElement).value}`);
        }} />
        <kbd style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 4,
          background: 'var(--bg-hover)', color: 'var(--text-quaternary)',
          border: '1px solid var(--border)', fontFamily: 'inherit', fontWeight: 600,
          marginLeft: 'auto', whiteSpace: 'nowrap',
        }}>⌘K</kbd>
      </div>

      <div className="header-actions">
        {/* Theme Toggle */}
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <i className="ti ti-sun icon-sun" />
          <i className="ti ti-moon icon-moon" />
        </button>

        <Link href="/cart" className="header-action-btn">
          <i className="ti ti-shopping-cart" />
          {cartCount > 0 && <span className="header-badge">{cartCount}</span>}
        </Link>
        <Link href="/notifications" className="header-action-btn">
          <i className="ti ti-bell" />
        </Link>
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div className="header-avatar" onClick={() => setShowDropdown(!showDropdown)}>
            {initials}
          </div>
          <div className={`apple-dropdown ${showDropdown ? 'open' : ''}`}>
            <Link href="/profile" className="dropdown-item-apple" onClick={() => setShowDropdown(false)}>
              <i className="ti ti-user" /> Profile
            </Link>
            <Link href="/team" className="dropdown-item-apple" onClick={() => setShowDropdown(false)}>
              <i className="ti ti-users" /> Team
            </Link>
            <div className="dropdown-divider-apple" />
            <button className="dropdown-item-apple danger" onClick={handleLogout}>
              <i className="ti ti-logout" /> Log Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

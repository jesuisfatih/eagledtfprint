'use client';

import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = (e.target as HTMLInputElement).value;
      if (query.trim()) {
        window.location.href = `/companies?search=${encodeURIComponent(query)}`;
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('eagle_admin_token');
    localStorage.removeItem('eagle_merchantId');
    window.location.href = '/login';
  };

  return (
    <header className="apple-header">
      <div className="header-search">
        <i className="ti ti-search header-search-icon" />
        <input
          type="text"
          placeholder="Search companies, orders..."
          onKeyDown={handleSearch}
        />
        <kbd style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 4,
          background: 'var(--bg-hover)', color: 'var(--text-quaternary)',
          border: '1px solid var(--border-primary)', fontFamily: 'inherit', fontWeight: 600,
          marginLeft: 'auto', whiteSpace: 'nowrap',
        }}>⌘K</kbd>
      </div>

      <div className="header-actions">
        {/* Theme Toggle */}
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <i className="ti ti-sun icon-sun" />
          <i className="ti ti-moon icon-moon" />
        </button>

        <button className="header-action-btn">
          <i className="ti ti-bell" />
        </button>

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            className="header-avatar"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            AD
          </div>

          <div className={`apple-dropdown ${showDropdown ? 'open' : ''}`}>
            <Link href="/settings" className="dropdown-item-apple" onClick={() => setShowDropdown(false)}>
              <i className="ti ti-settings" style={{ fontSize: 16 }} />
              Settings
            </Link>
            <div className="dropdown-divider-apple" />
            <button className="dropdown-item-apple danger" onClick={handleLogout}>
              <i className="ti ti-logout" style={{ fontSize: 16 }} />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

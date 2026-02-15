'use client';

import { config } from '@/lib/config';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
  title: string;
  icon: string;
  href: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: '',
    items: [
      { title: 'Dashboard', icon: 'ti-smart-home', href: '/dashboard' },
    ],
  },
  {
    label: 'Business',
    items: [
      { title: 'Companies', icon: 'ti-building', href: '/companies' },
      { title: 'Users', icon: 'ti-users', href: '/users' },
      { title: 'Customer Intelligence', icon: 'ti-brain', href: '/customers' },
      { title: 'Company Intelligence', icon: 'ti-chart-bubble', href: '/company-intelligence' },
      { title: 'Customer Journey', icon: 'ti-route', href: '/customer-journey' },
      { title: 'Orders', icon: 'ti-shopping-cart', href: '/orders' },
      { title: 'Quotes', icon: 'ti-file-invoice', href: '/quotes' },
      { title: 'Invoices', icon: 'ti-receipt', href: '/invoices' },
      { title: 'Pickup', icon: 'ti-package-import', href: '/pickup' },
      { title: 'Abandoned Carts', icon: 'ti-shopping-cart-off', href: '/abandoned-carts' },
      { title: 'Offers', icon: 'ti-discount-2', href: '/offers' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { title: 'Products', icon: 'ti-package', href: '/catalog' },
      { title: 'Pricing Rules', icon: 'ti-discount', href: '/pricing' },
    ],
  },
  {
    label: 'Campaigns',
    items: [
      { title: 'Segments', icon: 'ti-filter', href: '/segments' },
      { title: 'Campaigns', icon: 'ti-speakerphone', href: '/campaigns' },
      { title: 'Data Sync', icon: 'ti-refresh', href: '/data-sync' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { title: 'Live Visitors', icon: 'ti-antenna-bars-5', href: '/live' },
      { title: 'Marketing', icon: 'ti-ad-2', href: '/marketing' },
      { title: 'Analytics', icon: 'ti-chart-line', href: '/analytics' },
      { title: 'Fingerprint Intel', icon: 'ti-fingerprint', href: '/fingerprint' },
      { title: 'Reports', icon: 'ti-file-analytics', href: '/reports' },
      { title: 'Activity', icon: 'ti-activity', href: '/activity' },
      { title: 'Sessions', icon: 'ti-device-desktop', href: '/sessions' },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Settings', icon: 'ti-settings', href: '/settings' },
      { title: 'Webhooks', icon: 'ti-webhook', href: '/webhooks' },
      { title: 'Integrations', icon: 'ti-plug', href: '/integrations' },
      { title: 'API Keys', icon: 'ti-key', href: '/api-keys' },
    ],
  },
  {
    label: 'Support',
    items: [
      { title: 'Support Tickets', icon: 'ti-help', href: '/support' },
    ],
  },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (pathname.startsWith(href + '/')) return true;
  return false;
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="apple-sidebar">
      <Link href="/dashboard" className="sidebar-brand" style={{ textDecoration: 'none' }}>
        <div className="sidebar-brand-logo">🦅</div>
        <span className="sidebar-brand-text">{config.brandName}</span>
      </Link>

      <nav className="sidebar-nav">
        {menuGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="sidebar-group-label">{group.label}</div>
            )}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {group.items.map((item) => (
                <li key={item.href} className="sidebar-item">
                  <Link
                    href={item.href}
                    className={`sidebar-link ${isActive(pathname, item.href) ? 'active' : ''}`}
                  >
                    <i className={`ti ${item.icon} sidebar-icon`} />
                    <span>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

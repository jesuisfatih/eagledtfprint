'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { group: 'Main', items: [
    { title: 'Dashboard', icon: 'ti-home', href: '/dashboard' },
    { title: 'Products', icon: 'ti-shopping-bag', href: '/products' },
  ]},
  { group: 'Orders', items: [
    { title: 'Cart', icon: 'ti-shopping-cart', href: '/cart' },
    { title: 'Orders', icon: 'ti-package', href: '/orders' },
    { title: 'Pickup', icon: 'ti-package-import', href: '/pickup' },
    { title: 'Quotes', icon: 'ti-file-invoice', href: '/quotes' },
    { title: 'Invoices', icon: 'ti-receipt', href: '/invoices' },
    { title: 'Abandoned Carts', icon: 'ti-shopping-cart-off', href: '/abandoned-carts' },
  ]},
  { group: 'Account', items: [
    { title: 'Team', icon: 'ti-users', href: '/team' },
    { title: 'Profile', icon: 'ti-user-circle', href: '/profile' },
    { title: 'Addresses', icon: 'ti-map-pin', href: '/addresses' },
    { title: 'Wishlist', icon: 'ti-heart', href: '/wishlist' },
  ]},
  { group: 'Help', items: [
    { title: 'Notifications', icon: 'ti-bell', href: '/notifications' },
    { title: 'Support', icon: 'ti-help', href: '/support' },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="apple-sidebar">
      <Link href="/dashboard" className="sidebar-brand">
        <div className="sidebar-brand-logo">🦅</div>
        <span className="sidebar-brand-text">EAGLE SYSTEM</span>
      </Link>
      <nav className="sidebar-nav">
        {menuItems.map(group => (
          <div key={group.group}>
            <div className="sidebar-group-label">{group.group}</div>
            {group.items.map(item => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}>
                  <i className={`ti ${item.icon} sidebar-icon`} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

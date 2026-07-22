'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/admin/users', label: 'Usuários' },
  { href: '/admin/clube-outrahora', label: 'Clube Outrahora' },
  { href: '/admin/transfers', label: 'Transferências' },
];

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="admin-module-navigation" aria-label="Navegação do Painel Master">
      {items.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-module-navigation__link${active ? ' admin-module-navigation__link--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}

      <style jsx>{`
        .admin-module-navigation {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .admin-module-navigation__link {
          color: #777;
          border: 1px solid #252525;
          border-radius: 9px;
          padding: 7px 11px;
          text-decoration: none;
          font-size: 13px;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
        }

        .admin-module-navigation__link:hover {
          color: #aaa;
          border-color: #333;
          background: #151515;
        }

        .admin-module-navigation__link--active,
        .admin-module-navigation__link--active:hover {
          color: #67bed9;
          border-color: #29414b;
          background: #0d1e28;
        }
      `}</style>
    </nav>
  );
}

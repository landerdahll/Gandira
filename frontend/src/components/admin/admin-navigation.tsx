'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CSSProperties, useState } from 'react';

const items = [
  { href: '/admin/users', label: 'Usuários' },
  { href: '/admin/clube-outrahora', label: 'Clube Outrahora' },
  { href: '/admin/transfers', label: 'Transferências' },
];

export function AdminNavigation() {
  const pathname = usePathname();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  return (
    <nav className="master-navigation" style={navigationStyle} aria-label="Navegação do Painel Master">
      {items.map((item) => {
        const active = pathname === item.href;
        const hovered = hoveredHref === item.href;

        return (
          <Link
            className={`master-navigation-link ${active ? 'master-navigation-link--active' : ''}`}
            key={item.href}
            href={item.href}
            style={{
              ...linkStyle,
              ...(hovered && !active ? hoveredLinkStyle : {}),
              ...(active ? activeLinkStyle : {}),
            }}
            aria-current={active ? 'page' : undefined}
            onMouseEnter={() => setHoveredHref(item.href)}
            onMouseLeave={() => setHoveredHref(null)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const navigationStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const linkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#777',
  background: 'transparent',
  border: '1px solid #252525',
  borderRadius: 9,
  padding: '7px 11px',
  textDecoration: 'none',
  fontSize: 13,
  lineHeight: 1.4,
  transition: 'color 0.15s, border-color 0.15s, background 0.15s',
};

const hoveredLinkStyle: CSSProperties = {
  color: '#aaa',
  borderColor: '#333',
  background: '#151515',
};

const activeLinkStyle: CSSProperties = {
  color: '#fff',
  borderColor: '#67bed9',
  background: '#67bed9',
};

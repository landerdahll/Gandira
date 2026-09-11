'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LogOut, UserCircle, LayoutDashboard, QrCode, Menu, X, ChevronDown, ShieldCheck, Ticket, Moon, Sun, Building2, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/components/providers/theme-provider';
import { BrandMark } from '@/components/brand/brand-mark';
import { useOrganization } from '@/lib/organization-context';
import { eventsApi } from '@/lib/api';

export function Navbar() {
  const isHome = usePathname() === '/';
  const { user, logout, isAdmin, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { active, organizations, canManageEvents, canCheckIn } = useOrganization();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, []);

  return (
    <header className="theme-navbar" data-public-home={isHome ? 'true' : undefined} style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(10,10,10,0.96)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid #1a1a1a',
    }}>
      {/* ── Bar ─────────────────────────────────────────────────────────── */}
      <div className="navbar-inner" style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <BrandMark lightBackground="brand" style={{ height: '63.4725px', objectFit: 'contain', display: 'block' }} />
        </Link>

        {isHome && (
          <EventSearch />
        )}

        {/* ── Desktop right side ─────────────────────────────────────── */}
        {!loading && (
          <div className="nav-desktop" style={{ alignItems: 'center', gap: '4px' }}>
            <NavItem href={isHome ? '/#home-events' : '/'}>{isHome ? 'Explorar' : 'Ver eventos'}</NavItem>
            <div className="nav-divider" style={{ width: '1px', height: '20px', background: '#2a2a2a', margin: '0 8px' }} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            {user ? (
              <>
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button
                    className="nav-user-button"
                    onClick={() => setDropdownOpen(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '6px 10px 6px 6px', borderRadius: '999px',
                      border: '1px solid #2a2a2a', background: 'transparent',
                      cursor: 'pointer', color: '#ccc', fontSize: '14px',
                      fontWeight: 500, whiteSpace: 'nowrap',
                    }}
                  >
                    <Avatar user={user} size={28} />
                    <span className="nav-user-name">{user.name.split(' ')[0]}</span>
                    <ChevronDown size={13} style={{
                      opacity: 0.5,
                      transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }} />
                  </button>

                  {dropdownOpen && (
                    <div className="user-dropdown" style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      minWidth: '200px', background: '#141414',
                      border: '1px solid #252525', borderRadius: '14px',
                      padding: '6px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 200,
                    }}>
                      <DropItem href="/profile" icon={<UserCircle size={14} />} onClick={() => setDropdownOpen(false)}>Meu perfil</DropItem>
                      {organizations.length > 0 && <DropItem href="/organization" icon={<Building2 size={14} />} onClick={() => setDropdownOpen(false)}>Organização</DropItem>}
                      {canManageEvents && <DropItem href="/producer/dashboard" icon={<LayoutDashboard size={14} />} onClick={() => setDropdownOpen(false)}>Dashboard</DropItem>}
                      {canCheckIn && <DropItem href="/checkin" icon={<QrCode size={14} />} onClick={() => setDropdownOpen(false)}>Check-in</DropItem>}
                      {isAdmin && <DropItem href="/admin/users" icon={<ShieldCheck size={14} />} onClick={() => setDropdownOpen(false)}>Painel Master</DropItem>}
                      <div style={{ height: '1px', background: '#222', margin: '4px 0' }} />
                      <button
                        className="user-dropdown-logout"
                        onClick={() => { setDropdownOpen(false); logout(); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          width: '100%', padding: '8px 10px', borderRadius: '8px',
                          border: 'none', background: 'transparent', cursor: 'pointer',
                          color: '#888', fontSize: '14px', textAlign: 'left',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#67bed9'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}
                      >
                        <LogOut size={14} /> Sair da conta
                      </button>
                    </div>
                  )}
                </div>

                <Link className="nav-primary-action" href="/my-tickets" style={{
                  marginLeft: '8px', padding: '9px 20px', borderRadius: '999px',
                  background: '#67bed9', color: '#fff', fontSize: '14px',
                  fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  Ver ingressos
                </Link>
              </>
            ) : (
              <>
                <Link className="nav-login-link" href="/auth/login" style={{
                  padding: '9px 16px', borderRadius: '8px', color: '#aaa',
                  fontSize: '14px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
                }}>
                  {isHome ? 'Entrar' : 'Login'}
                </Link>
                {theme === 'light' && (
                  <Link className="nav-primary-action nav-register-link" href="/auth/register" style={{
                    marginLeft: '4px', padding: '9px 20px', borderRadius: '999px',
                    background: '#67bed9', color: '#fff', fontSize: '14px',
                    fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    Criar conta
                  </Link>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Mobile right side: avatar/login + hamburger ─────────────── */}
        {!loading && (
          <div className="nav-mobile" style={{ alignItems: 'center', gap: '10px' }}>

            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            {user ? (
              /* Avatar compacto — abre menu mobile */
              <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <Avatar user={user} size={34} />
              </Link>
            ) : (
              /* Botão "Entrar" compacto */
              <Link className="nav-mobile-login" href="/auth/login" style={{
                padding: '7px 14px', borderRadius: '999px',
                background: '#1a1a1a', border: '1px solid #2a2a2a',
                color: '#ccc', fontSize: '13px', fontWeight: 600,
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}>
                Entrar
              </Link>
            )}

            {/* Hamburger */}
            <button
              className="nav-menu-toggle"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileOpen}
              aria-controls="navbar-mobile-menu"
              onClick={() => setMobileOpen(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#888', padding: '4px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          id="navbar-mobile-menu"
          className="nav-drawer"
          style={{ borderTop: '1px solid #1a1a1a', background: '#0d0d0d', padding: '8px 16px 20px' }}
        >
          {user && (
            <>
              {/* User info row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 8px 14px', marginBottom: '4px',
                borderBottom: '1px solid #1a1a1a',
              }}>
                <Avatar user={user} size={40} />
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>{user.name.split(' ')[0]}</p>
                  <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>{user.email}</p>
                </div>
              </div>
            </>
          )}

          <MobItem href="/" onClick={() => setMobileOpen(false)}>Ver eventos</MobItem>

          {user ? (
            <>
              <MobItem href="/my-tickets" onClick={() => setMobileOpen(false)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Ticket size={15} color="#67bed9" /> Meus ingressos
                </span>
              </MobItem>
              <MobItem href="/profile" onClick={() => setMobileOpen(false)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCircle size={15} color="#555" /> Meu perfil
                </span>
              </MobItem>
              {organizations.length > 0 && <MobItem href="/organization" onClick={() => setMobileOpen(false)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={15} color="#555"/> Organização</span></MobItem>}
              {canManageEvents && (
                <MobItem href="/producer/dashboard" onClick={() => setMobileOpen(false)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutDashboard size={15} color="#555" /> Dashboard
                  </span>
                </MobItem>
              )}
              {canCheckIn && (
                <MobItem href="/checkin" onClick={() => setMobileOpen(false)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <QrCode size={15} color="#555" /> Check-in
                  </span>
                </MobItem>
              )}
              {isAdmin && (
                <MobItem href="/admin/users" onClick={() => setMobileOpen(false)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={15} color="#555" /> Painel Master
                  </span>
                </MobItem>
              )}
              <div style={{ height: '1px', background: '#1e1e1e', margin: '8px 0' }} />
              <button
                onClick={() => { setMobileOpen(false); logout(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 12px', width: '100%',
                  border: 'none', background: 'transparent',
                  color: '#666', fontSize: '15px', cursor: 'pointer', borderRadius: '10px',
                }}
              >
                <LogOut size={15} /> Sair da conta
              </button>
            </>
          ) : (
            <>
              <div style={{ height: '1px', background: '#1e1e1e', margin: '8px 0' }} />
              <MobItem href="/auth/login" onClick={() => setMobileOpen(false)}>Login</MobItem>
              {theme === 'light' && <MobItem href="/auth/register" onClick={() => setMobileOpen(false)}>Criar conta</MobItem>}
            </>
          )}
        </div>
      )}
    </header>
  );
}

type SearchEvent = {
  id: string;
  title: string;
  slug: string;
  coverImage?: string | null;
  venue?: string | null;
  city?: string | null;
  startDate: string;
  batches?: Array<{ price: number | string }>;
};

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

function EventSearch() {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  useEffect(() => {
    const normalized = normalizeSearch(query);
    if (normalized.length < 2) {
      setOpen(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setOpen(true);
      if (!loadedRef.current) {
        setLoading(true);
        try {
          const response = await eventsApi.list({ limit: 100 });
          const rows = (response.data?.data ?? response.data ?? []) as SearchEvent[];
          setEvents(rows);
          loadedRef.current = true;
        } catch {
          setEvents([]);
        } finally {
          setLoading(false);
        }
      }
    }, 260);
    return () => window.clearTimeout(timer);
  }, [query]);

  const normalized = normalizeSearch(query);
  const results = events.filter(event => normalizeSearch(`${event.title} ${event.venue ?? ''} ${event.city ?? ''}`).includes(normalized)).slice(0, 6);

  return (
    <div ref={searchRef} className="pago-nav-search-wrap">
      <form className="pago-nav-search" action="/" method="get" role="search" onSubmit={() => setOpen(false)}>
        <input
          type="search"
          name="search"
          aria-label="Buscar eventos"
          placeholder="Buscar evento, artista ou cidade"
          value={query}
          onChange={event => setQuery(event.target.value)}
          onFocus={() => { if (normalized.length >= 2) setOpen(true); }}
        />
        <button type="submit" aria-label="Buscar eventos"><Search size={18} aria-hidden="true" /></button>
      </form>
      {open && (
        <div className="pago-nav-search-results" role="listbox" aria-label="Resultados de eventos">
          {loading ? <p className="pago-nav-search-empty">Buscando eventos...</p> : results.length > 0 ? results.map(event => {
            const price = event.batches?.length ? Math.min(...event.batches.map(batch => Number(batch.price)).filter(Number.isFinite)) : null;
            return (
              <Link key={event.id} href={`/events/${event.slug}`} className="pago-nav-search-result" onClick={() => setOpen(false)} role="option">
                <span className="pago-nav-search-result__thumb">
                  {event.coverImage ? <img src={event.coverImage} alt="" /> : <span>P</span>}
                </span>
                <span className="pago-nav-search-result__copy">
                  <strong>{event.title}</strong>
                  <small>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(event.startDate))} · {event.venue || event.city}</small>
                  {price !== null && <small className="pago-nav-search-result__price">A partir de {price === 0 ? 'Grátis' : `R$ ${price.toFixed(2).replace('.', ',')}`}</small>}
                </span>
              </Link>
            );
          }) : <p className="pago-nav-search-empty">Nenhum evento encontrado.</p>}
        </div>
      )}
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }) {
  const nextTheme = theme === 'dark' ? 'claro' : 'escuro';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Ativar modo ${nextTheme}`}
      title={`Ativar modo ${nextTheme}`}
    >
      <Sun className="theme-toggle-icon theme-toggle-icon--dark" size={17} />
      <Moon className="theme-toggle-icon theme-toggle-icon--light" size={17} />
    </button>
  );
}

function Avatar({ user, size }: { user: { name: string; avatarUrl?: string | null }; size: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [user.avatarUrl]);

  if (user.avatarUrl && !imageFailed) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        onError={() => setImageFailed(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #67bed955' }}
      />
    );
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: '#67bed9', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.42) + 'px', fontWeight: 800, flexShrink: 0,
    }}>
      {user.name.charAt(0).toUpperCase()}
    </span>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      className="nav-events-link"
      href={href}
      style={{ padding: '8px 14px', borderRadius: '8px', color: '#aaa', fontSize: '14px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
    >
      {children}
    </Link>
  );
}

function DropItem({ href, icon, children, onClick }: { href: string; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      className="user-dropdown-item"
      href={href}
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', color: '#aaa', fontSize: '14px', textDecoration: 'none' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
    >
      {icon}{children}
    </Link>
  );
}

function MobItem({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{ display: 'block', padding: '12px 12px', borderRadius: '10px', color: '#aaa', fontSize: '15px', textDecoration: 'none' }}
    >
      {children}
    </Link>
  );
}

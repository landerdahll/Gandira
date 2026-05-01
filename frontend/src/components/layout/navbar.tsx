'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { LogOut, UserCircle, LayoutDashboard, QrCode, Menu, X, ChevronDown, ShieldCheck, Ticket } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function Navbar() {
  const { user, logout, isProducer, isStaff, isAdmin, loading } = useAuth();
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
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(10,10,10,0.96)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid #1a1a1a',
    }}>
      {/* ── Bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 16px',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <img src="/gandira-logo.png" alt="Gandira" style={{ height: '31px', objectFit: 'contain', display: 'block' }} />
        </Link>

        {/* ── Desktop right side ─────────────────────────────────────── */}
        {!loading && (
          <div className="nav-desktop" style={{ alignItems: 'center', gap: '4px' }}>
            <NavItem href="/">Ver eventos</NavItem>
            <NavItem href="/sobre">Sobre</NavItem>
            <div style={{ width: '1px', height: '20px', background: '#2a2a2a', margin: '0 8px' }} />

            {user ? (
              <>
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button
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
                    {user.name.split(' ')[0]}
                    <ChevronDown size={13} style={{
                      opacity: 0.5,
                      transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }} />
                  </button>

                  {dropdownOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      minWidth: '200px', background: '#141414',
                      border: '1px solid #252525', borderRadius: '14px',
                      padding: '6px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 200,
                    }}>
                      <DropItem href="/profile" icon={<UserCircle size={14} />} onClick={() => setDropdownOpen(false)}>Meu perfil</DropItem>
                      {isProducer && <DropItem href="/producer/dashboard" icon={<LayoutDashboard size={14} />} onClick={() => setDropdownOpen(false)}>Dashboard</DropItem>}
                      {isStaff && <DropItem href="/checkin" icon={<QrCode size={14} />} onClick={() => setDropdownOpen(false)}>Check-in</DropItem>}
                      {isAdmin && <DropItem href="/admin/users" icon={<ShieldCheck size={14} />} onClick={() => setDropdownOpen(false)}>Painel Master</DropItem>}
                      <div style={{ height: '1px', background: '#222', margin: '4px 0' }} />
                      <button
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

                <Link href="/my-tickets" style={{
                  marginLeft: '8px', padding: '9px 20px', borderRadius: '999px',
                  background: '#67bed9', color: '#fff', fontSize: '14px',
                  fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  Ver ingressos
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login" style={{
                  padding: '9px 16px', borderRadius: '8px', color: '#aaa',
                  fontSize: '14px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
                }}>
                  Login
                </Link>
                <Link href="/auth/register" style={{
                  marginLeft: '4px', padding: '9px 20px', borderRadius: '999px',
                  background: '#67bed9', color: '#fff', fontSize: '14px',
                  fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  Criar conta
                </Link>
              </>
            )}
          </div>
        )}

        {/* ── Mobile right side: avatar/login + hamburger ─────────────── */}
        {!loading && (
          <div className="nav-mobile" style={{ alignItems: 'center', gap: '10px' }}>

            {user ? (
              /* Avatar compacto — abre menu mobile */
              <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <Avatar user={user} size={34} />
              </Link>
            ) : (
              /* Botão "Entrar" compacto */
              <Link href="/auth/login" style={{
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
              {isProducer && (
                <MobItem href="/producer/dashboard" onClick={() => setMobileOpen(false)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutDashboard size={15} color="#555" /> Dashboard
                  </span>
                </MobItem>
              )}
              {isStaff && (
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
              <Link
                href="/auth/register"
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block', marginTop: '8px', padding: '14px',
                  borderRadius: '14px', background: '#67bed9',
                  color: '#fff', fontWeight: 700, fontSize: '15px',
                  textAlign: 'center', textDecoration: 'none',
                }}
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function Avatar({ user, size }: { user: { name: string; avatarUrl?: string | null }; size: number }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
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

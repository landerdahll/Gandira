'use client';

import { useEffect, useState, useRef } from 'react';
import { adminApi } from '@/lib/api';
import { Search, Users, ShieldCheck, UserCheck, Phone, Calendar, Mail, ChevronDown, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Masculino',
  FEMALE: 'Feminino',
  OTHER: 'Outro',
  PREFER_NOT_TO_SAY: 'Não informado',
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:    { label: 'Admin',    color: '#ff6b6b', bg: '#220000' },
  PRODUCER: { label: 'Produtor', color: '#67bed9', bg: '#0d1e28' },
  STAFF:    { label: 'Staff',    color: '#88aaff', bg: '#001133' },
  CUSTOMER: { label: 'Membro',   color: '#888',    bg: '#1a1a1a' },
};

type RoleFilter = 'ALL' | 'CUSTOMER' | 'STAFF' | 'PRODUCER';

const FILTER_TABS: { key: RoleFilter; label: string }[] = [
  { key: 'ALL',      label: 'Todos'    },
  { key: 'CUSTOMER', label: 'Membros'  },
  { key: 'STAFF',    label: 'Staff'    },
  { key: 'PRODUCER', label: 'Produtor' },
];

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function calcAge(birthDate?: string | null) {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, lastPage: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [acting, setActing] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  async function load(page = 1, q = search, role = roleFilter) {
    setLoading(true);
    try {
      const params: any = { page, limit: 50 };
      if (q) params.search = q;
      if (role !== 'ALL') params.role = role;
      const res = await adminApi.listUsers(params);
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1, '', 'ALL'); }, []);

  useEffect(() => {
    if (!openMenu) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-role-menu]')) setOpenMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openMenu]);

  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, value, roleFilter), 400);
  }

  function handleFilter(role: RoleFilter) {
    setRoleFilter(role);
    load(1, search, role);
  }

  async function handleAction(id: string, action: 'producer' | 'staff' | 'demote') {
    setActing(id);
    setOpenMenu(null);
    const labels = { producer: 'Produtor', staff: 'Staff', demote: 'Membro' };
    try {
      if (action === 'producer') await adminApi.promoteProducer(id);
      else if (action === 'staff') await adminApi.promoteStaff(id);
      else await adminApi.demote(id);
      toast.success(`Cargo alterado para ${labels[action]}!`);
      load(meta.page);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao alterar cargo');
    } finally {
      setActing(null);
    }
  }

  async function handleResetPassword(id: string, name: string) {
    setActing(id);
    setOpenMenu(null);
    try {
      await adminApi.resetPassword(id);
      toast.success(`Senha de ${name} redefinida para: Senha@123`);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao redefinir senha');
    } finally {
      setActing(null);
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div className="admin-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <ShieldCheck size={20} color="#67bed9" />
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>Painel Master</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#555' }}>
              {meta.total} usuário{meta.total !== 1 ? 's' : ''} encontrado{meta.total !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Search */}
          <div className="admin-search-input" style={{ position: 'relative' }}>
            <Search size={15} color="#555" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou celular..."
              style={{
                width: '100%', padding: '10px 14px 10px 36px',
                background: '#141414', border: '1px solid #252525', borderRadius: '12px',
                color: '#fff', fontSize: '14px', outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
              onBlur={e => (e.currentTarget.style.borderColor = '#252525')}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="admin-filter-tabs" style={{ display: 'flex', gap: '6px' }}>
          {FILTER_TABS.map(tab => {
            const active = roleFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleFilter(tab.key)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '999px',
                  border: active ? '1px solid #67bed955' : '1px solid #252525',
                  background: active ? '#0d1e28' : 'transparent',
                  color: active ? '#67bed9' : '#555',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.borderColor = '#333'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#252525'; } }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: '72px', borderRadius: '14px', background: '#141414' }} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Users size={36} color="#333" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#555' }}>Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {users.map(user => {
            const role = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.CUSTOMER;
            const age = calcAge(user.birthDate);
            return (
              <div key={user.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '12px',
                alignItems: 'center',
                padding: '16px 20px',
                background: '#141414',
                border: '1px solid #1e1e1e',
                borderRadius: '14px',
              }}>
                {/* Left: user info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '16px', alignItems: 'center', minWidth: 0 }}>
                  {/* Avatar */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: '#1e1e1e', border: `2px solid ${role.color}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: role.color }}>
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{user.name}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '999px',
                        background: role.bg, color: role.color,
                        fontSize: '11px', fontWeight: 600,
                      }}>
                        {role.label}
                      </span>
                      {!user.isActive && (
                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#220000', color: '#ff6b6b', fontSize: '11px', fontWeight: 600 }}>
                          Inativo
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <InfoPill icon={<Mail size={11} />}>{user.email}</InfoPill>
                      {user.phone && <InfoPill icon={<Phone size={11} />}>{user.phone}</InfoPill>}
                      {user.gender && <InfoPill icon={<UserCheck size={11} />}>{GENDER_LABELS[user.gender] ?? user.gender}</InfoPill>}
                      {user.birthDate && (
                        <InfoPill icon={<Calendar size={11} />}>
                          {fmtDate(user.birthDate)}{age !== null ? ` (${age} anos)` : ''}
                        </InfoPill>
                      )}
                      <InfoPill icon={<Calendar size={11} />}>
                        Cadastrado em {fmtDate(user.createdAt)}
                      </InfoPill>
                      {user._count?.orders > 0 && (
                        <InfoPill icon={null} highlight>
                          {user._count.orders} pedido{user._count.orders !== 1 ? 's' : ''}
                        </InfoPill>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: actions — skip ADMIN */}
                {user.role !== 'ADMIN' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {/* Reset password button */}
                    <button
                      onClick={() => handleResetPassword(user.id, user.name)}
                      disabled={acting === user.id}
                      title="Redefinir senha para Senha@123"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '7px 10px', borderRadius: '8px', border: '1px solid #252525',
                        background: '#1a1a1a', color: '#555',
                        fontSize: '12px', cursor: 'pointer',
                        opacity: acting === user.id ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#88aaff44'; e.currentTarget.style.color = '#88aaff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#555'; }}
                    >
                      <KeyRound size={13} />
                    </button>

                    {/* Role dropdown */}
                    <div style={{ position: 'relative' }} data-role-menu>
                      <button
                        onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                        disabled={acting === user.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '7px 12px', borderRadius: '8px', border: '1px solid #252525',
                          background: '#1a1a1a', color: '#888',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          opacity: acting === user.id ? 0.5 : 1, whiteSpace: 'nowrap',
                        }}
                      >
                        {acting === user.id ? '...' : 'Alterar cargo'} <ChevronDown size={12} />
                      </button>

                      {openMenu === user.id && (
                        <div style={{
                          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 100,
                          background: '#141414', border: '1px solid #252525',
                          borderRadius: '12px', padding: '6px', minWidth: '160px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        }}>
                          {user.role !== 'PRODUCER' && (
                            <MenuItem color="#67bed9" onClick={() => handleAction(user.id, 'producer')}>
                              Tornar Produtor
                            </MenuItem>
                          )}
                          {user.role !== 'STAFF' && (
                            <MenuItem color="#88aaff" onClick={() => handleAction(user.id, 'staff')}>
                              Tornar Staff
                            </MenuItem>
                          )}
                          {user.role !== 'CUSTOMER' && (
                            <MenuItem color="#888" onClick={() => handleAction(user.id, 'demote')}>
                              Revogar cargo
                            </MenuItem>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
          {Array.from({ length: meta.lastPage }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => load(p)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: p === meta.page ? '#67bed9' : '#1a1a1a',
                color: p === meta.page ? '#fff' : '#666',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, color, onClick }: { children: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '8px 12px', borderRadius: '8px', border: 'none',
        background: 'transparent', color, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

function InfoPill({ icon, children, highlight }: { icon: React.ReactNode; children: React.ReactNode; highlight?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: highlight ? '#67bed9' : '#555' }}>
      {icon}{children}
    </span>
  );
}

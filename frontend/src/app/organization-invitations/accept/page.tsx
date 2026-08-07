'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { authApi, organizationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useOrganization } from '@/lib/organization-context';

const ROLE_LABEL: Record<string, string> = { ORG_ADMIN: 'Administrador da organização', PRODUCER: 'Produtor', STAFF: 'Staff' };

function AcceptInvitation() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const { user, loading: authLoading } = useAuth();
  const { refresh, selectOrganization } = useOrganization();
  const [invitation, setInvitation] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) { setError('Link de convite inválido.'); setLoading(false); return; }
    window.localStorage.setItem('pago-pending-organization-invite', token);
    organizationsApi.resolveInvitation(token).then(({ data }) => setInvitation(data)).catch((e) => setError(e.response?.data?.message || 'Este convite não está disponível.')).finally(() => setLoading(false));
  }, [token]);

  async function accept() {
    setAccepting(true); setError('');
    try {
      const { data } = await organizationsApi.acceptInvitation(token);
      setResult(data);
      window.localStorage.removeItem('pago-pending-organization-invite');
      await refresh();
    } catch (e: any) { setError(e.response?.data?.message || 'Não foi possível aceitar o convite.'); }
    finally { setAccepting(false); }
  }

  if (loading || authLoading) return <Shell><Loader2 className="animate-spin" color="#67bed9" /></Shell>;
  if (result) return <Shell><CheckCircle2 size={54} color="#3d9d68"/><h1 style={title}>Convite aceito!</h1><p style={copy}>Você agora faz parte da equipe da <strong>{result.organization.name}</strong> como {ROLE_LABEL[result.role]}.</p><button onClick={() => { selectOrganization(result.organization.id); router.push('/organization'); }} style={primary}>Ir para o painel da organização</button></Shell>;
  if (error && !invitation) return <Shell><h1 style={title}>Convite indisponível</h1><p style={copy}>{error}</p><Link href="/" style={secondary}>Voltar ao início</Link></Shell>;
  if (!user) {
    const returnPath = `/organization-invitations/accept?token=${encodeURIComponent(token)}`;
    const registerUrl = `/auth/register?organizationInvite=${encodeURIComponent(token)}&email=${encodeURIComponent(invitation.email)}`;
    const loginUrl = `/auth/login?redirect=${encodeURIComponent(returnPath)}&organizationInvite=${encodeURIComponent(token)}&email=${encodeURIComponent(invitation.email)}`;
    return <Shell><h1 style={title}>Convite para a equipe</h1><p style={copy}>Você foi convidado para entrar na equipe da <strong>{invitation.organizationName}</strong> como {ROLE_LABEL[invitation.role]}.</p><Link href={invitation.hasAccount ? loginUrl : registerUrl} style={primary}>{invitation.hasAccount ? 'Entrar para aceitar' : 'Criar conta para aceitar'}</Link>{invitation.hasAccount ? <Link href={registerUrl} style={secondary}>Ainda não tenho conta</Link> : <Link href={loginUrl} style={secondary}>Já tenho conta</Link>}</Shell>;
  }
  if (!user.isVerified) return <Shell><h1 style={title}>Confirme seu e-mail</h1><p style={copy}>O convite para a <strong>{invitation.organizationName}</strong> está preservado, mas nenhum cargo pode ser concedido antes da confirmação do e-mail <strong>{invitation.email}</strong>.</p><button onClick={async () => { try { await authApi.resendVerification(user.email); setError('E-mail de confirmação reenviado.'); } catch (e: any) { setError(e.response?.data?.message || 'Não foi possível reenviar o e-mail.'); } }} style={primary}>Reenviar confirmação</button>{error && <p style={{ color: error.includes('reenviado') ? '#3d9d68' : '#c94d4d' }}>{error}</p>}<Link href="/auth/verify-email" style={secondary}>Já tenho um link de confirmação</Link></Shell>;
  return <Shell><h1 style={title}>Confirmar convite</h1><p style={copy}>Entrar na equipe da <strong>{invitation.organizationName}</strong> como {ROLE_LABEL[invitation.role]}?</p>{error && <p style={{ color: '#c94d4d' }}>{error}</p>}<button onClick={accept} disabled={accepting} style={primary}>{accepting ? 'Aceitando...' : 'Aceitar convite'}</button></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) { return <div style={{ minHeight: '80vh', display: 'grid', placeItems: 'center', padding: 24 }}><section style={{ width: '100%', maxWidth: 520, textAlign: 'center', background: 'var(--theme-surface)', border: '1px solid var(--theme-border)', borderRadius: 18, padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>{children}</section></div>; }
const title: React.CSSProperties = { fontSize: 26, margin: 0 };
const copy: React.CSSProperties = { color: 'var(--theme-muted)', lineHeight: 1.6, margin: 0 };
const primary: React.CSSProperties = { background: '#67bed9', color: '#fff', border: 0, borderRadius: 10, padding: '13px 20px', fontWeight: 700, textDecoration: 'none', cursor: 'pointer' };
const secondary: React.CSSProperties = { color: 'var(--theme-muted)', textDecoration: 'none', fontSize: 14 };

export default function AcceptInvitationPage() { return <Suspense><AcceptInvitation /></Suspense>; }

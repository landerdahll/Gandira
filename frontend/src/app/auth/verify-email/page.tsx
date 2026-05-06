'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type State = 'loading' | 'success' | 'error' | 'no-token';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const token = params.get('token');

  const [state, setState] = useState<State>(token ? 'loading' : 'no-token');
  const [errorMsg, setErrorMsg] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi
      .verifyEmail(token)
      .then(() => setState('success'))
      .catch((e: any) => {
        setErrorMsg(e.response?.data?.message ?? 'Não foi possível verificar o e-mail.');
        setState('error');
      });
  }, [token]);

  async function handleResend() {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerification();
      toast.success('E-mail reenviado! Verifique sua caixa de entrada.');
    } catch {
      toast.error('Erro ao reenviar. Tente novamente em alguns minutos.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#111',
        border: '1px solid #1e1e1e',
        borderRadius: 20,
        padding: '40px 32px',
        textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 32px', fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
          outra<span style={{ color: '#67bed9' }}>hora</span>
        </p>

        {state === 'loading' && (
          <>
            <Loader2 size={48} color="#67bed9" style={{ margin: '0 auto 20px', display: 'block', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#aaa', fontSize: 16 }}>Verificando seu e-mail...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 size={48} color="#4ade80" style={{ margin: '0 auto 20px', display: 'block' }} />
            <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#fff' }}>E-mail verificado!</p>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#666', lineHeight: 1.6 }}>
              Sua conta está confirmada. Agora você pode comprar ingressos.
            </p>
            <Link href="/" style={{
              display: 'block',
              padding: '13px',
              borderRadius: 12,
              background: '#67bed9',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
            }}>
              Ver eventos
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle size={48} color="#f87171" style={{ margin: '0 auto 20px', display: 'block' }} />
            <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#fff' }}>Link inválido</p>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#666', lineHeight: 1.6 }}>
              {errorMsg}
            </p>
            {user && (
              <button
                onClick={handleResend}
                disabled={resending}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#67bed9',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: resending ? 'not-allowed' : 'pointer',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {resending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
                {resending ? 'Enviando...' : 'Reenviar e-mail de verificação'}
              </button>
            )}
            <Link href="/" style={{ fontSize: 14, color: '#555', textDecoration: 'none' }}>
              Voltar para a página inicial
            </Link>
          </>
        )}

        {state === 'no-token' && (
          <>
            <Mail size={48} color="#67bed9" style={{ margin: '0 auto 20px', display: 'block' }} />
            <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#fff' }}>Verifique seu e-mail</p>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#666', lineHeight: 1.6 }}>
              Enviamos um link de confirmação para o seu e-mail no momento do cadastro. Clique no link para liberar a compra de ingressos.
            </p>
            {user && (
              <button
                onClick={handleResend}
                disabled={resending}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#67bed9',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: resending ? 'not-allowed' : 'pointer',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {resending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={16} />}
                {resending ? 'Enviando...' : 'Reenviar e-mail de verificação'}
              </button>
            )}
            <Link href="/" style={{ fontSize: 14, color: '#555', textDecoration: 'none' }}>
              Voltar para a página inicial
            </Link>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

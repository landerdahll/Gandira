'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Informe seu e-mail'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Erro ao processar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/gandira-logo.png" alt="Gandira" style={{ height: '44px', objectFit: 'contain' }} />
          </Link>
        </div>

        <div style={{
          background: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: 20,
          padding: '36px 32px',
        }}>
          {sent ? (
            /* ── Sucesso ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: '#67bed915', border: '1px solid #67bed930',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <CheckCircle2 size={28} color="#67bed9" />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.4px' }}>
                E-mail enviado!
              </h1>
              <p style={{ fontSize: 14, color: '#666', margin: '0 0 28px', lineHeight: 1.6 }}>
                Se <strong style={{ color: '#aaa' }}>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
              </p>
              <p style={{ fontSize: 13, color: '#444', margin: '0 0 24px', lineHeight: 1.6 }}>
                Verifique também a caixa de spam. O link é válido por 1 hora.
              </p>
              <Link
                href="/auth/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 14, color: '#67bed9', textDecoration: 'none', fontWeight: 600,
                }}
              >
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </div>
          ) : (
            /* ── Formulário ── */
            <>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#67bed915', border: '1px solid #67bed930',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Mail size={20} color="#67bed9" />
              </div>

              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
                Esqueceu a senha?
              </h1>
              <p style={{ fontSize: 14, color: '#555', margin: '0 0 28px', lineHeight: 1.6 }}>
                Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="seu@email.com"
                    autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#171717', border: `1px solid ${error ? '#ff6b6b55' : '#252525'}`,
                      borderRadius: 12, padding: '13px 16px',
                      color: '#fff', fontSize: 15, outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
                    onBlur={e => (e.currentTarget.style.borderColor = error ? '#ff6b6b55' : '#252525')}
                  />
                  {error && <p style={{ fontSize: 12, color: '#ff6b6b', margin: '6px 0 0' }}>{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px 0',
                    borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    background: '#67bed9', color: '#fff',
                    fontSize: 15, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                    boxShadow: '0 0 24px #67bed930',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1'; }}
                >
                  {loading
                    ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                    : 'Enviar link de redefinição'
                  }
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 14, color: '#555', marginTop: 24 }}>
          <Link
            href="/auth/login"
            style={{ color: '#67bed9', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            <ArrowLeft size={13} /> Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}

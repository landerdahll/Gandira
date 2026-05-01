'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setLoginError('');
    try {
      await login(data as { email: string; password: string });
      toast.success('Bem-vindo!');
      router.push(redirect);
    } catch (e: any) {
      setLoginError(e.response?.data?.message ?? 'E-mail ou senha incorretos');
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

        {/* Card */}
        <div style={{
          background: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: 20,
          padding: '36px 32px',
        }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            margin: '0 0 6px',
            letterSpacing: '-0.4px',
          }}>
            Entrar na conta
          </h1>
          <p style={{ fontSize: 14, color: '#555', margin: '0 0 28px' }}>
            Bem-vindo de volta
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>
                E-mail
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#171717', border: '1px solid #252525',
                  borderRadius: 12, padding: '13px 16px',
                  color: '#fff', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
                onBlur={e => (e.currentTarget.style.borderColor = errors.email ? '#ff6b6b55' : '#252525')}
              />
              {errors.email && (
                <p style={{ fontSize: 12, color: '#ff6b6b', margin: '6px 0 0' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>
                  Senha
                </label>
                <Link
                  href="/auth/forgot-password"
                  style={{ fontSize: 12, color: '#67bed9', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#171717', border: '1px solid #252525',
                    borderRadius: 12, padding: '13px 48px 13px 16px',
                    color: '#fff', fontSize: 15, outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
                  onBlur={e => (e.currentTarget.style.borderColor = errors.password ? '#ff6b6b55' : '#252525')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#555', display: 'flex', padding: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: 12, color: '#ff6b6b', margin: '6px 0 0' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Inline error */}
            {loginError && (
              <div style={{
                padding: '10px 14px',
                background: '#220000',
                border: '1px solid #ff6b6b33',
                borderRadius: 10,
                fontSize: 13,
                color: '#ff6b6b',
                marginTop: -4,
              }}>
                {loginError}
              </div>
            )}

            {/* Submit */}
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
                marginTop: 4,
                boxShadow: '0 0 24px #67bed930',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1'; }}
            >
              {loading ? (
                <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Entrando...</>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 14, color: '#555', marginTop: 24 }}>
          Não tem conta?{' '}
          <Link
            href="/auth/register"
            style={{ color: '#67bed9', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            Criar conta gratuita
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

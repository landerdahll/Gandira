'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve ter ao menos 1 letra maiúscula')
      .regex(/\d/, 'Deve ter ao menos 1 número'),
    confirm: z.string(),
  })
  .refine(d => d.password === d.confirm, {
    message: 'As senhas não coincidem',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Link inválido ou expirado');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#171717', border: '1px solid #252525',
    borderRadius: 12, padding: '13px 48px 13px 16px',
    color: '#fff', fontSize: 15, outline: 'none',
    transition: 'border-color 0.15s',
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
          {!token ? (
            /* ── Token ausente ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: '#2a0a0a', border: '1px solid #4a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <AlertTriangle size={24} color="#f87171" />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
                Link inválido
              </h1>
              <p style={{ fontSize: 14, color: '#666', margin: '0 0 24px' }}>
                Este link de redefinição é inválido ou já foi utilizado.
              </p>
              <Link href="/auth/forgot-password" style={{
                display: 'inline-block', padding: '12px 24px',
                borderRadius: 10, background: '#67bed9', color: '#fff',
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}>
                Solicitar novo link
              </Link>
            </div>
          ) : done ? (
            /* ── Sucesso ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: '#67bed915', border: '1px solid #67bed930',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <ShieldCheck size={28} color="#67bed9" />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
                Senha redefinida!
              </h1>
              <p style={{ fontSize: 14, color: '#666', margin: '0 0 8px', lineHeight: 1.6 }}>
                Sua senha foi atualizada com sucesso.
              </p>
              <p style={{ fontSize: 13, color: '#444' }}>
                Redirecionando para o login...
              </p>
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
                <ShieldCheck size={20} color="#67bed9" />
              </div>

              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
                Nova senha
              </h1>
              <p style={{ fontSize: 14, color: '#555', margin: '0 0 28px' }}>
                Crie uma senha segura para sua conta.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Nova senha */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>
                    Nova senha
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mín. 8 chars, 1 maiúscula, 1 número"
                      style={{ ...inputStyle, borderColor: errors.password ? '#ff6b6b55' : '#252525' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
                      onBlur={e => (e.currentTarget.style.borderColor = errors.password ? '#ff6b6b55' : '#252525')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#555', display: 'flex', padding: 0, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p style={{ fontSize: 12, color: '#ff6b6b', margin: '6px 0 0' }}>{errors.password.message}</p>
                  )}
                </div>

                {/* Confirmar senha */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>
                    Confirmar nova senha
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      {...register('confirm')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      style={{ ...inputStyle, borderColor: errors.confirm ? '#ff6b6b55' : '#252525' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
                      onBlur={e => (e.currentTarget.style.borderColor = errors.confirm ? '#ff6b6b55' : '#252525')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#555', display: 'flex', padding: 0, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                    >
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p style={{ fontSize: 12, color: '#ff6b6b', margin: '6px 0 0' }}>{errors.confirm.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%', padding: '14px 0', marginTop: 4,
                    borderRadius: 12, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    background: '#67bed9', color: '#fff',
                    fontSize: 15, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: isSubmitting ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                    boxShadow: '0 0 24px #67bed930',
                  }}
                  onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.opacity = '1'; }}
                >
                  {isSubmitting
                    ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
                    : 'Salvar nova senha'
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

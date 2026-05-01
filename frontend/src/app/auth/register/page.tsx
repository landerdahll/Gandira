'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const schema = z
  .object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    phone: z.string().min(10, 'Celular inválido').max(20),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], {
      required_error: 'Selecione o sexo',
    }),
    birthDate: z.string().min(1, 'Data de nascimento obrigatória'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve ter ao menos 1 letra maiúscula')
      .regex(/\d/, 'Deve ter ao menos 1 número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outro' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefiro não informar' },
];

const baseInput: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#171717',
  border: '1px solid #252525',
  borderRadius: 12,
  padding: '13px 16px',
  color: '#fff',
  fontSize: 15,
  outline: 'none',
  transition: 'border-color 0.15s',
};

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        gender: data.gender,
        birthDate: data.birthDate,
      });
      await login({ email: data.email, password: data.password });
      toast.success('Conta criada com sucesso!');
      router.push('/');
    } catch (e: any) {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao criar conta'));
    }
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = '#67bed9');
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = '#252525');

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
            fontSize: 22, fontWeight: 800, color: '#fff',
            margin: '0 0 6px', letterSpacing: '-0.4px',
          }}>
            Criar conta
          </h1>
          <p style={{ fontSize: 14, color: '#555', margin: '0 0 28px' }}>
            É rápido e gratuito
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Nome */}
            <Field label="Nome completo" error={errors.name?.message}>
              <input
                {...register('name')}
                type="text"
                placeholder="Seu nome completo"
                style={baseInput}
                onFocus={onFocus} onBlur={onBlur}
              />
            </Field>

            {/* E-mail */}
            <Field label="E-mail" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                style={baseInput}
                onFocus={onFocus} onBlur={onBlur}
              />
            </Field>

            {/* Celular */}
            <Field label="Celular" error={errors.phone?.message}>
              <input
                {...register('phone')}
                type="tel"
                placeholder="(11) 99999-9999"
                style={baseInput}
                onFocus={onFocus} onBlur={onBlur}
              />
            </Field>

            {/* Sexo + Nascimento */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Sexo" error={errors.gender?.message}>
                <select
                  {...register('gender')}
                  style={{ ...baseInput, appearance: 'none', cursor: 'pointer' }}
                  onFocus={onFocus} onBlur={onBlur}
                >
                  <option value="">Selecione</option>
                  {GENDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Nascimento" error={errors.birthDate?.message}>
                <input
                  {...register('birthDate')}
                  type="date"
                  style={{ ...baseInput, colorScheme: 'dark' }}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </Field>
            </div>

            {/* Divisor */}
            <div style={{ height: 1, background: '#1a1a1a', margin: '2px 0' }} />

            {/* Senha */}
            <Field label="Senha" error={errors.password?.message}>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mín. 8 chars, 1 maiúscula, 1 número"
                  style={{ ...baseInput, paddingRight: 48 }}
                  onFocus={onFocus} onBlur={onBlur}
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
            </Field>

            {/* Confirmar senha */}
            <Field label="Confirmar senha" error={errors.confirmPassword?.message}>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  style={{ ...baseInput, paddingRight: 48 }}
                  onFocus={onFocus} onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#555', display: 'flex', padding: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%', padding: '14px 0',
                borderRadius: 12, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                background: '#67bed9', color: '#fff',
                fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: isSubmitting ? 0.6 : 1,
                transition: 'opacity 0.15s',
                marginTop: 4,
                boxShadow: '0 0 24px #67bed930',
              }}
              onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.opacity = '1'; }}
            >
              {isSubmitting ? (
                <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Criando conta...</>
              ) : 'Criar conta'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 14, color: '#555', marginTop: 24 }}>
          Já tem conta?{' '}
          <Link
            href="/auth/login"
            style={{ color: '#67bed9', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: '#ff6b6b', margin: '6px 0 0' }}>{error}</p>}
    </div>
  );
}

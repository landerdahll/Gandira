'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Mail, Phone, Calendar, PersonStanding, Eye, EyeOff, Pencil, X, Lock, UserRound, Camera } from 'lucide-react';

const GENDER_LABEL: Record<string, string> = {
  MALE: 'Masculino',
  FEMALE: 'Feminino',
  OTHER: 'Outro',
  PREFER_NOT_TO_SAY: 'Prefiro não informar',
};

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Feminino' },
  { value: 'OTHER', label: 'Outro' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefiro não informar' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1a1a1a',
  border: '1px solid #252525',
  borderRadius: '10px',
  padding: '11px 14px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

type Modal = 'name' | 'email' | 'phone' | 'birthDate' | 'gender' | 'password' | null;

const AVATAR_MAX_MB = 3;

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  birthDate: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    usersApi.getProfile()
      .then(r => setProfile(r.data))
      .catch(() => toast.error('Erro ao carregar perfil'))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || fetching || !profile) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #252525', borderTopColor: '#67bed9', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const initials = profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const formattedBirth = profile.birthDate
    ? new Date(profile.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : '—';
  const memberSince = new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  function patch(field: Partial<Profile>) {
    setProfile(p => p ? { ...p, ...field } : p);
  }

  async function handleRemoveAvatar() {
    setRemovingAvatar(true);
    try {
      await usersApi.removeAvatar();
      patch({ avatarUrl: null });
      toast.success('Foto removida');
    } catch {
      toast.error('Erro ao remover foto');
    } finally {
      setRemovingAvatar(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
      toast.error(`A imagem deve ter no máximo ${AVATAR_MAX_MB} MB`);
      return;
    }
    setUploadingAvatar(true);
    try {
      const res = await usersApi.uploadAvatar(file);
      patch({ avatarUrl: res.data.avatarUrl });
      toast.success('Foto atualizada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
        {/* Avatar clicável + botão remover */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <div
          onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
          style={{ position: 'relative', width: '72px', height: '72px', cursor: uploadingAvatar ? 'wait' : 'pointer' }}
          title="Clique para alterar a foto"
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #67bed9', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: '#0d1e28', border: '2px solid #67bed9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 800, color: '#67bed9',
            }}>
              {uploadingAvatar ? (
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #67bed933', borderTopColor: '#67bed9', animation: 'spin 0.8s linear infinite' }} />
              ) : initials}
            </div>
          )}
          {/* Overlay de câmera */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
          >
            {uploadingAvatar
              ? <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #fff3', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
              : <Camera size={18} color="#fff" />
            }
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>
        {/* Botão remover foto — só aparece quando há avatar */}
        {profile.avatarUrl && (
          <button
            onClick={handleRemoveAvatar}
            disabled={removingAvatar}
            style={{
              background: 'none', border: 'none', cursor: removingAvatar ? 'wait' : 'pointer',
              fontSize: '11px', color: '#444', padding: '0', lineHeight: 1,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#67bed9')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >
            {removingAvatar ? '...' : 'remover foto'}
          </button>
        )}
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{profile.name}</h1>
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px',
            background: '#0d1e28', color: '#67bed9', border: '1px solid #67bed933',
          }}>
            {profile.role === 'ADMIN' ? 'Admin' : profile.role === 'PRODUCER' ? 'Produtor' : profile.role === 'STAFF' ? 'Staff' : 'Membro'}
          </span>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '6px' }}>Membro desde {memberSince}</p>
        </div>
      </div>

      {/* Info card */}
      <Section title="Informações pessoais">
        <InfoRow icon={<UserRound size={15} color="#67bed9" />} label="Nome completo" value={profile.name}>
          <EditButton onClick={() => setModal('name')} />
        </InfoRow>
        <InfoRow icon={<Mail size={15} color="#67bed9" />} label="E-mail" value={profile.email}>
          <EditButton onClick={() => setModal('email')} />
        </InfoRow>
        <InfoRow icon={<Phone size={15} color="#67bed9" />} label="Celular" value={profile.phone || '—'}>
          <EditButton onClick={() => setModal('phone')} />
        </InfoRow>
        <InfoRow icon={<Calendar size={15} color="#67bed9" />} label="Data de nascimento" value={formattedBirth}>
          <EditButton onClick={() => setModal('birthDate')} />
        </InfoRow>
        <InfoRow icon={<PersonStanding size={15} color="#67bed9" />} label="Sexo" value={GENDER_LABEL[profile.gender] ?? '—'} last>
          <EditButton onClick={() => setModal('gender')} />
        </InfoRow>
      </Section>

      {/* Security card */}
      <Section title="Segurança">
        <InfoRow icon={<Lock size={15} color="#67bed9" />} label="Senha" value="••••••••" last>
          <EditButton label="Alterar" onClick={() => setModal('password')} />
        </InfoRow>
      </Section>

      {/* Modals */}
      {modal === 'name' && (
        <EditFieldModal
          title="Alterar nome"
          label="Nome completo"
          current={profile.name}
          type="text"
          placeholder="Seu nome completo"
          onClose={() => setModal(null)}
          onSave={async value => {
            await usersApi.updateProfile({ name: value });
            patch({ name: value });
            toast.success('Nome atualizado');
          }}
        />
      )}
      {modal === 'email' && (
        <EditFieldModal
          title="Alterar e-mail"
          label="Novo e-mail"
          current={profile.email}
          type="email"
          placeholder="seu@email.com"
          onClose={() => setModal(null)}
          onSave={async value => {
            await usersApi.updateProfile({ email: value });
            patch({ email: value });
            toast.success('E-mail atualizado');
          }}
        />
      )}
      {modal === 'phone' && (
        <EditFieldModal
          title="Alterar celular"
          label="Novo número"
          current={profile.phone}
          type="tel"
          placeholder="(11) 99999-9999"
          onClose={() => setModal(null)}
          onSave={async value => {
            await usersApi.updateProfile({ phone: value });
            patch({ phone: value });
            toast.success('Celular atualizado');
          }}
        />
      )}
      {modal === 'birthDate' && (
        <EditBirthDateModal
          current={profile.birthDate}
          onClose={() => setModal(null)}
          onSave={value => patch({ birthDate: value })}
        />
      )}
      {modal === 'gender' && (
        <EditGenderModal
          current={profile.gender}
          onClose={() => setModal(null)}
          onSave={value => patch({ gender: value })}
        />
      )}
      {modal === 'password' && (
        <ChangePasswordModal onClose={() => setModal(null)} />
      )}
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value, children, last }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  children?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: last ? 'none' : '1px solid #161616',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div style={{ flexShrink: 0 }}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>{label}</p>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        </div>
      </div>
      {children && <div style={{ flexShrink: 0, marginLeft: '12px' }}>{children}</div>}
    </div>
  );
}

function EditButton({ onClick, label = 'Editar' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '6px 12px', borderRadius: '8px',
        background: 'transparent', border: '1px solid #252525',
        color: '#888', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#67bed9'; e.currentTarget.style.color = '#67bed9'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#888'; }}
    >
      <Pencil size={11} />{label}
    </button>
  );
}

/* ── Generic single-field edit modal ─────────────────────────────────────── */

function EditFieldModal({ title, label, current, type, placeholder, onClose, onSave }: {
  title: string;
  label: string;
  current: string;
  type: string;
  placeholder?: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!value.trim() || value === current) return onClose();
    setSaving(true);
    try {
      await onSave(value.trim());
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
        onBlur={e => (e.currentTarget.style.borderColor = '#252525')}
        onKeyDown={e => e.key === 'Enter' && save()}
        autoFocus
      />
      <ModalActions onClose={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

/* ── Edit birth date modal ────────────────────────────────────────────────── */

function EditBirthDateModal({ current, onClose, onSave }: { current: string; onClose: () => void; onSave: (v: string) => void }) {
  const toInputDate = (iso: string) => iso ? iso.slice(0, 10) : '';
  const [value, setValue] = useState(toInputDate(current));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!value) return toast.error('Selecione uma data');
    setSaving(true);
    try {
      await usersApi.updateProfile({ birthDate: value });
      onSave(value);
      toast.success('Data de nascimento atualizada');
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Alterar data de nascimento" onClose={onClose}>
      <label style={labelStyle}>Data de nascimento</label>
      <input
        type="date"
        value={value}
        onChange={e => setValue(e.target.value)}
        style={{ ...inputStyle, colorScheme: 'dark' }}
        onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
        onBlur={e => (e.currentTarget.style.borderColor = '#252525')}
        autoFocus
      />
      <ModalActions onClose={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

/* ── Edit gender modal ────────────────────────────────────────────────────── */

function EditGenderModal({ current, onClose, onSave }: { current: string; onClose: () => void; onSave: (v: string) => void }) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!value) return toast.error('Selecione uma opção');
    setSaving(true);
    try {
      await usersApi.updateProfile({ gender: value });
      onSave(value);
      toast.success('Sexo atualizado');
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Alterar sexo" onClose={onClose}>
      <label style={labelStyle}>Sexo</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {GENDER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setValue(opt.value)}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px', textAlign: 'left',
              background: value === opt.value ? '#0d1e28' : '#1a1a1a',
              border: `1px solid ${value === opt.value ? '#67bed9' : '#252525'}`,
              color: value === opt.value ? '#67bed9' : '#888',
              fontSize: '14px', fontWeight: value === opt.value ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <ModalActions onClose={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

/* ── Change password modal ────────────────────────────────────────────────── */

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!current || !next) return toast.error('Preencha todos os campos');
    if (next !== confirm) return toast.error('As senhas não coincidem');
    if (next.length < 8) return toast.error('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(next)) return toast.error('Nova senha deve ter ao menos 1 letra maiúscula');
    if (!/\d/.test(next)) return toast.error('Nova senha deve ter ao menos 1 número');

    setSaving(true);
    try {
      await usersApi.changePassword({ currentPassword: current, newPassword: next });
      toast.success('Senha alterada com sucesso');
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Alterar senha" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Senha atual</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="Senha atual"
              style={{ ...inputStyle, paddingRight: '42px' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
              onBlur={e => (e.currentTarget.style.borderColor = '#252525')}
              autoFocus
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)} style={eyeBtn}>
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Nova senha</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="Mín. 8 chars, 1 maiúscula, 1 número"
              style={{ ...inputStyle, paddingRight: '42px' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
              onBlur={e => (e.currentTarget.style.borderColor = '#252525')}
            />
            <button type="button" onClick={() => setShowNext(v => !v)} style={eyeBtn}>
              {showNext ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Confirmar nova senha</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repita a nova senha"
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
            onBlur={e => (e.currentTarget.style.borderColor = '#252525')}
          />
        </div>
      </div>
      <ModalActions onClose={onClose} onSave={save} saving={saving} saveLabel="Alterar senha" />
    </Modal>
  );
}

/* ── Modal shell ──────────────────────────────────────────────────────────── */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: '100%', maxWidth: '400px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '18px', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSave, saving, saveLabel = 'Salvar' }: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
}) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
      <button
        onClick={onClose}
        style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'transparent', border: '1px solid #252525', color: '#888', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
      >
        Cancelar
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        style={{ flex: 1, padding: '11px', borderRadius: '10px', background: '#67bed9', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Salvando...' : saveLabel}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 500,
};

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0,
  display: 'flex', alignItems: 'center',
};

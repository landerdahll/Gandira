'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Trash2, Plus, ArrowLeft, Calendar, MapPin, ImageIcon, Ticket, Tag, Save, Upload, Link2, X } from 'lucide-react';
import { eventsApi, batchesApi } from '@/lib/api';

const inp: React.CSSProperties = {
  width: '100%', background: '#0f0f0f', border: '1px solid #252525',
  borderRadius: '10px', padding: '11px 14px', color: '#fff',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

const CATEGORIES = ['Música', 'Festa', 'Festival', 'Outro'];
const IMAGE_MAX_MB = 5;

type ImageMode = 'upload' | 'url';

// Convert UTC ISO string → "YYYY-MM-DDTHH:mm" in Brazil local time for datetime-local input
function utcToLocalInput(utcStr?: string | null): string {
  if (!utcStr) return '';
  const d = new Date(utcStr);
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d).replace(' ', 'T').slice(0, 16);
}

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loading, setSaving] = useState(false);
  const [imageMode, setImageMode] = useState<ImageMode>('upload');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  const [form, setForm] = useState({
    title: '', description: '', venue: '', address: '', city: '', state: '',
    startDate: '', endDate: '', doorsOpen: '', coverImage: '',
    category: 'Música', ageRating: '18', tags: '',
  });

  useEffect(() => {
    eventsApi.getById(id)
      .then(res => {
        const e = res.data;
        setForm({
          title: e.title ?? '',
          description: e.description ?? '',
          venue: e.venue ?? '',
          address: e.address ?? '',
          city: e.city ?? '',
          state: e.state ?? '',
          startDate: utcToLocalInput(e.startDate),
          endDate: utcToLocalInput(e.endDate),
          doorsOpen: utcToLocalInput(e.doorsOpen),
          coverImage: e.coverImage ?? '',
          category: e.category ?? 'Música',
          ageRating: String(e.ageRating ?? 18),
          tags: (e.tags ?? []).join(', '),
        });
        if (e.coverImage) setImageMode('url');
      })
      .catch(() => toast.error('Erro ao carregar evento'))
      .finally(() => setLoadingEvent(false));
  }, [id]);

  function setField(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = '#67bed9');
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = '#252525');

  async function handleImageFile(file: File) {
    if (!file) return;
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      toast.error(`A imagem deve ter no máximo ${IMAGE_MAX_MB} MB`); return;
    }
    setUploadingImage(true);
    try {
      const res = await eventsApi.uploadImage(file);
      setField('coverImage', res.data.url);
      toast.success('Imagem enviada!');
    } catch {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }

  function validate() {
    if (!form.title.trim()) { toast.error('Preencha o título'); return false; }
    if (!form.description.trim()) { toast.error('Preencha a descrição'); return false; }
    if (!form.venue.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim()) {
      toast.error('Preencha todos os campos do local'); return false;
    }
    if (!form.startDate || !form.endDate) { toast.error('Preencha as datas do evento'); return false; }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      await eventsApi.update(id, {
        title: form.title, description: form.description,
        venue: form.venue, address: form.address, city: form.city,
        state: form.state.toUpperCase().slice(0, 2),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        ...(form.doorsOpen && { doorsOpen: new Date(form.doorsOpen).toISOString() }),
        ...(form.coverImage && { coverImage: form.coverImage }),
        category: form.category,
        ageRating: parseInt(form.ageRating) || 0,
        ...(form.tags && { tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }),
      });
      toast.success('Evento atualizado!');
      router.push(`/producer/events/${id}`);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao salvar'));
      submitting.current = false;
    } finally {
      setSaving(false);
    }
  }

  if (loadingEvent) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px' }}>
        {[1, 2, 3].map(i => <div key={i} style={{ height: '120px', borderRadius: '16px', background: '#111', marginBottom: '16px' }} />)}
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <Link href={`/producer/events/${id}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        color: '#555', textDecoration: 'none', fontSize: '13px', marginBottom: '40px',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = '#67bed9')}
        onMouseLeave={e => (e.currentTarget.style.color = '#555')}
      >
        <ArrowLeft size={15} /> Voltar ao painel do evento
      </Link>

      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: '10px' }}>
          Editar <span style={{ color: '#67bed9' }}>Evento</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#555' }}>Atualize as informações do seu evento</p>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Informações ───────────────────────────────────────────────── */}
        <Card icon={<Tag size={15} />} title="Informações do Evento">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field label="Título *">
              <input style={inp} value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="Ex: Festival de Verão 2026"
                onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Descrição *">
              <textarea style={{ ...inp, minHeight: '110px', resize: 'vertical' }} value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Descreva o evento..."
                onFocus={focus} onBlur={blur} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Categoria">
                <select style={{ ...inp, cursor: 'pointer' }} value={form.category}
                  onChange={e => setField('category', e.target.value)} onFocus={focus} onBlur={blur}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Classificação Etária">
                <select style={{ ...inp, cursor: 'pointer' }} value={form.ageRating}
                  onChange={e => setField('ageRating', e.target.value)} onFocus={focus} onBlur={blur}>
                  <option value="0">Livre</option>
                  <option value="12">12+</option>
                  <option value="14">14+</option>
                  <option value="16">16+</option>
                  <option value="18">18+</option>
                </select>
              </Field>
            </div>
            <Field label="Tags (separadas por vírgula)">
              <input style={inp} value={form.tags}
                onChange={e => setField('tags', e.target.value)}
                placeholder="Ex: eletrônico, dj, festival"
                onFocus={focus} onBlur={blur} />
            </Field>
          </div>
        </Card>

        {/* ── Capa ──────────────────────────────────────────────────────── */}
        <Card icon={<ImageIcon size={15} />} title="Capa do Evento">
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: '#0a0a0a', padding: '4px', borderRadius: '10px' }}>
            {(['upload', 'url'] as ImageMode[]).map(mode => (
              <button key={mode} type="button" onClick={() => setImageMode(mode)} style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: imageMode === mode ? '#1a1a1a' : 'transparent',
                color: imageMode === mode ? '#fff' : '#555',
                fontSize: '13px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.15s',
              }}>
                {mode === 'upload' ? <><Upload size={13} /> Upload de arquivo</> : <><Link2 size={13} /> Inserir URL</>}
              </button>
            ))}
          </div>

          {imageMode === 'upload' ? (
            <div
              onClick={() => !uploadingImage && imageInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#67bed9' : '#252525'}`,
                borderRadius: '14px', padding: '32px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                cursor: uploadingImage ? 'wait' : 'pointer',
                background: dragOver ? '#67bed908' : 'transparent',
                transition: 'all 0.15s', minHeight: '140px',
              }}
            >
              {uploadingImage
                ? <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #252525', borderTopColor: '#67bed9', animation: 'spin 0.8s linear infinite' }} />
                : <Upload size={28} color={dragOver ? '#67bed9' : '#333'} />}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: uploadingImage ? '#555' : '#888', marginBottom: '4px' }}>
                  {uploadingImage ? 'Enviando...' : 'Clique ou arraste a imagem aqui'}
                </p>
                <p style={{ fontSize: '12px', color: '#444' }}>JPG, PNG ou WebP · máx. {IMAGE_MAX_MB} MB</p>
              </div>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
            </div>
          ) : (
            <Field label="URL da imagem">
              <input style={inp} type="url" value={form.coverImage}
                onChange={e => setField('coverImage', e.target.value)}
                placeholder="https://..."
                onFocus={focus} onBlur={blur} />
            </Field>
          )}

          {form.coverImage && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={form.coverImage} alt="preview"
                  style={{ width: '100px', height: '133px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #252525', display: 'block' }} />
                <button type="button" onClick={() => setField('coverImage', '')} style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#1a1a1a', border: '1px solid #333',
                  color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <X size={11} />
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.7, marginTop: '4px' }}>
                <p style={{ color: '#67bed9', fontWeight: 600, marginBottom: '2px' }}>Capa atual</p>
                <p>Faça um novo upload ou insira outra URL para trocar.</p>
              </div>
            </div>
          )}
        </Card>

        {/* ── Data e horário ────────────────────────────────────────────── */}
        <Card icon={<Calendar size={15} />} title="Data e Horário">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Início do evento *">
              <input type="datetime-local" style={{ ...inp, colorScheme: 'dark' }} value={form.startDate}
                onChange={e => setField('startDate', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Término do evento *">
              <input type="datetime-local" style={{ ...inp, colorScheme: 'dark' }} value={form.endDate}
                onChange={e => setField('endDate', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Abertura dos portões">
              <input type="datetime-local" style={{ ...inp, colorScheme: 'dark' }} value={form.doorsOpen}
                onChange={e => setField('doorsOpen', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
          </div>
        </Card>

        {/* ── Local ─────────────────────────────────────────────────────── */}
        <Card icon={<MapPin size={15} />} title="Local">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Nome do local *">
                <input style={inp} value={form.venue}
                  onChange={e => setField('venue', e.target.value)} placeholder="Ex: Parque Barigui"
                  onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Endereço *">
                <input style={inp} value={form.address}
                  onChange={e => setField('address', e.target.value)} placeholder="Rua, número, bairro"
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px' }}>
              <Field label="Cidade *">
                <input style={inp} value={form.city}
                  onChange={e => setField('city', e.target.value)} placeholder="Ex: Porto Alegre"
                  onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="UF *">
                <input style={{ ...inp, textTransform: 'uppercase' }} maxLength={2} value={form.state}
                  onChange={e => setField('state', e.target.value.toUpperCase())} placeholder="RS"
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>
          </div>
        </Card>

        {/* ── Ações ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '8px', paddingBottom: '48px' }}>
          <Link href={`/producer/events/${id}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '14px', borderRadius: '12px', border: '1px solid #252525',
            background: 'transparent', color: '#666', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none',
          }}
            onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#aaa'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#666'; }}
          >
            Cancelar
          </Link>

          <button type="button" onClick={handleSubmit} disabled={loading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            padding: '14px', borderRadius: '12px', border: 'none',
            background: '#67bed9', color: '#fff', fontSize: '14px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
            boxShadow: '0 4px 20px #67bed930',
          }}>
            {loading
              ? <><div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '2px solid #ffffff44', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />Salvando...</>
              : <><Save size={15} />Salvar alterações</>}
          </button>
        </div>
      </div>
    </>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 20px', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ color: '#67bed9' }}>{icon}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

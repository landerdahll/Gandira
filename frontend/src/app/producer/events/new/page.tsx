'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Trash2, Plus, ArrowLeft, Calendar, MapPin, ImageIcon, Ticket, Tag, AlertTriangle, Rocket, Save, Upload, Link2, X } from 'lucide-react';
import { eventsApi, batchesApi } from '@/lib/api';

interface Batch {
  name: string; price: string; quantity: string;
  startsAt: string; endsAt: string; description: string;
}

const inp: React.CSSProperties = {
  width: '100%', background: '#0f0f0f', border: '1px solid #252525',
  borderRadius: '10px', padding: '11px 14px', color: '#fff',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

const CATEGORIES = ['Música', 'Festa', 'Festival', 'Outro'];
const IMAGE_MAX_MB = 5;

function emptyBatch(): Batch {
  return { name: '', price: '', quantity: '', startsAt: '', endsAt: '', description: '' };
}

type ConfirmType = 'cancel' | 'publish' | 'draft' | null;
type ImageMode = 'upload' | 'url';

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [publishAfter, setPublishAfter] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmType>(null);
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

  const [batches, setBatches] = useState<Batch[]>([emptyBatch()]);

  function setField(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function setBatch(i: number, k: keyof Batch, v: string) {
    setBatches(b => b.map((item, idx) => idx === i ? { ...item, [k]: v } : item));
  }

  function addBatch() { setBatches(b => [...b, emptyBatch()]); }
  function removeBatch(i: number) { setBatches(b => b.filter((_, idx) => idx !== i)); }

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

  function validateAndConfirm(type: 'publish' | 'draft') {
    if (!form.title.trim()) { toast.error('Preencha o título do evento'); return; }
    if (!form.description.trim()) { toast.error('Preencha a descrição'); return; }
    if (!form.venue.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim()) {
      toast.error('Preencha todos os campos do local'); return;
    }
    if (!form.startDate || !form.endDate) { toast.error('Preencha as datas do evento'); return; }
    if (batches.length === 0) { toast.error('Adicione pelo menos 1 lote'); return; }
    for (const b of batches) {
      if (!b.name || !b.price || !b.quantity || !b.startsAt || !b.endsAt) {
        toast.error('Preencha todos os campos obrigatórios dos lotes'); return;
      }
    }
    setPublishAfter(type === 'publish');
    setConfirm(type);
  }

  async function handleSubmit() {
    if (submitting.current) return;
    submitting.current = true;
    setConfirm(null);
    setLoading(true);
    try {
      const eventRes = await eventsApi.create({
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

      const eventId = eventRes.data.id;
      await Promise.all(
        batches.map((b, i) =>
          batchesApi.create(eventId, {
            name: b.name, description: b.description || undefined,
            price: parseFloat(b.price), quantity: parseInt(b.quantity),
            startsAt: new Date(b.startsAt).toISOString(),
            endsAt: new Date(b.endsAt).toISOString(),
            sortOrder: i + 1,
          })
        )
      );

      if (publishAfter) {
        await eventsApi.publish(eventId);
        toast.success('Evento criado e publicado!');
      } else {
        toast.success('Evento salvo como rascunho!');
      }

      router.push('/producer/dashboard');
    } catch (e: any) {
      const msg = e.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao criar evento'));
      submitting.current = false;
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Back link */}
      <Link href="/producer/dashboard" style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        color: '#555', textDecoration: 'none', fontSize: '13px', marginBottom: '40px',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = '#67bed9')}
        onMouseLeave={e => (e.currentTarget.style.color = '#555')}
      >
        <ArrowLeft size={15} /> Voltar ao dashboard
      </Link>

      {/* Hero title */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: '10px' }}>
          Novo <span style={{ color: '#67bed9' }}>Evento</span>
        </h1>
        <p style={{ fontSize: '15px', color: '#555' }}>Preencha as informações abaixo para criar e publicar seu evento</p>
      </div>

      {/* Form */}
      <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Informações ───────────────────────────────────────────────── */}
        <Card icon={<Tag size={15} />} title="Informações do Evento">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field label="Título *">
              <input style={inp} required value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="Ex: Festival de Verão 2026"
                onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Descrição *">
              <textarea style={{ ...inp, minHeight: '110px', resize: 'vertical' }} required value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="Descreva o evento, atrações, informações importantes..."
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
          {/* Mode toggle */}
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
            /* Drag & drop zone */
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
                transition: 'all 0.15s',
                minHeight: '140px',
              }}
            >
              {uploadingImage ? (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #252525', borderTopColor: '#67bed9', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <Upload size={28} color={dragOver ? '#67bed9' : '#333'} />
              )}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: uploadingImage ? '#555' : '#888', marginBottom: '4px' }}>
                  {uploadingImage ? 'Enviando...' : 'Clique ou arraste a imagem aqui'}
                </p>
                <p style={{ fontSize: '12px', color: '#444' }}>JPG, PNG ou WebP · máx. {IMAGE_MAX_MB} MB · Recomendado 3:4</p>
              </div>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
            </div>
          ) : (
            /* URL input */
            <Field label="URL da imagem">
              <input style={inp} type="url" value={form.coverImage}
                onChange={e => setField('coverImage', e.target.value)}
                placeholder="https://..."
                onFocus={focus} onBlur={blur} />
            </Field>
          )}

          {/* Preview */}
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
                <p style={{ color: '#67bed9', fontWeight: 600, marginBottom: '2px' }}>Capa selecionada</p>
                <p>Verifique se a imagem está nítida e tem boa proporção vertical.</p>
              </div>
            </div>
          )}
        </Card>

        {/* ── Data e horário ────────────────────────────────────────────── */}
        <Card icon={<Calendar size={15} />} title="Data e Horário">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Início do evento *">
              <input type="datetime-local" style={{ ...inp, colorScheme: 'dark' }} required value={form.startDate}
                onChange={e => setField('startDate', e.target.value)} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Término do evento *">
              <input type="datetime-local" style={{ ...inp, colorScheme: 'dark' }} required value={form.endDate}
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
                <input style={inp} required value={form.venue}
                  onChange={e => setField('venue', e.target.value)} placeholder="Ex: Parque Barigui"
                  onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Endereço *">
                <input style={inp} required value={form.address}
                  onChange={e => setField('address', e.target.value)} placeholder="Rua, número, bairro"
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '12px' }}>
              <Field label="Cidade *">
                <input style={inp} required value={form.city}
                  onChange={e => setField('city', e.target.value)} placeholder="Ex: Porto Alegre"
                  onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="UF *">
                <input style={{ ...inp, textTransform: 'uppercase' }} required maxLength={2} value={form.state}
                  onChange={e => setField('state', e.target.value.toUpperCase())} placeholder="RS"
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>
          </div>
        </Card>

        {/* ── Lotes ─────────────────────────────────────────────────────── */}
        <Card icon={<Ticket size={15} />} title="Lotes de Ingressos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {batches.map((b, i) => (
              <div key={i} style={{ background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#67bed9' }}>Lote {i + 1}</span>
                  {batches.length > 1 && (
                    <button type="button" onClick={() => removeBatch(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', display: 'flex', padding: '2px' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Field label="Nome *">
                    <input style={inp} required value={b.name} onChange={e => setBatch(i, 'name', e.target.value)} placeholder="Ex: 1º Lote" onFocus={focus} onBlur={blur} />
                  </Field>
                  <Field label="Descrição">
                    <input style={inp} value={b.description} onChange={e => setBatch(i, 'description', e.target.value)} placeholder="Ex: Pista inteira" onFocus={focus} onBlur={blur} />
                  </Field>
                  <Field label="Preço (R$) *">
                    <input style={inp} type="number" min="0" step="0.01" required value={b.price} onChange={e => setBatch(i, 'price', e.target.value)} placeholder="80.00" onFocus={focus} onBlur={blur} />
                  </Field>
                  <Field label="Quantidade *">
                    <input style={inp} type="number" min="1" required value={b.quantity} onChange={e => setBatch(i, 'quantity', e.target.value)} placeholder="200" onFocus={focus} onBlur={blur} />
                  </Field>
                  <Field label="Início das vendas *">
                    <input style={{ ...inp, colorScheme: 'dark' }} type="datetime-local" required value={b.startsAt} onChange={e => setBatch(i, 'startsAt', e.target.value)} onFocus={focus} onBlur={blur} />
                  </Field>
                  <Field label="Fim das vendas *">
                    <input style={{ ...inp, colorScheme: 'dark' }} type="datetime-local" required value={b.endsAt} onChange={e => setBatch(i, 'endsAt', e.target.value)} onFocus={focus} onBlur={blur} />
                  </Field>
                </div>
              </div>
            ))}

            <button type="button" onClick={addBatch} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              width: '100%', padding: '11px', borderRadius: '12px',
              border: '1px dashed #2a2a2a', background: 'none',
              color: '#555', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#67bed9'; e.currentTarget.style.color = '#67bed9'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#555'; }}
            >
              <Plus size={14} /> Adicionar lote
            </button>
          </div>
        </Card>

        {/* ── Ações ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', paddingTop: '8px', paddingBottom: '48px' }}>
          <button type="button" onClick={() => setConfirm('cancel')} style={{
            padding: '14px', borderRadius: '12px', border: '1px solid #252525',
            background: 'transparent', color: '#666', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#aaa'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = '#666'; }}
          >
            Cancelar
          </button>

          <button type="button" onClick={() => validateAndConfirm('draft')} disabled={loading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            padding: '14px', borderRadius: '12px', border: '1px solid #67bed9',
            background: 'transparent', color: '#67bed9', fontSize: '14px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
          }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#67bed911'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Save size={15} /> Rascunho
          </button>

          <button type="button" onClick={() => validateAndConfirm('publish')} disabled={loading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            padding: '14px', borderRadius: '12px', border: 'none',
            background: '#67bed9', color: '#fff', fontSize: '14px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
            boxShadow: '0 4px 20px #67bed930',
          }}>
            {loading
              ? <><div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '2px solid #ffffff44', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />Criando...</>
              : <><Rocket size={15} />Publicar</>}
          </button>
        </div>
      </div>

      {/* ── Modais de confirmação ──────────────────────────────────────── */}
      {confirm === 'cancel' && (
        <ConfirmModal
          icon={<AlertTriangle size={22} color="#f59e0b" />}
          title="Descartar alterações?"
          description="Você perderá tudo que preencheu. Esta ação não pode ser desfeita."
          confirmLabel="Sim, descartar"
          confirmStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa' }}
          onConfirm={() => router.push('/producer/dashboard')}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'draft' && (
        <ConfirmModal
          icon={<Save size={22} color="#67bed9" />}
          title="Salvar como rascunho?"
          description={`"${form.title || 'Seu evento'}" será salvo e ficará invisível ao público até você publicar.`}
          confirmLabel="Salvar rascunho"
          confirmStyle={{ background: '#67bed9', border: 'none', color: '#fff', boxShadow: '0 4px 16px #67bed930' }}
          onConfirm={handleSubmit}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'publish' && (
        <ConfirmModal
          icon={<Rocket size={22} color="#67bed9" />}
          title="Publicar evento?"
          description={`"${form.title || 'Seu evento'}" ficará visível para compra imediatamente após a criação.`}
          confirmLabel="Sim, publicar"
          confirmStyle={{ background: '#67bed9', border: 'none', color: '#fff', boxShadow: '0 4px 16px #67bed930' }}
          onConfirm={handleSubmit}
          onCancel={() => setConfirm(null)}
        />
      )}
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

function ConfirmModal({ icon, title, description, confirmLabel, confirmStyle, onConfirm, onCancel }: {
  icon: React.ReactNode; title: string; description: string;
  confirmLabel: string; confirmStyle: React.CSSProperties;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ width: '100%', maxWidth: '360px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '20px', padding: '28px', boxShadow: '0 32px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{title}</h3>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>{description}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '24px' }}>
          <button onClick={onCancel} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #252525', background: 'transparent', color: '#666', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Voltar
          </button>
          <button onClick={onConfirm} style={{ padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', ...confirmStyle }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

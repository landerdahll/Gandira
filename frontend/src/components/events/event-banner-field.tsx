'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Link2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '@/lib/api';

const IMAGE_MAX_MB = 5;
type ImageMode = 'upload' | 'url';

export function EventBannerField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [mode, setMode] = useState<ImageMode>(value ? 'url' : 'upload');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      toast.error(`O banner deve ter no máximo ${IMAGE_MAX_MB} MB`);
      return;
    }
    setUploading(true);
    try {
      const response = await eventsApi.uploadImage(file);
      onChange(response.data.url);
      toast.success('Banner enviado!');
    } catch {
      toast.error('Erro ao enviar banner');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function drop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 20px', borderBottom: '1px solid #1a1a1a' }}>
        <ImageIcon size={15} color="#67bed9" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Banner</span>
      </div>
      <div style={{ padding: 20 }}>
        <p style={{ color: '#555', fontSize: 12, marginBottom: 14 }}>Recomendado 7:3.</p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#0a0a0a', padding: 4, borderRadius: 10 }}>
          {(['upload', 'url'] as ImageMode[]).map(option => (
            <button key={option} type="button" onClick={() => setMode(option)} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: mode === option ? '#1a1a1a' : 'transparent', color: mode === option ? '#fff' : '#555', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {option === 'upload' ? <><Upload size={13} /> Upload de arquivo</> : <><Link2 size={13} /> Inserir URL</>}
            </button>
          ))}
        </div>

        {mode === 'upload' ? (
          <div onClick={() => !uploading && inputRef.current?.click()} onDragOver={event => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={drop} style={{ border: `2px dashed ${dragOver ? '#67bed9' : '#252525'}`, borderRadius: 14, padding: '28px 20px', minHeight: 128, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: uploading ? 'wait' : 'pointer', background: dragOver ? '#67bed908' : 'transparent' }}>
            {uploading ? <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #252525', borderTopColor: '#67bed9', animation: 'spin 0.8s linear infinite' }} /> : <Upload size={28} color={dragOver ? '#67bed9' : '#333'} />}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: uploading ? '#555' : '#888', marginBottom: 4 }}>{uploading ? 'Enviando...' : 'Clique ou arraste o banner aqui'}</p>
              <p style={{ fontSize: 12, color: '#444' }}>JPG, PNG ou WebP · máx. {IMAGE_MAX_MB} MB</p>
            </div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => { const file = event.target.files?.[0]; if (file) upload(file); }} />
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6, fontWeight: 500 }}>URL do banner</label>
            <input type="url" value={value} onChange={event => onChange(event.target.value)} placeholder="https://..." style={{ width: '100%', background: '#0f0f0f', border: '1px solid #252525', borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none' }} />
          </div>
        )}

        {value && (
          <div style={{ position: 'relative', marginTop: 16, width: '100%', aspectRatio: '7 / 3' }}>
            <img src={value} alt="Preview do banner" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, border: '1px solid #252525', display: 'block' }} />
            <button type="button" onClick={() => onChange('')} aria-label="Remover banner" style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: '#0a0a0add', border: '1px solid #333', color: '#aaa', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={13} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

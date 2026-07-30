'use client';

import { ExternalLink, Instagram } from 'lucide-react';
import { useOrganization } from '@/lib/organization-context';

export default function OrganizationPage() {
  const { active } = useOrganization();
  if (!active) return null;
  const organization = active.organization;
  return <section>
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
      {organization.logoUrl ? <img src={organization.logoUrl} alt={`Logo ${organization.name}`} style={{ width: 82, height: 82, borderRadius: 18, objectFit: 'cover', border: '1px solid var(--theme-border)' }}/> : <div style={{ width: 82, height: 82, borderRadius: 18, display: 'grid', placeItems: 'center', background: organization.primaryColor || '#67bed9', color: organization.secondaryColor || '#fff', fontSize: 30, fontWeight: 800 }}>{organization.name.slice(0, 1)}</div>}
      <div><p style={{ color: 'var(--theme-muted)', fontSize: 13, margin: 0 }}>Painel da organização</p><h1 style={{ fontSize: 30, margin: '3px 0' }}>{organization.name}</h1><code style={{ color: 'var(--theme-muted)' }}>{organization.slug}</code></div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
      <Info label="Website" value={organization.website} icon={<ExternalLink size={16}/>}/>
      <Info label="Instagram" value={organization.instagram} icon={<Instagram size={16}/>}/>
      <Color label="Cor primária" value={organization.primaryColor}/><Color label="Cor secundária" value={organization.secondaryColor}/>
    </div>
    <p style={{ color: 'var(--theme-muted)', fontSize: 13, marginTop: 24 }}>Os dados de branding são somente leitura nesta fase.</p>
  </section>;
}
function Info({ label, value, icon }: { label: string; value?: string | null; icon: React.ReactNode }) { return <div style={card}><span style={labelStyle}>{icon}{label}</span><span>{value || 'Não informado'}</span></div>; }
function Color({ label, value }: { label: string; value?: string | null }) { return <div style={card}><span style={labelStyle}>{label}</span><span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>{value && <i style={{ width: 18, height: 18, borderRadius: 5, background: value, border: '1px solid var(--theme-border)' }}/>} {value || 'Não informada'}</span></div>; }
const card: React.CSSProperties = { padding: 18, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', borderRadius: 14, display: 'grid', gap: 10 };
const labelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, color: 'var(--theme-muted)', fontSize: 13 };

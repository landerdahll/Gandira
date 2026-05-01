'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { reportsApi, batchesApi } from '@/lib/api';
import { ArrowLeft, Users, Ticket, DollarSign, TrendingUp, Edit2, Check, X, UserRound, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

function fmtCurrency(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Masculino',
  FEMALE: 'Feminino',
  OTHER: 'Outro',
  PREFER_NOT_TO_SAY: 'Não informado',
};
const GENDER_COLORS: Record<string, string> = {
  MALE: '#5599ff',
  FEMALE: '#ff88cc',
  OTHER: '#aa88ff',
  PREFER_NOT_TO_SAY: '#555',
};

export default function EventAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingBatch, setEditingBatch] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);

  async function load() {
    try {
      const res = await reportsApi.event(id);
      setReport(res.data);
    } catch {
      toast.error('Erro ao carregar analytics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function saveBatchQty(eventId: string, batchId: string) {
    const qty = parseInt(editQty);
    if (isNaN(qty) || qty < 1) { toast.error('Quantidade inválida'); return; }
    setSaving(true);
    try {
      await batchesApi.update(eventId, batchId, { quantity: qty });
      toast.success('Quantidade atualizada!');
      setEditingBatch(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: '80px', borderRadius: '16px', background: '#141414' }} />)}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { event, tickets, revenue, batches, audience } = report;

  const totalGender = audience.totalWithProfile ?? 0;

  // Status badge
  const STATUS: Record<string, string> = {
    ACTIVE: 'Disponível', SOLD_OUT: 'Esgotado', CANCELLED: 'Cancelado',
  };

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Link href="/producer/dashboard" style={{ color: '#555', display: 'flex' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{event.title}</h1>
          <p style={{ fontSize: '13px', color: '#555' }}>
            {new Date(event.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            {' · '}
            <span style={{ color: event.status === 'PUBLISHED' ? '#67bed9' : '#666' }}>
              {event.status === 'PUBLISHED' ? 'Publicado' : event.status}
            </span>
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="analytics-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '28px' }}>
        <KPI icon={<Ticket size={16} color="#67bed9" />} label="Ingressos vendidos" value={tickets.total} />
        <KPI icon={<Check size={16} color="#67bed9" />} label="Check-ins" value={report.checkIns.count} sub={`${report.checkIns.rate}%`} />
        <KPI
          icon={<DollarSign size={16} color="#67bed9" />}
          label="Receita bruta"
          value={showRevenue ? fmtCurrency(revenue.total) : 'R$ ••••••'}
          action={
            <button onClick={() => setShowRevenue(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0, display: 'flex', alignItems: 'center' }}>
              {showRevenue ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          }
        />
        <KPI icon={<TrendingUp size={16} color="#67bed9" />} label="Pedidos pagos" value={revenue.orders} />
      </div>

      <div className="event-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Audience profile */}
        <Section title="Perfil do público">
          {totalGender === 0 && !audience.avgAge ? (
            <p style={{ color: '#555', fontSize: '13px', padding: '12px 0' }}>Nenhum dado de perfil ainda</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Avg age highlight */}
              {audience.avgAge != null && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: '#0f0f0f', border: '1px solid #1e1e1e',
                  borderRadius: '12px', padding: '12px 16px',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '10px',
                    background: '#67bed915', border: '1px solid #67bed930',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <UserRound size={16} color="#67bed9" />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: '#444', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                      Média de idade
                    </p>
                    <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                      {audience.avgAge} <span style={{ fontSize: '13px', fontWeight: 400, color: '#555' }}>anos</span>
                    </p>
                  </div>
                  {totalGender > 0 && (
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <p style={{ fontSize: '11px', color: '#444', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                        Com perfil
                      </p>
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#aaa', margin: 0 }}>{totalGender}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Gender bars */}
              {totalGender > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {audience.gender.map((g: any) => {
                    const color = GENDER_COLORS[g.gender] ?? '#555';
                    return (
                      <div key={g.gender}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '13px', color: '#aaa' }}>{GENDER_LABELS[g.gender] ?? g.gender}</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color }}>
                            {g.pct}% <span style={{ color: '#555', fontWeight: 400 }}>({g.count})</span>
                          </span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '999px', background: '#1e1e1e' }}>
                          <div style={{ height: '100%', width: `${g.pct}%`, borderRadius: '999px', background: color, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Revenue per batch */}
        <Section title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Receita por lote</span>
            <button onClick={() => setShowRevenue(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {showRevenue ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {batches.map((b: any) => {
              const pct = revenue.total > 0 ? Math.round((b.revenue / revenue.total) * 100) : 0;
              return (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#aaa' }}>{b.name}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {showRevenue ? fmtCurrency(b.revenue) : 'R$ ••••••'}
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '999px', background: '#1e1e1e' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', background: '#67bed9' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Batches management */}
      <Section title="Lotes de ingressos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {batches.map((b: any) => {
            const isEditing = editingBatch === b.id;
            const statusColor = b.status === 'ACTIVE' ? '#67bed9' : b.status === 'SOLD_OUT' ? '#ff6b6b' : '#555';
            const pct = b.quantity > 0 ? Math.round((b.sold / b.quantity) * 100) : 0;

            return (
              <div key={b.id} style={{
                padding: '14px 16px',
                background: '#0f0f0f',
                border: '1px solid #1e1e1e',
                borderRadius: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', color: statusColor, background: '#1a1a1a' }}>
                        {STATUS[b.status] ?? b.status}
                      </span>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{b.name}</span>
                      <span style={{ fontSize: '13px', color: '#666' }}>— {fmtCurrency(Number(b.price))}</span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '5px', borderRadius: '999px', background: '#1e1e1e' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', background: pct >= 90 ? '#ff6b6b' : '#67bed9' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                        {b.sold}/{b.quantity} vendidos
                      </span>
                    </div>
                  </div>

                  {/* Edit quantity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {isEditing ? (
                      <>
                        <input
                          type="number"
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          min={b.sold}
                          style={{
                            width: '80px', padding: '6px 10px', borderRadius: '8px',
                            background: '#1a1a1a', border: '1px solid #67bed9',
                            color: '#fff', fontSize: '13px', outline: 'none',
                          }}
                          onKeyDown={e => e.key === 'Enter' && saveBatchQty(event.id, b.id)}
                          autoFocus
                        />
                        <button
                          onClick={() => saveBatchQty(event.id, b.id)}
                          disabled={saving}
                          style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#67bed9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Check size={14} color="#fff" />
                        </button>
                        <button
                          onClick={() => setEditingBatch(null)}
                          style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#1e1e1e', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={14} color="#666" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setEditingBatch(b.id); setEditQty(String(b.quantity)); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '6px 12px', borderRadius: '8px',
                          background: '#1a1a1a', border: '1px solid #252525',
                          color: '#666', fontSize: '12px', cursor: 'pointer',
                        }}
                        title="Editar quantidade"
                      >
                        <Edit2 size={12} /> Editar qtd.
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #161616' }}>
                  <Stat label="Disponíveis" value={b.available} />
                  <Stat label="Vendidos" value={b.sold} />
                  <Stat label="Receita" value={fmtCurrency(b.revenue)} highlight />
                  <Stat label="Ocupação" value={b.occupancyRate} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function KPI({ icon, label, value, sub, action }: { icon: React.ReactNode; label: string; value: any; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ padding: '16px', background: '#141414', border: '1px solid #1e1e1e', borderRadius: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        {icon}
        <span style={{ fontSize: '11px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {action && <span style={{ marginLeft: 'auto' }}>{action}</span>}
      </div>
      <p style={{ fontSize: '22px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: '#67bed9', marginTop: '4px' }}>{sub} check-in</p>}
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: '16px', overflow: 'hidden', marginBottom: '0' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: '11px', color: '#444', marginBottom: '2px' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 700, color: highlight ? '#67bed9' : '#ccc' }}>{value}</p>
    </div>
  );
}

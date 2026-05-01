'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  CheckCircle2, XCircle, Loader2, Camera, Search,
  ArrowLeft, Calendar, MapPin, QrCode, ChevronRight, X,
} from 'lucide-react';
import { checkinApi, eventsApi } from '@/lib/api';

type ScanResult = {
  valid: boolean;
  reason: string;
  holder?: { name: string; email: string; batch: string } | null;
};

type Event = {
  id: string;
  title: string;
  startDate: string;
  venue?: string;
  coverImage?: string | null;
};

export default function CheckInPage() {
  const [step, setStep] = useState<'select' | 'scan'>('select');
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Scanner
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [counters, setCounters] = useState({ approved: 0, rejected: 0 });
  const lastScanned = useRef('');
  const resultTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    eventsApi
      .list({ limit: 100 })
      .then((res) => setEvents(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, []);

  useEffect(() => () => {
    stopScanner();
    clearTimeout(resultTimeout.current);
  }, []);

  const filteredEvents = events.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.venue?.toLowerCase().includes(search.toLowerCase()),
  );

  const selectEvent = (event: Event) => {
    setSelectedEvent(event);
    setCounters({ approved: 0, rejected: 0 });
    setResult(null);
    setStep('scan');
  };

  const goBack = async () => {
    await stopScanner();
    setStep('select');
    setSelectedEvent(null);
  };

  const startScanner = async () => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 260, height: 260 } },
      onScanSuccess,
      undefined,
    );
    setIsScanning(true);
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const onScanSuccess = async (token: string) => {
    if (token === lastScanned.current || processing) return;
    lastScanned.current = token;
    setTimeout(() => { lastScanned.current = ''; }, 4000);

    setProcessing(true);
    setResult(null);

    try {
      const res = await checkinApi.scan(selectedEvent!.id, token);
      const data: ScanResult = res.data;
      setResult(data);
      setCounters((prev) =>
        data.valid
          ? { ...prev, approved: prev.approved + 1 }
          : { ...prev, rejected: prev.rejected + 1 },
      );
    } catch (e: any) {
      const err: ScanResult = { valid: false, reason: e.response?.data?.message ?? 'Erro de rede' };
      setResult(err);
      setCounters((prev) => ({ ...prev, rejected: prev.rejected + 1 }));
    } finally {
      setProcessing(false);
      clearTimeout(resultTimeout.current);
      resultTimeout.current = setTimeout(() => setResult(null), 5000);
    }
  };

  // ── Step 1: Event selection ─────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '0 16px 48px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 48 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#67bed91a', border: '1px solid #67bed930',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <QrCode size={20} color="#67bed9" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                Check-in
              </h1>
              <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
                Selecione o evento para iniciar o scanner
              </p>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#111', border: '1px solid #1e1e1e',
                borderRadius: 12, padding: '12px 14px 12px 40px',
                color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Events */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '64px 0', color: '#333' }}>
                <Loader2 size={30} style={{ margin: '0 auto', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: 13, marginTop: 12, color: '#444' }}>Carregando eventos...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <p style={{ color: '#444', fontSize: 14 }}>Nenhum evento encontrado</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => selectEvent(event)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: '#111', border: '1px solid #1a1a1a',
                    borderRadius: 14, padding: '14px 16px',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#67bed940';
                    e.currentTarget.style.background = '#0c1a1f';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1a1a1a';
                    e.currentTarget.style.background = '#111';
                  }}
                >
                  {/* Cover thumbnail */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                    background: '#181818', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {event.coverImage ? (
                      <img
                        src={event.coverImage}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Calendar size={20} color="#2a2a2a" />
                    )}
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{
                      fontSize: 15, fontWeight: 700, color: '#fff', margin: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {event.title}
                    </p>
                    <p style={{ fontSize: 12, color: '#555', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} />
                      {new Date(event.startDate).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {event.venue && (
                      <p style={{ fontSize: 12, color: '#444', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} />
                        {event.venue}
                      </p>
                    )}
                  </div>

                  <ChevronRight size={16} color="#2a2a2a" style={{ flexShrink: 0 }} />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Scanner ─────────────────────────────────────────────────────
  const total = counters.approved + counters.rejected;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Sticky top bar */}
      <div style={{
        position: 'sticky', top: 70, zIndex: 40,
        background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #141414',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          onClick={goBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#555', padding: '4px', display: 'flex', flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ fontSize: 11, color: '#444', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Evento
          </p>
          <p style={{
            fontSize: 14, fontWeight: 700, color: '#fff', margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {selectedEvent?.title}
          </p>
        </div>

        {/* Session counters */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#0a2018', border: '1px solid #1a3828',
            borderRadius: 8, padding: '5px 10px',
          }}>
            <CheckCircle2 size={13} color="#4ade80" />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#4ade80' }}>{counters.approved}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#200a0a', border: '1px solid #381818',
            borderRadius: 8, padding: '5px 10px',
          }}>
            <XCircle size={13} color="#f87171" />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#f87171' }}>{counters.rejected}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 48px' }}>
        {/* Camera box */}
        <div style={{
          background: '#0d0d0d', border: '1px solid #1a1a1a',
          borderRadius: 20, overflow: 'hidden',
          position: 'relative', marginBottom: 12,
          minHeight: isScanning ? undefined : 280,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: isScanning ? undefined : 'center',
        }}>
          <div id="qr-reader" style={{ width: '100%' }} />

          {!isScanning && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              padding: '60px 0',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20, background: '#181818',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Camera size={36} color="#2a2a2a" />
              </div>
              <p style={{ color: '#3a3a3a', fontSize: 14, margin: 0 }}>Câmera inativa</p>
            </div>
          )}

          {/* Result / loading overlay */}
          {(processing || result) && (
            <div style={{
              position: 'absolute', inset: 0,
              background: processing
                ? 'rgba(10,10,10,0.9)'
                : result?.valid
                  ? 'rgba(5,30,15,0.94)'
                  : 'rgba(30,5,5,0.94)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 14,
              padding: 28,
            }}>
              {processing ? (
                <>
                  <Loader2 size={44} color="#67bed9" style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: '#888', fontSize: 14, margin: 0 }}>Validando ingresso...</p>
                </>
              ) : result ? (
                <>
                  {result.valid
                    ? <CheckCircle2 size={72} color="#4ade80" strokeWidth={1.5} />
                    : <XCircle size={72} color="#f87171" strokeWidth={1.5} />
                  }
                  <div style={{ textAlign: 'center' }}>
                    <p style={{
                      fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 6px',
                      color: result.valid ? '#4ade80' : '#f87171',
                    }}>
                      {result.valid ? 'ENTRADA AUTORIZADA' : 'ENTRADA NEGADA'}
                    </p>
                    <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{result.reason}</p>
                  </div>

                  {result.holder && (
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 14, padding: '14px 24px', textAlign: 'center', width: '100%',
                    }}>
                      <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 2px' }}>
                        {result.holder.name}
                      </p>
                      <p style={{ fontSize: 12, color: '#555', margin: '0 0 8px' }}>
                        {result.holder.email}
                      </p>
                      {result.holder.batch && (
                        <span style={{
                          fontSize: 11, background: '#67bed915',
                          border: '1px solid #67bed930',
                          color: '#67bed9', borderRadius: 6, padding: '3px 10px', fontWeight: 600,
                        }}>
                          {result.holder.batch}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Start / Stop button */}
        <button
          onClick={isScanning ? stopScanner : startScanner}
          style={{
            width: '100%', padding: '15px 0',
            borderRadius: 14, border: 'none', cursor: 'pointer',
            fontSize: 15, fontWeight: 700,
            background: isScanning ? '#1e0a0a' : '#67bed9',
            color: isScanning ? '#f87171' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {isScanning ? <><X size={17} /> Parar scanner</> : <><Camera size={17} /> Iniciar scanner</>}
        </button>

        {/* Session summary */}
        {total > 0 && (
          <div style={{
            marginTop: 20, background: '#111', border: '1px solid #1a1a1a',
            borderRadius: 16, padding: '16px 20px',
          }}>
            <p style={{
              fontSize: 11, color: '#3a3a3a', margin: '0 0 14px',
              textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600,
            }}>
              Resumo da sessão
            </p>
            <div style={{ display: 'flex', gap: 0 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 32, fontWeight: 900, color: '#4ade80', margin: 0, letterSpacing: '-1px' }}>
                  {counters.approved}
                </p>
                <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>Autorizados</p>
              </div>
              <div style={{ width: '1px', background: '#1a1a1a', margin: '0 8px' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 32, fontWeight: 900, color: '#f87171', margin: 0, letterSpacing: '-1px' }}>
                  {counters.rejected}
                </p>
                <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>Negados</p>
              </div>
              <div style={{ width: '1px', background: '#1a1a1a', margin: '0 8px' }} />
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-1px' }}>
                  {total}
                </p>
                <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>Total</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

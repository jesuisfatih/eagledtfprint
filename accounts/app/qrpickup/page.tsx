'use client';

import { config } from '@/lib/config';
import { useEffect, useRef, useState } from 'react';

const API_URL = config.apiUrl;

interface ShelfInfo {
  code: string;
  name: string;
  description: string;
}

interface ScanResult {
  orderNumber: string;
  shelf: ShelfInfo | null;
  status: string;
  customerName: string;
}

interface EmailOrder {
  orderNumber: string;
  qrCode: string;
  status: string;
  shelf: { code: string; name: string } | null;
}

export default function QRPickupPage() {
  const [mode, setMode] = useState<'idle' | 'scanning' | 'result' | 'email'>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [emailOrders, setEmailOrders] = useState<EmailOrder[]>([]);
  const [email, setEmail] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Check if user has a token (from accounts login)
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('eagle_token');

  useEffect(() => {
    // Auto-focus QR input
    if (mode === 'idle' || mode === 'scanning') {
      inputRef.current?.focus();
    }
  }, [mode]);

  // Reset after 15 seconds
  useEffect(() => {
    if (mode === 'result') {
      const timer = setTimeout(() => {
        setScanResult(null);
        setMode('idle');
        setQrInput('');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const handleScan = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/pickup/scan/${code.trim()}`);
      if (!res.ok) throw new Error('QR kod geçersiz');
      const data: ScanResult = await res.json();
      setScanResult(data);
      setMode('result');
    } catch (e: any) {
      setError(e.message || 'QR tarama hatası');
      setTimeout(() => setError(''), 3000);
    }
    setLoading(false);
    setQrInput('');
  };

  const handleEmailVerify = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/pickup/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setEmailOrders(data);
        setMode('result');
      } else {
        setError('Bu email için hazır sipariş bulunamadı.');
        setTimeout(() => setError(''), 4000);
      }
    } catch (e: any) {
      setError('Doğrulama hatası');
    }
    setLoading(false);
  };

  const handleQrKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan(qrInput);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #101830 40%, #1a1250 70%, #0a0d14 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Mesh */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `
          radial-gradient(at 20% 30%, rgba(99,131,255,0.12) 0, transparent 60%),
          radial-gradient(at 80% 70%, rgba(167,139,250,0.08) 0, transparent 50%),
          radial-gradient(at 50% 50%, rgba(56,189,248,0.06) 0, transparent 60%)
        `,
      }} />

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🦅</div>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: '#fff',
          background: 'linear-gradient(135deg, #6383ff, #a78bfa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {config.brandName} — Pickup
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 4 }}>
          Siparişinizi almak için QR kodunuzu okutun
        </p>
      </div>

      {/* Main Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 520,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 36,
      }}>
        {/* IDLE / SCANNING MODE */}
        {(mode === 'idle' || mode === 'scanning') && (
          <>
            {/* QR Scanner Input - hidden, captures barcode scanner data */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 100, height: 100, borderRadius: 20,
                background: 'linear-gradient(135deg, rgba(99,131,255,0.15), rgba(167,139,250,0.15))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                border: '2px solid rgba(99,131,255,0.2)',
                animation: 'pulse 2s ease-in-out infinite',
              }}>
                <i className="ti ti-qrcode" style={{ fontSize: 48, color: '#6383ff' }} />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 16 }}>
                QR kodunuzu tarayıcıya gösterin
              </p>
              <input
                ref={inputRef}
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                onKeyDown={handleQrKeyDown}
                placeholder="QR kodu..."
                autoFocus
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 16, textAlign: 'center', outline: 'none',
                  letterSpacing: 2,
                }}
              />
              {loading && <p style={{ color: '#6383ff', marginTop: 12, fontSize: 14 }}>Kontrol ediliyor...</p>}
            </div>

            {/* Separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>veya</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Email Verify */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                E-posta adresiniz ile siparişlerinizi sorgulayın
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={emailInputRef}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEmailVerify(); }}
                  placeholder="ornek@email.com"
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 14, outline: 'none',
                  }}
                />
                <button
                  onClick={handleEmailVerify}
                  disabled={loading || !email.trim()}
                  style={{
                    padding: '12px 20px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #6383ff, #a78bfa)',
                    color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer',
                    fontSize: 14, opacity: !email.trim() ? 0.5 : 1,
                  }}
                >
                  Sorgula
                </button>
              </div>
            </div>
          </>
        )}

        {/* RESULT MODE — QR Scan */}
        {mode === 'result' && scanResult && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: scanResult.shelf ? 'rgba(46,204,113,0.15)' : 'rgba(241,196,15,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              border: `2px solid ${scanResult.shelf ? 'rgba(46,204,113,0.3)' : 'rgba(241,196,15,0.3)'}`,
            }}>
              <i className={`ti ${scanResult.shelf ? 'ti-check' : 'ti-alert-circle'}`}
                style={{ fontSize: 40, color: scanResult.shelf ? '#2ecc71' : '#f1c40f' }} />
            </div>

            <h2 style={{ color: '#fff', fontSize: 22, marginBottom: 8 }}>
              Sipariş #{scanResult.orderNumber}
            </h2>

            {scanResult.customerName && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 }}>
                {scanResult.customerName}
              </p>
            )}

            {scanResult.shelf ? (
              <div style={{
                padding: 24, borderRadius: 16,
                background: 'rgba(46,204,113,0.08)',
                border: '1px solid rgba(46,204,113,0.15)',
                marginBottom: 20,
              }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Raf Konumu
                </p>
                <p style={{
                  fontSize: 48, fontWeight: 800, color: '#2ecc71',
                  letterSpacing: 4,
                }}>
                  {scanResult.shelf.code}
                </p>
                {scanResult.shelf.name && (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 }}>
                    {scanResult.shelf.name}
                  </p>
                )}
                {scanResult.shelf.description && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
                    {scanResult.shelf.description}
                  </p>
                )}
              </div>
            ) : (
              <div style={{
                padding: 20, borderRadius: 16,
                background: 'rgba(241,196,15,0.08)',
                border: '1px solid rgba(241,196,15,0.15)',
                marginBottom: 20,
              }}>
                <p style={{ color: '#f1c40f', fontSize: 14 }}>
                  Siparişiniz henüz rafa atanmadı. Lütfen personele danışın.
                </p>
              </div>
            )}

            <button onClick={() => { setMode('idle'); setScanResult(null); }}
              style={{
                padding: '14px 32px', borderRadius: 12,
                background: 'rgba(255,255,255,0.08)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
                fontSize: 14, fontWeight: 500,
              }}>
              Yeni Tarama
            </button>
          </div>
        )}

        {/* RESULT MODE — Email Orders */}
        {mode === 'result' && emailOrders.length > 0 && !scanResult && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontSize: 20, marginBottom: 4 }}>
                Hazır Siparişleriniz
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                {email}
              </p>
            </div>

            {emailOrders.map((o, i) => (
              <div key={i} style={{
                padding: 16, borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>#{o.orderNumber}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{o.status === 'ready' ? 'Hazır' : 'Bildirildi'}</div>
                </div>
                {o.shelf ? (
                  <div style={{
                    padding: '8px 18px', borderRadius: 10,
                    background: 'rgba(46,204,113,0.12)',
                    color: '#2ecc71', fontWeight: 800, fontSize: 22,
                    letterSpacing: 2,
                  }}>
                    {o.shelf.code}
                  </div>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Personele danışın</span>
                )}
              </div>
            ))}

            <button onClick={() => { setMode('idle'); setEmailOrders([]); setEmail(''); }}
              style={{
                width: '100%', marginTop: 16, padding: '14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.08)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
              }}>
              Geri
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            position: 'absolute', bottom: -60, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 24px', borderRadius: 10,
            background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.2)',
            color: '#e74c3c', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <p style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 40 }}>
        © {config.brandName} — Powered by Eagle B2B Engine
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,131,255,0.2); }
          50% { box-shadow: 0 0 0 20px rgba(99,131,255,0); }
        }
      `}</style>
    </div>
  );
}

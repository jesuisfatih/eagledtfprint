'use client';

import { PageHeader, SearchInput, showToast, StatsCard, Tabs } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ActiveVisitor {
  sessionId: string;
  status: 'online' | 'away' | 'offline';
  companyId?: string;
  companyName?: string;
  companyUserId?: string;
  userName?: string;
  userEmail?: string;
  platform?: string;
  currentPage: { url: string; path: string; title: string };
  viewport: { width: number; height: number };
  isIdentified: boolean;
  lastSeen: string;
  secondsAgo: number;
}

interface ActiveData {
  totalOnline: number;
  totalAway: number;
  totalVisitors: number;
  identifiedCount: number;
  activeCompanyCount: number;
  visitors: ActiveVisitor[];
}

interface ReplayData {
  session: {
    id: string;
    sessionId: string;
    companyName?: string;
    userName: string;
    platform?: string;
    userAgent?: string;
    startedAt: string;
    pageViews: number;
  } | null;
  events: any[];
  totalEvents: number;
  durationMs: number;
}

export default function LiveVisitorsPage() {
  const [data, setData] = useState<ActiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('visitors');
  const [search, setSearch] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<ActiveVisitor | null>(null);
  const [replay, setReplay] = useState<ReplayData | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const rrwebPlayerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/fingerprint/active-visitors');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchActive();
    const interval = setInterval(fetchActive, 10000);
    return () => clearInterval(interval);
  }, [fetchActive]);

  const loadReplay = async (sessionId: string) => {
    setReplayLoading(true);
    try {
      const res = await adminFetch(`/api/v1/fingerprint/replay?sessionId=${sessionId}`);
      if (res.ok) {
        const d = await res.json();
        setReplay(d);
      } else {
        showToast('Failed to load replay data', 'danger');
      }
    } catch {
      showToast('Failed to load replay', 'danger');
    } finally {
      setReplayLoading(false);
    }
  };

  // Initialize rrweb-player when replay data changes
  useEffect(() => {
    if (!replay || !replay.events || replay.events.length === 0 || !rrwebPlayerRef.current) return;

    // Cleanup old player
    if (playerInstanceRef.current) {
      playerInstanceRef.current = null;
      if (rrwebPlayerRef.current) rrwebPlayerRef.current.innerHTML = '';
    }

    const initPlayer = async () => {
      try {
        const rrwebPlayer = await import('rrweb-player');
        await import('rrweb-player/dist/style.css');
        if (!rrwebPlayerRef.current) return;

        const RRWebPlayer = rrwebPlayer.default || rrwebPlayer;
        playerInstanceRef.current = new RRWebPlayer({
          target: rrwebPlayerRef.current,
          props: {
            events: replay.events,
            width: rrwebPlayerRef.current.clientWidth,
            height: Math.min(600, Math.round(rrwebPlayerRef.current.clientWidth * 9 / 16)),
            autoPlay: false,
            showController: true,
            speedOption: [1, 2, 4, 8],
            skipInactive: true,
            mouseTail: {
              strokeStyle: '#007aff',
              lineWidth: 2,
              lineCap: 'round',
              lineJoin: 'round',
            },
          },
        });
      } catch (err) {
        console.error('Failed to init rrweb-player:', err);
      }
    };

    initPlayer();
    return () => { playerInstanceRef.current = null; };
  }, [replay]);

  const closeReplay = () => {
    playerInstanceRef.current = null;
    if (rrwebPlayerRef.current) rrwebPlayerRef.current.innerHTML = '';
    setReplay(null);
    setSelectedVisitor(null);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPageLabel = (path: string) => {
    if (path === '/' || path === '') return 'Homepage';
    if (path.includes('/products/')) return path.split('/products/')[1]?.replace(/-/g, ' ');
    if (path.includes('/collections/')) return 'Collection: ' + path.split('/collections/')[1]?.replace(/-/g, ' ');
    if (path.includes('/cart')) return 'Cart';
    if (path.includes('/checkout')) return 'Checkout';
    if (path.includes('/account')) return 'Account';
    return path.replace(/^\//, '').replace(/-/g, ' ');
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const seconds = s % 60;
    return `${m}:${seconds.toString().padStart(2, '0')}`;
  };

  const visitors = data?.visitors || [];
  const filteredVisitors = visitors.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.userName?.toLowerCase().includes(q) ||
      v.companyName?.toLowerCase().includes(q) ||
      v.userEmail?.toLowerCase().includes(q) ||
      v.currentPage?.path?.toLowerCase().includes(q));
  });

  const companies = [...new Set(filteredVisitors.filter(v => v.companyName).map(v => v.companyName))];

  return (
    <div>
      <PageHeader
        title="Live Visitors"
        subtitle={loading ? 'Loading...' : `${data?.totalOnline || 0} online now · ${data?.activeCompanyCount || 0} companies active`}
        actions={[{ label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: fetchActive }]}
      />

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <StatsCard title="Online Now" value={data?.totalOnline || 0} icon="antenna-bars-5" iconColor="success" loading={loading} meta={data?.totalOnline ? `${data.totalAway} away` : undefined} />
        <StatsCard title="Total Visitors" value={data?.totalVisitors || 0} icon="users" iconColor="primary" loading={loading} />
        <StatsCard title="Identified" value={data?.identifiedCount || 0} icon="user-check" iconColor="info" loading={loading} />
        <StatsCard title="Active Companies" value={data?.activeCompanyCount || 0} icon="building" iconColor="warning" loading={loading} />
        <StatsCard title="Anonymous" value={(data?.totalVisitors || 0) - (data?.identifiedCount || 0)} icon="user-question" iconColor="secondary" loading={loading} />
      </div>

      <Tabs
        tabs={[
          { id: 'visitors', label: 'All Visitors', icon: 'users', count: filteredVisitors.length },
          { id: 'companies', label: 'Active Companies', icon: 'building', count: companies.length },
          { id: 'replay', label: 'Session Replay', icon: 'player-play' },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id)}
      />

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search visitors, companies, pages..." />
      </div>

      {/* All Visitors Tab */}
      {tab === 'visitors' && (
        <div className="apple-card">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner-apple" /></div>
          ) : filteredVisitors.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <div className="empty-state-icon"><i className="ti ti-antenna-bars-off" /></div>
              <h4 className="empty-state-title">No Active Visitors</h4>
              <p className="empty-state-description">Visitors will appear here in real-time as they browse your store.</p>
            </div>
          ) : (
            <div>
              {filteredVisitors.map((v) => (
                <div key={v.sessionId} className="active-user-card" style={{ cursor: 'pointer' }}
                  onClick={() => { setSelectedVisitor(v); setTab('replay'); loadReplay(v.sessionId); }}
                >
                  <div style={{ position: 'relative' }}>
                    <div className="active-user-avatar" style={v.isIdentified ? {} : { background: 'var(--text-quaternary)' }}>
                      {getInitials(v.userName || v.userEmail)}
                    </div>
                    <span className={`presence-dot ${v.status}`} style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, border: '2px solid white' }} />
                  </div>
                  <div className="active-user-info">
                    <div className="active-user-name">
                      {v.userName || v.userEmail || 'Anonymous Visitor'}
                      {v.companyName && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6 }}>@ {v.companyName}</span>}
                    </div>
                    <div className="active-user-meta">
                      <i className="ti ti-device-desktop" style={{ fontSize: 12, marginRight: 4 }} />
                      {v.platform || 'Unknown'} · {v.viewport?.width}×{v.viewport?.height}
                      {v.secondsAgo > 0 && ` · ${v.secondsAgo}s ago`}
                    </div>
                  </div>
                  <span className="active-user-page">
                    <i className="ti ti-file" style={{ fontSize: 11, marginRight: 3 }} />
                    {getPageLabel(v.currentPage?.path || '')}
                  </span>
                  <div className="active-user-actions">
                    <button className="btn-apple ghost sm" title="Watch session replay" onClick={(e) => { e.stopPropagation(); setSelectedVisitor(v); setTab('replay'); loadReplay(v.sessionId); }}>
                      <i className="ti ti-eye" />
                    </button>
                    <button className="btn-apple ghost sm" title="Send push" onClick={(e) => { e.stopPropagation(); showToast('Push marketing coming soon!', 'info'); }}>
                      <i className="ti ti-send" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Companies Tab */}
      {tab === 'companies' && (
        <div>
          {companies.length === 0 ? (
            <div className="apple-card">
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon"><i className="ti ti-building" /></div>
                <h4 className="empty-state-title">No Active Companies</h4>
                <p className="empty-state-description">Companies will appear when their users browse your store.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {companies.map((companyName) => {
                const companyVisitors = filteredVisitors.filter(v => v.companyName === companyName);
                const onlineCount = companyVisitors.filter(v => v.status === 'online').length;
                return (
                  <div key={companyName} className="push-card">
                    <div className="push-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 14 }}>
                          {companyName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="push-card-title">{companyName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{companyVisitors.length} user{companyVisitors.length !== 1 ? 's' : ''} active</div>
                        </div>
                      </div>
                      <span className={`presence-dot ${onlineCount > 0 ? 'online pulse-live' : 'away'}`} />
                    </div>
                    <div className="push-card-body">
                      {companyVisitors.map(v => (
                        <div key={v.sessionId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 }}>
                          <span className={`presence-dot ${v.status}`} />
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{v.userName || v.userEmail || 'Anonymous'}</span>
                          <span style={{ color: 'var(--text-quaternary)', fontSize: 11, marginLeft: 'auto' }}>{getPageLabel(v.currentPage?.path || '')}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <button className="btn-apple primary sm" onClick={() => showToast('Push discount coming soon!', 'info')}><i className="ti ti-discount" /> Push Discount</button>
                      <button className="btn-apple secondary sm" onClick={() => showToast('Popup coming soon!', 'info')}><i className="ti ti-message-2" /> Send Popup</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Session Replay Tab — rrweb Player */}
      {tab === 'replay' && (
        <div>
          {replayLoading ? (
            <div className="apple-card" style={{ padding: 48, textAlign: 'center' }}>
              <div className="spinner-apple" />
              <p style={{ marginTop: 16, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading session replay...</p>
            </div>
          ) : !replay ? (
            <div className="apple-card">
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon"><i className="ti ti-player-play" /></div>
                <h4 className="empty-state-title">Select a Visitor to Watch</h4>
                <p className="empty-state-description">
                  Click on any active visitor to replay their full session — see exactly what they saw, where they clicked, scrolled, and typed.
                  <br />
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Powered by rrweb — Clarity-grade session replay</span>
                </p>
              </div>
            </div>
          ) : replay.events.length === 0 ? (
            <div className="apple-card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="active-user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{getInitials(replay.session?.userName)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{replay.session?.userName || 'Anonymous'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>No recording data yet — waiting for events</div>
                </div>
                <button className="btn-apple ghost sm" onClick={closeReplay}><i className="ti ti-x" /> Close</button>
              </div>
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon"><i className="ti ti-movie-off" /></div>
                <h4 className="empty-state-title">No Recording Data Yet</h4>
                <p className="empty-state-description">This session doesn&apos;t have any rrweb events recorded yet. Events are flushed every 10 seconds — check back shortly.</p>
                <button className="btn-apple secondary sm" style={{ marginTop: 16 }} onClick={() => selectedVisitor && loadReplay(selectedVisitor.sessionId)}>
                  <i className="ti ti-refresh" /> Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="apple-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Session Info Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-primary)' }}>
                <div className="active-user-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{getInitials(replay.session?.userName)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {replay.session?.userName || 'Anonymous'}
                    {replay.session?.companyName && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6 }}>@ {replay.session.companyName}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', gap: 12, alignItems: 'center', marginTop: 2 }}>
                    <span><i className="ti ti-device-desktop" style={{ fontSize: 11, marginRight: 3 }} />{replay.session?.platform || 'Unknown'}</span>
                    <span><i className="ti ti-clock" style={{ fontSize: 11, marginRight: 3 }} />{formatDuration(replay.durationMs)}</span>
                    <span><i className="ti ti-cursor-text" style={{ fontSize: 11, marginRight: 3 }} />{replay.totalEvents} events</span>
                    {replay.session?.pageViews && <span><i className="ti ti-file" style={{ fontSize: 11, marginRight: 3 }} />{replay.session.pageViews} pages</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-apple secondary sm" onClick={() => selectedVisitor && loadReplay(selectedVisitor.sessionId)} title="Refresh replay data">
                    <i className="ti ti-refresh" />
                  </button>
                  <button className="btn-apple ghost sm" onClick={closeReplay}><i className="ti ti-x" /> Close</button>
                </div>
              </div>

              {/* rrweb Player Container */}
              <div ref={rrwebPlayerRef} style={{ width: '100%', background: '#1a1a2e', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

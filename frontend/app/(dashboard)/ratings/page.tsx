'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

function StarBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div className="progress-bar" style={{ flex:1 }}>
        <div className="progress-fill" style={{ width:`${pct}%` }} />
      </div>
      <span style={{ fontSize:11, color:'var(--text-m)', width:24, textAlign:'right' }}>{count}</span>
    </div>
  );
}

export default function RatingsPage() {
  const [drivers,    setDrivers]    = useState<any[]>([]);
  const [flaggedR,   setFlaggedR]   = useState<any[]>([]);
  const [leaderboard,setLeaderboard]= useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<'overview'|'leaderboard'>('overview');

  useEffect(() => {
    Promise.all([
      api.admin.getDrivers(),
      api.admin.getFlaggedRiders(),
      api.admin.getLeaderboard(),
    ]).then(([d, fr, lb]) => {
      setDrivers(d);
      setFlaggedR(fr);
      setLeaderboard(lb);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ratedDrivers  = drivers.filter(d => d.avg_rating > 0);
  const flaggedDrivers= drivers.filter(d => d.avg_rating > 0 && d.avg_rating < 3.5);
  const avgDriver     = ratedDrivers.length > 0
    ? ratedDrivers.reduce((s, d) => s + Number(d.avg_rating), 0) / ratedDrivers.length : 0;

  const distribution = [5,4,3,2,1].map(s => ({
    score: s,
    count: ratedDrivers.filter(d => Math.round(Number(d.avg_rating)) === s).length,
  }));

  const lbCities = Array.from(new Set(leaderboard.map((d: any) => d.city).filter(Boolean)));
  const rankIcon = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ratings & Reviews</div>
          <div className="page-subtitle">Driver ratings, system flags & leaderboard</div>
        </div>
      </div>

      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-label">Avg Driver Rating</div>
          <div className="stat-value accent">{avgDriver > 0 ? avgDriver.toFixed(2) : '—'}</div>
          <div className="stat-meta">across {ratedDrivers.length} rated drivers</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🚩</span>
          <div className="stat-label">Flagged Drivers</div>
          <div className="stat-value" style={{ color:'var(--danger-fg)' }}>{flaggedDrivers.length}</div>
          <div className="stat-meta">below 3.5 threshold</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⚠️</span>
          <div className="stat-label">Flagged Riders</div>
          <div className="stat-value" style={{ color:'var(--warn-fg)' }}>{flaggedR.length}</div>
          <div className="stat-meta">below 3.0 threshold</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏆</span>
          <div className="stat-label">Leaderboard Cities</div>
          <div className="stat-value">{lbCities.length}</div>
          <div className="stat-meta">with ranked drivers</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab==='overview'?' active':''}`}     onClick={() => setTab('overview')}>Overview & Flags</div>
        <div className={`tab${tab==='leaderboard'?' active':''}`}  onClick={() => setTab('leaderboard')}>Leaderboard</div>
      </div>

      {tab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">Driver Rating Distribution</div>
            <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:16 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:40, fontWeight:700, color:'var(--accent)', letterSpacing:-2 }}>
                  {avgDriver > 0 ? avgDriver.toFixed(1) : '—'}
                </div>
                <div style={{ fontSize:16, color:'var(--accent)' }}>{'★'.repeat(Math.round(avgDriver))}</div>
                <div style={{ fontSize:11, color:'var(--text-m)', marginTop:2 }}>{ratedDrivers.length} drivers</div>
              </div>
              <div style={{ flex:1 }}>
                {distribution.map(d => (
                  <div key={d.score} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:11, color:'var(--text-s)', width:10 }}>{d.score}</span>
                    <span style={{ color:'var(--accent)', fontSize:11 }}>★</span>
                    <StarBar count={d.count} total={ratedDrivers.length} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">⚠ System Flags</div>
            {loading ? (
              <div style={{ color:'var(--text-m)', fontSize:12 }}>Loading…</div>
            ) : (
              <>
                {flaggedDrivers.length > 0 && (
                  <>
                    <div style={{ fontSize:11, color:'var(--danger-fg)', marginBottom:8, fontWeight:500 }}>Drivers below 3.5 ★ — auto-suspended</div>
                    {flaggedDrivers.map(d => (
                      <div key={d.driver_id} className="metric-row">
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="avatar">{d.full_name?.[0]}</div>
                          <div>
                            <div style={{ fontSize:13 }}>{d.full_name}</div>
                            <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.city}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ color:'var(--danger-fg)', fontWeight:600 }}>★ {Number(d.avg_rating).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                    {flaggedR.length > 0 && <div className="divider" />}
                  </>
                )}
                {flaggedR.length > 0 && (
                  <>
                    <div style={{ fontSize:11, color:'var(--warn-fg)', marginBottom:8, fontWeight:500 }}>Riders below 3.0 ★ — warned</div>
                    {flaggedR.map((r: any) => (
                      <div key={r.rider_id} className="metric-row">
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="avatar">{r.full_name?.[0]}</div>
                          <div style={{ fontSize:13 }}>{r.full_name}</div>
                        </div>
                        <div style={{ color:'var(--warn-fg)', fontWeight:600 }}>★ {Number(r.avg_rating ?? 0).toFixed(2)}</div>
                      </div>
                    ))}
                  </>
                )}
                {flaggedDrivers.length === 0 && flaggedR.length === 0 && (
                  <div className="empty-state"><div className="empty-icon">✅</div><p>No flagged accounts</p></div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="grid-3">
          {lbCities.length === 0 && !loading && (
            <div className="card" style={{ gridColumn:'1/-1' }}>
              <div className="empty-state"><div className="empty-icon">🏆</div><p>No leaderboard data yet.</p></div>
            </div>
          )}
          {lbCities.map(city => (
            <div key={city} className="card">
              <div className="card-title">🏆 {city}</div>
              {leaderboard.filter((d: any) => d.city === city).map((d: any, i: number) => (
                <div key={d.driver_id} className="metric-row" style={{ alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:14, fontWeight:700, width:22, textAlign:'center' }}>{rankIcon(i)}</span>
                    <div className="avatar gold">{d.full_name?.[0]}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{d.full_name}</div>
                      <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.trips_completed} trips</div>
                    </div>
                  </div>
                  <div style={{ color:'var(--accent)', fontWeight:700, fontSize:14 }}>★ {Number(d.avg_rating).toFixed(2)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

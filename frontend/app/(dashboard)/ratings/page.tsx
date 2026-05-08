'use client';
import { useState } from 'react';
import { mockRatings, mockDrivers, mockRiders } from '@/utils/mockData';
import { renderStars, formatDateTime } from '@/utils/helpers';

const avgDriverRating = mockDrivers.filter(d=>d.avg_rating>0).reduce((s,d)=>s+d.avg_rating,0)/mockDrivers.filter(d=>d.avg_rating>0).length;
const avgRiderRating  = mockRiders.filter(r=>r.avg_rating>0).reduce((s,r)=>s+r.avg_rating,0)/mockRiders.filter(r=>r.avg_rating>0).length;
const flaggedDrivers  = mockDrivers.filter(d=>d.avg_rating>0 && d.avg_rating<3.5);
const flaggedRiders   = mockRiders.filter(r=>r.avg_rating>0 && r.avg_rating<3.0);

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
  const [tab, setTab] = useState<'overview'|'reviews'|'leaderboard'>('overview');

  const distribution = [5,4,3,2,1].map(s=>({
    score: s,
    count: mockRatings.filter(r=>r.score===s).length
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ratings & Reviews</div>
          <div className="page-subtitle">Mutual rating system, leaderboard & flags</div>
        </div>
      </div>

      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-label">Avg Driver Rating</div>
          <div className="stat-value accent">{avgDriverRating.toFixed(2)}</div>
          <div className="stat-meta">across {mockDrivers.filter(d=>d.avg_rating>0).length} rated drivers</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🧍</span>
          <div className="stat-label">Avg Rider Rating</div>
          <div className="stat-value">{avgRiderRating.toFixed(2)}</div>
          <div className="stat-meta">across {mockRiders.filter(r=>r.avg_rating>0).length} rated riders</div>
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
          <div className="stat-value" style={{ color:'var(--warn-fg)' }}>{flaggedRiders.length}</div>
          <div className="stat-meta">below 3.0 threshold</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab==='overview'?' active':''}`} onClick={()=>setTab('overview')}>Overview</div>
        <div className={`tab${tab==='reviews'?' active':''}`} onClick={()=>setTab('reviews')}>All Reviews</div>
        <div className={`tab${tab==='leaderboard'?' active':''}`} onClick={()=>setTab('leaderboard')}>Leaderboard</div>
      </div>

      {tab === 'overview' && (
        <div className="grid-2">
          {/* Rating distribution */}
          <div className="card">
            <div className="card-title">Rating Distribution</div>
            <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:16 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:40, fontWeight:700, color:'var(--accent)', letterSpacing:-2 }}>{(mockRatings.reduce((s,r)=>s+r.score,0)/mockRatings.length).toFixed(1)}</div>
                <div style={{ fontSize:16, color:'var(--accent)' }}>{'★'.repeat(Math.round(mockRatings.reduce((s,r)=>s+r.score,0)/mockRatings.length))}</div>
                <div style={{ fontSize:11, color:'var(--text-m)', marginTop:2 }}>{mockRatings.length} reviews</div>
              </div>
              <div style={{ flex:1 }}>
                {distribution.map(d=>(
                  <div key={d.score} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:11, color:'var(--text-s)', width:10 }}>{d.score}</span>
                    <span style={{ color:'var(--accent)', fontSize:11 }}>★</span>
                    <StarBar count={d.count} total={mockRatings.length} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Flagged accounts */}
          <div className="card">
            <div className="card-title">⚠ System Flags</div>
            {flaggedDrivers.length > 0 && (
              <>
                <div style={{ fontSize:11, color:'var(--danger-fg)', marginBottom:8, fontWeight:500 }}>Drivers below 3.5 ★ — auto-suspended</div>
                {flaggedDrivers.map(d=>(
                  <div key={d.driver_id} className="metric-row">
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="avatar">{d.full_name[0]}</div>
                      <div>
                        <div style={{ fontSize:13 }}>{d.full_name}</div>
                        <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.city}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ color:'var(--danger-fg)', fontWeight:600 }}>★ {d.avg_rating.toFixed(2)}</div>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:'2px 8px' }}>Review</button>
                    </div>
                  </div>
                ))}
                <div className="divider" />
              </>
            )}
            {flaggedRiders.length > 0 && (
              <>
                <div style={{ fontSize:11, color:'var(--warn-fg)', marginBottom:8, fontWeight:500 }}>Riders below 3.0 ★ — warned</div>
                {flaggedRiders.map(r=>(
                  <div key={r.rider_id} className="metric-row">
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="avatar">{r.full_name[0]}</div>
                      <div style={{ fontSize:13 }}>{r.full_name}</div>
                    </div>
                    <div style={{ color:'var(--warn-fg)', fontWeight:600 }}>★ {r.avg_rating.toFixed(2)}</div>
                  </div>
                ))}
              </>
            )}
            {flaggedDrivers.length === 0 && flaggedRiders.length === 0 && (
              <div className="empty-state"><div className="empty-icon">✅</div><p>No flagged accounts</p></div>
            )}
          </div>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Ride</th><th>By</th><th>Reviewer</th><th>Reviewed</th><th>Score</th><th>Comment</th><th>Date</th></tr>
              </thead>
              <tbody>
                {mockRatings.map(r=>(
                  <tr key={r.rating_id}>
                    <td className="mono">{r.rating_id}</td>
                    <td className="mono">#{r.ride_id}</td>
                    <td><span className="badge badge-muted" style={{ textTransform:'capitalize' }}>{r.rated_by}</span></td>
                    <td style={{ fontWeight:500 }}>{r.rater_name}</td>
                    <td className="muted">{r.ratee_name}</td>
                    <td>
                      <div style={{ color:'var(--accent)', fontWeight:600, fontSize:14 }}>{'★'.repeat(r.score)}{'☆'.repeat(5-r.score)}</div>
                      <div style={{ fontSize:11, color:'var(--text-m)' }}>{r.score}/5</div>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-s)', maxWidth:180 }}>{r.comment ?? <span style={{ color:'var(--text-m)' }}>—</span>}</td>
                    <td className="muted">{formatDateTime(r.rated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title">🏆 Top Drivers (Global)</div>
            {[...mockDrivers].filter(d=>d.avg_rating>0).sort((a,b)=>b.avg_rating-a.avg_rating || b.trips_completed-a.trips_completed).map((d,i)=>(
              <div key={d.driver_id} className="metric-row" style={{ alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16, width:24 }}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':
                    <span style={{ fontSize:12, color:'var(--text-m)', fontWeight:600 }}>#{i+1}</span>}
                  </span>
                  <div className="avatar gold">{d.full_name[0]}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{d.full_name}</div>
                    <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.city} · {d.trips_completed} trips</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'var(--accent)', fontWeight:700, fontSize:15 }}>★ {d.avg_rating.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title">🎯 Top Riders</div>
            {[...mockRiders].filter(r=>r.avg_rating>0).sort((a,b)=>b.avg_rating-a.avg_rating).map((r,i)=>(
              <div key={r.rider_id} className="metric-row" style={{ alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16, width:24 }}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':
                    <span style={{ fontSize:12, color:'var(--text-m)', fontWeight:600 }}>#{i+1}</span>}
                  </span>
                  <div className="avatar">{r.full_name[0]}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{r.full_name}</div>
                    <div style={{ fontSize:11, color:'var(--text-m)' }}>{r.total_rides} rides</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'var(--accent)', fontWeight:700, fontSize:15 }}>★ {r.avg_rating.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

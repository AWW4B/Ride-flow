'use client';
import { useState } from 'react';
import { mockDrivers } from '@/utils/mockData';
import { getVerificationBadge, getAvailabilityBadge } from '@/utils/helpers';

const CITIES = ['All', 'Islamabad', 'Lahore', 'Karachi'];

export default function DriversPage() {
  const [tab, setTab] = useState<'list' | 'leaderboard'>('list');
  const [city, setCity] = useState('All');
  const [verif, setVerif] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = mockDrivers.filter(d => {
    const matchCity = city === 'All' || d.city === city;
    const matchVerif = verif === 'All' || d.verification_status === verif;
    const q = search.toLowerCase();
    const matchSearch = !q || d.full_name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q) || d.city.toLowerCase().includes(q);
    return matchCity && matchVerif && matchSearch;
  });

  const leaderboard = [...mockDrivers]
    .filter(d => d.verification_status === 'verified')
    .sort((a, b) => b.avg_rating - a.avg_rating || b.trips_completed - a.trips_completed);

  const byCity = CITIES.slice(1).map(c => ({
    city: c,
    drivers: leaderboard.filter(d => d.city === c),
  }));

  const rankColors = ['var(--accent)', '#A8A8A8', '#CD7F32'];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Drivers</div>
          <div className="page-subtitle">Driver management, verification & leaderboard</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <span className="badge badge-success" style={{ padding:'6px 12px' }}>{mockDrivers.filter(d=>d.availability==='online').length} Online</span>
          <span className="badge badge-accent" style={{ padding:'6px 12px' }}>{mockDrivers.filter(d=>d.availability==='on_trip').length} On Trip</span>
          <span className="badge badge-warn" style={{ padding:'6px 12px' }}>{mockDrivers.filter(d=>d.verification_status==='pending').length} Pending</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">👨‍💼</span>
          <div className="stat-label">Total Drivers</div>
          <div className="stat-value">{mockDrivers.length}</div>
          <div className="stat-meta">{mockDrivers.filter(d=>d.verification_status==='verified').length} verified</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-label">Active Online</div>
          <div className="stat-value accent">{mockDrivers.filter(d=>d.availability!=='offline').length}</div>
          <div className="stat-meta">taking rides now</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-label">Platform Avg Rating</div>
          <div className="stat-value">
            {(mockDrivers.filter(d=>d.avg_rating>0).reduce((s,d)=>s+d.avg_rating,0)/mockDrivers.filter(d=>d.avg_rating>0).length).toFixed(2)}
          </div>
          <div className="stat-meta">across verified drivers</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏁</span>
          <div className="stat-label">Total Trips</div>
          <div className="stat-value">{mockDrivers.reduce((s,d)=>s+d.trips_completed,0)}</div>
          <div className="stat-meta">all time</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab==='list'?' active':''}`} onClick={()=>setTab('list')}>Driver List</div>
        <div className={`tab${tab==='leaderboard'?' active':''}`} onClick={()=>setTab('leaderboard')}>Leaderboard by City</div>
      </div>

      {tab === 'list' && (
        <div className="card">
          <div className="filter-bar">
            <input className="input" placeholder="Search name, city…" value={search} onChange={e=>setSearch(e.target.value)} />
            <select className="input" value={city} onChange={e=>setCity(e.target.value)}>
              {CITIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <select className="input" value={verif} onChange={e=>setVerif(e.target.value)}>
              <option value="All">All Status</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn btn-primary btn-sm">+ Add Driver</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Driver</th><th>City</th><th>Vehicle</th><th>Type</th><th>Rating</th><th>Trips</th><th>Wallet</th><th>Status</th><th>Availability</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.driver_id}>
                    <td className="mono">D-{d.driver_id}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div className="avatar gold">{d.full_name[0]}</div>
                        <div>
                          <div style={{ fontWeight:500, fontSize:13 }}>{d.full_name}</div>
                          <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{d.city}</td>
                    <td className="muted">{d.vehicle}</td>
                    <td><span className="badge badge-muted" style={{ textTransform:'capitalize' }}>{d.vehicle_type}</span></td>
                    <td>
                      {d.avg_rating > 0
                        ? <span style={{ color:'var(--accent)', fontWeight:500 }}>★ {d.avg_rating.toFixed(2)}</span>
                        : <span style={{ color:'var(--text-m)' }}>—</span>}
                    </td>
                    <td className="muted">{d.trips_completed}</td>
                    <td style={{ color:'var(--success-fg)', fontWeight:500 }}>₨{d.wallet_balance.toFixed(2)}</td>
                    <td>{getVerificationBadge(d.verification_status)}</td>
                    <td>{getAvailabilityBadge(d.availability)}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-ghost btn-sm">View</button>
                        {d.verification_status === 'pending' && <button className="btn btn-primary btn-sm">Verify</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="grid-3">
          {byCity.map(({ city: c, drivers }) => (
            <div key={c} className="card">
              <div className="card-title">🏆 {c}</div>
              {drivers.length === 0 && <div style={{ color:'var(--text-m)', fontSize:12, padding:'12px 0' }}>No verified drivers in this city.</div>}
              {drivers.map((d, i) => (
                <div key={d.driver_id} className="metric-row" style={{ alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:14, fontWeight:700, color: rankColors[i] ?? 'var(--text-s)', width:20, textAlign:'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}
                    </span>
                    <div className="avatar gold">{d.full_name[0]}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{d.full_name}</div>
                      <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.trips_completed} trips · {d.vehicle}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:'var(--accent)', fontWeight:600, fontSize:14 }}>★ {d.avg_rating.toFixed(2)}</div>
                    {getAvailabilityBadge(d.availability)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

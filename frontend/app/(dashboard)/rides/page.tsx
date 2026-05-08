'use client';
import { useState } from 'react';
import { mockRides } from '@/utils/mockData';
import { getRideStatusBadge, formatCurrency, formatDateTime } from '@/utils/helpers';
import type { RideStatus } from '@/types';

const STATUSES: { key: string; label: string }[] = [
  { key:'all', label:'All Rides' },
  { key:'in_progress', label:'In Progress' },
  { key:'enroute', label:'En Route' },
  { key:'accepted', label:'Accepted' },
  { key:'completed', label:'Completed' },
  { key:'cancelled', label:'Cancelled' },
];

const STEPS: RideStatus[] = ['accepted','enroute','in_progress','completed'];

function RidePipeline({ status }: { status: RideStatus }) {
  const labels = ['Accepted','En Route','In Progress','Completed'];
  const idx = STEPS.indexOf(status);
  return (
    <div className="stepper" style={{ marginTop:4 }}>
      {STEPS.map((s, i) => (
        <div key={s} className="step-item">
          {i < STEPS.length - 1 && (
            <div style={{ position:'absolute', top:9, left:'50%', right:'-50%', height:2, background: i < idx ? 'var(--success-fg)' : 'var(--border)', zIndex:0 }} />
          )}
          <div className={`step-dot ${i < idx ? 'done' : i === idx ? 'active' : ''}`} style={{ background: i < idx ? 'var(--success-fg)' : i === idx ? 'var(--accent)' : undefined }}>
            {i < idx ? '✓' : ''}
          </div>
          <div className="step-label">{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

export default function RidesPage() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = mockRides.filter(r => {
    const matchTab = tab === 'all' || r.status === tab;
    const q = search.toLowerCase();
    const matchSearch = !q || r.rider_name.toLowerCase().includes(q) || r.driver_name.toLowerCase().includes(q) || r.pickup_address.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const active = mockRides.filter(r => ['accepted','enroute','in_progress'].includes(r.status));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Rides</div>
          <div className="page-subtitle">Trip lifecycle management & history</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <span className="badge badge-success" style={{ padding:'6px 12px', fontSize:12 }}>
            <span className="live-dot" />
            {active.length} Active
          </span>
        </div>
      </div>

      {/* Active ride cards */}
      {active.length > 0 && (
        <div className="mb-16">
          <div style={{ fontSize:11, color:'var(--text-m)', fontWeight:500, letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:10 }}>Live Rides</div>
          <div className="grid-3">
            {active.map(r => (
              <div key={r.ride_id} className="card" style={{ borderColor:'rgba(196,169,109,0.2)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:12, color:'var(--text-m)' }}>Ride #{r.ride_id}</div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{r.rider_name}</div>
                  </div>
                  {getRideStatusBadge(r.status)}
                </div>
                <div className="kv-pair"><span className="kv-key">Driver</span><span className="kv-val">{r.driver_name}</span></div>
                <div className="kv-pair"><span className="kv-key">Vehicle</span><span className="kv-val">{r.vehicle}</span></div>
                <div className="kv-pair"><span className="kv-key">Pickup</span><span className="kv-val" style={{ maxWidth:130, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.pickup_address}</span></div>
                {r.surge_multiplier > 1 && (
                  <div className="kv-pair">
                    <span className="kv-key">Surge</span>
                    <span className="badge badge-warn">×{r.surge_multiplier} {r.surge_type === 'time_based' ? 'Peak' : 'Demand'}</span>
                  </div>
                )}
                <div style={{ marginTop:10 }}>
                  <RidePipeline status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter + table */}
      <div className="card">
        <div className="tabs">
          {STATUSES.map(s => (
            <div key={s.key} className={`tab${tab === s.key ? ' active' : ''}`} onClick={() => setTab(s.key)}>
              {s.label}
              {s.key !== 'all' && <span style={{ marginLeft:4, fontSize:11, color:'var(--text-m)' }}>({mockRides.filter(r => r.status === s.key).length})</span>}
            </div>
          ))}
        </div>
        <div className="filter-bar">
          <input className="input" placeholder="Search rider, driver, address…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:260 }} />
          <button className="btn btn-ghost btn-sm">Export CSV</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Rider</th><th>Driver</th><th>Vehicle</th>
                <th>Route</th><th>km</th><th>min</th>
                <th>Fare</th><th>Surge</th><th>Payment</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.ride_id}>
                  <td className="mono">#{r.ride_id}</td>
                  <td style={{ fontWeight:500 }}>{r.rider_name}</td>
                  <td className="muted">{r.driver_name}</td>
                  <td className="muted">{r.vehicle}</td>
                  <td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12, color:'var(--text-s)' }}>
                    {r.pickup_address} → {r.dropoff_address}
                  </td>
                  <td className="muted">{r.distance_km > 0 ? r.distance_km : '—'}</td>
                  <td className="muted">{r.duration_min > 0 ? r.duration_min : '—'}</td>
                  <td style={{ color:'var(--accent)', fontWeight:500 }}>
                    {r.final_fare > 0 ? `₨${formatCurrency(r.final_fare)}` : '—'}
                  </td>
                  <td>
                    {r.surge_multiplier > 1
                      ? <span className="badge badge-warn">×{r.surge_multiplier}</span>
                      : <span style={{ color:'var(--text-m)', fontSize:12 }}>—</span>}
                  </td>
                  <td>
                    <span className="badge badge-muted" style={{ textTransform:'capitalize' }}>{r.payment_method}</span>
                  </td>
                  <td>{getRideStatusBadge(r.status)}</td>
                  <td className="muted">{formatDateTime(r.started_at)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={12} style={{ textAlign:'center', padding:32, color:'var(--text-m)' }}>No rides match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

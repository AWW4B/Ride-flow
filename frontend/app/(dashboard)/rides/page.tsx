'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/utils/api';

const STATUSES = [
  { key: 'all',            label: 'All' },
  { key: 'in_progress',    label: 'In Progress' },
  { key: 'driver_en_route',label: 'En Route' },
  { key: 'accepted',       label: 'Accepted' },
  { key: 'completed',      label: 'Completed' },
  { key: 'cancelled',      label: 'Cancelled' },
];

const STATUS_STEPS = ['accepted', 'driver_en_route', 'in_progress', 'completed'];

function RidePipeline({ status }: { status: string }) {
  const labels = ['Accepted', 'En Route', 'In Progress', 'Completed'];
  const idx    = STATUS_STEPS.indexOf(status);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:8 }}>
      {STATUS_STEPS.map((s, i) => (
        <div key={s} style={{ display:'flex', alignItems:'center', flex: i < STATUS_STEPS.length-1 ? 1 : undefined }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
            <div style={{
              width:14, height:14, borderRadius:'50%',
              background: i <= idx ? 'var(--accent)' : 'var(--border)',
              border: i === idx ? '2px solid #fff' : 'none',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:8, color:'#0F0F0F', fontWeight:700,
            }}>{i < idx ? '✓' : ''}</div>
            <span style={{ fontSize:9, color: i <= idx ? 'var(--accent)' : 'var(--text-m)', whiteSpace:'nowrap' }}>{labels[i]}</span>
          </div>
          {i < STATUS_STEPS.length-1 && (
            <div style={{ height:2, flex:1, background: i < idx ? 'var(--accent)' : 'var(--border)', margin:'0 2px', marginBottom:14 }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function RidesPage() {
  const [rides,   setRides]   = useState<any[]>([]);
  const [tab,     setTab]     = useState('all');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.getRides(tab !== 'all' ? { status: tab } : {});
      setRides(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const filtered = rides.filter(r => {
    const q = search.toLowerCase();
    return !q
      || r.rider_name?.toLowerCase().includes(q)
      || r.driver_name?.toLowerCase().includes(q)
      || r.pickup_address?.toLowerCase().includes(q)
      || r.dropoff_address?.toLowerCase().includes(q);
  });

  const active = rides.filter(r => ['accepted','driver_en_route','in_progress'].includes(r.status));

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      completed:'success', cancelled:'error', in_progress:'success',
      accepted:'warn', driver_en_route:'warn',
    };
    return <span className={`badge badge-${map[s] ?? 'muted'}`} style={{ textTransform:'capitalize', fontSize:11 }}>{s.replace(/_/g,' ')}</span>;
  };

  const exportCSV = () => {
    const cols = ['ride_id','rider_name','driver_name','pickup_address','dropoff_address','fare','status','requested_at'];
    const rows = filtered.map(r => cols.map(c => `"${r[c] ?? ''}"`).join(','));
    const csv  = [cols.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    a.download = `rides_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Rides</div>
          <div className="page-subtitle">Trip lifecycle management & history</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {active.length > 0 && (
            <span className="badge badge-success" style={{ padding:'6px 12px', fontSize:12 }}>
              <span className="live-dot" />{active.length} Active
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Live Ride Cards */}
      {active.length > 0 && tab === 'all' && (
        <div className="mb-16">
          <div style={{ fontSize:11, color:'var(--text-m)', fontWeight:500, letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:10 }}>Live Rides</div>
          <div className="grid-3">
            {active.map(r => (
              <div key={r.ride_id} className="card" style={{ borderColor:'rgba(196,169,109,0.25)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-m)' }}>Ride #{r.ride_id}</div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{r.rider_name}</div>
                  </div>
                  {statusBadge(r.status)}
                </div>
                <div className="kv-pair"><span className="kv-key">Driver</span><span className="kv-val">{r.driver_name ?? '—'}</span></div>
                <div className="kv-pair"><span className="kv-key">Pickup</span>
                  <span className="kv-val" style={{ maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.pickup_address}</span>
                </div>
                {Number(r.surge_multiplier) > 1 && (
                  <div className="kv-pair">
                    <span className="kv-key">Surge</span>
                    <span className="badge badge-warn">×{r.surge_multiplier}</span>
                  </div>
                )}
                <RidePipeline status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="card">
        <div className="tabs">
          {STATUSES.map(s => (
            <div key={s.key} className={`tab${tab === s.key ? ' active' : ''}`} onClick={() => setTab(s.key)}>
              {s.label}
            </div>
          ))}
        </div>

        <div className="filter-bar">
          <input className="input" placeholder="Search rider, driver, address…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth:280 }} />
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading rides…</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Rider</th><th>Driver</th>
                  <th>Route</th><th>Fare</th><th>Surge</th>
                  <th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.ride_id}>
                    <td className="mono">#{r.ride_id}</td>
                    <td style={{ fontWeight:500 }}>{r.rider_name}</td>
                    <td className="muted">{r.driver_name ?? '—'}</td>
                    <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12, color:'var(--text-s)' }}>
                      {r.pickup_address} → {r.dropoff_address}
                    </td>
                    <td style={{ color:'var(--accent)', fontWeight:500 }}>
                      {r.fare > 0 ? `₨${Number(r.fare).toLocaleString()}` : '—'}
                    </td>
                    <td>
                      {Number(r.surge_multiplier) > 1
                        ? <span className="badge badge-warn">×{r.surge_multiplier}</span>
                        : <span style={{ color:'var(--text-m)', fontSize:12 }}>—</span>}
                    </td>
                    <td>{statusBadge(r.status)}</td>
                    <td className="muted" style={{ fontSize:11 }}>{r.requested_at?.slice(0,16) ?? '—'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--text-m)' }}>No rides match your filters</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

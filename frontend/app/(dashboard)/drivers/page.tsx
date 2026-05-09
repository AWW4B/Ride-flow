'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

const VERIF  = ['All', 'verified', 'pending', 'rejected'];

export default function DriversPage() {
  const [drivers,    setDrivers]    = useState<any[]>([]);
  const [vehicles,   setVehicles]   = useState<any[]>([]);
  const [leaderboard,setLeaderboard]= useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<'list' | 'vehicles' | 'leaderboard'>('list');
  const [city,       setCity]       = useState('All');
  const [verif,      setVerif]      = useState('All');
  const [vehVerif,   setVehVerif]   = useState('pending');
  const [search,     setSearch]     = useState('');
  const [actionId,   setActionId]   = useState<number | null>(null);
  const [toast,      setToast]      = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [d, v, lb] = await Promise.all([
        api.admin.getDrivers(),
        api.admin.getVehicles(),
        api.admin.getLeaderboard(),
      ]);
      setDrivers(d);
      setVehicles(v);
      setLeaderboard(lb);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const cities = ['All', ...Array.from(new Set(drivers.map(d => d.city).filter(Boolean)))];

  const filtered = drivers.filter(d => {
    const matchCity  = city  === 'All' || d.city === city;
    const matchVerif = verif === 'All' || d.verification_status === verif;
    const q = search.toLowerCase();
    const matchSearch = !q
      || d.full_name?.toLowerCase().includes(q)
      || d.email?.toLowerCase().includes(q)
      || d.city?.toLowerCase().includes(q)
      || d.license_number?.toLowerCase().includes(q);
    return matchCity && matchVerif && matchSearch;
  });

  const filteredVehicles = vehicles.filter(v =>
    vehVerif === 'All' || v.verification_status === vehVerif
  );

  const handleVerify = async (driverId: number, status: 'verified' | 'rejected') => {
    setActionId(driverId);
    try { await api.admin.verifyDriver(driverId, status); await load(); showToast(`Driver ${status}`); }
    catch (e: any) { alert(e.message); }
    finally { setActionId(null); }
  };

  const handleVehicleVerify = async (vehicleId: number, status: 'verified' | 'rejected') => {
    setActionId(vehicleId);
    try { await api.admin.verifyVehicle(vehicleId, status); await load(); showToast(`Vehicle ${status}`); }
    catch (e: any) { alert(e.message); }
    finally { setActionId(null); }
  };

  const handleUserStatus = async (userId: number, status: string) => {
    try { await api.admin.updateUserStatus(userId, status); await load(); }
    catch (e: any) { alert(e.message); }
  };

  const verifBadge = (v: string) => {
    const map: Record<string,string> = { verified:'success', pending:'warn', rejected:'error' };
    return <span className={`badge badge-${map[v] ?? 'muted'}`} style={{ textTransform:'capitalize', fontSize:11 }}>{v}</span>;
  };
  const availBadge = (a: string) => {
    const map: Record<string,string> = { online:'success', on_trip:'accent', offline:'muted' };
    return <span className={`badge badge-${map[a] ?? 'muted'}`} style={{ textTransform:'capitalize', fontSize:11 }}>{a?.replace('_',' ')}</span>;
  };

  const online    = drivers.filter(d => d.availability === 'online').length;
  const onTrip    = drivers.filter(d => d.availability === 'on_trip').length;
  const pending   = drivers.filter(d => d.verification_status === 'pending').length;
  const verified  = drivers.filter(d => d.verification_status === 'verified').length;
  const pendingVeh = vehicles.filter(v => v.verification_status === 'pending').length;
  const avgRating = drivers.filter(d => d.avg_rating > 0).reduce((s, d) => s + Number(d.avg_rating), 0)
                  / (drivers.filter(d => d.avg_rating > 0).length || 1);
  const totalTrips = drivers.reduce((s, d) => s + (d.trips_completed ?? 0), 0);

  const lbCities = Array.from(new Set(leaderboard.map(d => d.city).filter(Boolean)));
  const lbByCity = lbCities.map(c => ({ city: c, drivers: leaderboard.filter(d => d.city === c) }));
  const rankIcon = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;

  return (
    <div>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, background:'var(--success-fg)', color:'#fff', padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500, zIndex:9999 }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Drivers &amp; Vehicles</div>
          <div className="page-subtitle">Driver management, vehicle approvals &amp; leaderboard</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <span className="badge badge-success" style={{ padding:'6px 12px' }}>{online} Online</span>
          <span className="badge badge-accent"  style={{ padding:'6px 12px' }}>{onTrip} On Trip</span>
          <span className="badge badge-warn"    style={{ padding:'6px 12px' }}>{pending} Pending Drivers</span>
          {pendingVeh > 0 && <span className="badge badge-warn" style={{ padding:'6px 12px' }}>🚗 {pendingVeh} Vehicles</span>}
        </div>
      </div>

      {/* KPIs */}
      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">👨‍💼</span>
          <div className="stat-label">Total Drivers</div>
          <div className="stat-value">{drivers.length}</div>
          <div className="stat-meta">{verified} verified</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-label">Active Now</div>
          <div className="stat-value accent">{online + onTrip}</div>
          <div className="stat-meta">online or on trip</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-label">Avg Rating</div>
          <div className="stat-value">{drivers.length > 0 ? avgRating.toFixed(2) : '—'}</div>
          <div className="stat-meta">across active drivers</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🚗</span>
          <div className="stat-label">Pending Vehicles</div>
          <div className="stat-value" style={{ color: pendingVeh > 0 ? 'var(--warn-fg)' : 'var(--text-p)' }}>{pendingVeh}</div>
          <div className="stat-meta">awaiting approval</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab==='list'?' active':''}`}        onClick={() => setTab('list')}>Driver List</div>
        <div className={`tab${tab==='vehicles'?' active':''}`}    onClick={() => setTab('vehicles')}>
          Vehicle Approvals {pendingVeh > 0 && <span className="badge badge-warn" style={{ marginLeft:6, fontSize:10 }}>{pendingVeh}</span>}
        </div>
        <div className={`tab${tab==='leaderboard'?' active':''}`} onClick={() => setTab('leaderboard')}>Leaderboard</div>
      </div>

      {/* ── Driver List ── */}
      {tab === 'list' && (
        <div className="card">
          <div className="filter-bar">
            <input className="input" placeholder="Search name, email, city, licence…"
              value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:260 }} />
            <select className="input" value={city} onChange={e => setCity(e.target.value)}>
              {cities.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="input" value={verif} onChange={e => setVerif(e.target.value)}>
              {VERIF.map(v => <option key={v} value={v}>{v === 'All' ? 'All Status' : v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
            </select>
          </div>
          <div className="table-wrap">
            {loading ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading drivers…</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🚗</div><p>No drivers match your filters.</p></div>
            ) : (
              <table>
                <thead>
                  <tr><th>#</th><th>Driver</th><th>City</th><th>Licence</th><th>Rating</th><th>Trips</th><th>Wallet</th><th>Verified</th><th>Avail.</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.driver_id}>
                      <td className="mono">D-{d.driver_id}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="avatar gold">{d.full_name?.[0] ?? '?'}</div>
                          <div>
                            <div style={{ fontWeight:500, fontSize:13 }}>{d.full_name}</div>
                            <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{d.city ?? '—'}</td>
                      <td className="mono" style={{ fontSize:11 }}>{d.license_number}</td>
                      <td>{d.avg_rating > 0
                        ? <span style={{ color:'var(--accent)', fontWeight:500 }}>★ {Number(d.avg_rating).toFixed(2)}</span>
                        : <span style={{ color:'var(--text-m)' }}>—</span>}
                      </td>
                      <td className="muted">{d.trips_completed ?? 0}</td>
                      <td style={{ color:'var(--success-fg)', fontWeight:500 }}>₨{Number(d.wallet_balance ?? 0).toFixed(2)}</td>
                      <td>{verifBadge(d.verification_status)}</td>
                      <td>{availBadge(d.availability)}</td>
                      <td>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          {d.verification_status === 'pending' && (
                            <>
                              <button className="btn btn-primary btn-sm" disabled={actionId === d.driver_id}
                                onClick={() => handleVerify(d.driver_id, 'verified')}>Verify</button>
                              <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                                disabled={actionId === d.driver_id}
                                onClick={() => handleVerify(d.driver_id, 'rejected')}>Reject</button>
                            </>
                          )}
                          {d.account_status === 'active'
                            ? <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                                onClick={() => handleUserStatus(d.user_id, 'suspended')}>Suspend</button>
                            : <button className="btn btn-ghost btn-sm"
                                onClick={() => handleUserStatus(d.user_id, 'active')}>Restore</button>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Vehicle Approvals ── */}
      {tab === 'vehicles' && (
        <div className="card">
          <div className="filter-bar">
            <select className="input" value={vehVerif} onChange={e => setVehVerif(e.target.value)}>
              {['All','pending','verified','rejected'].map(v => (
                <option key={v} value={v}>{v === 'All' ? 'All Status' : v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>{loading ? '…' : '↻ Refresh'}</button>
          </div>
          <div className="table-wrap">
            {loading ? (
              <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading vehicles…</div>
            ) : filteredVehicles.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🚗</div><p>No vehicles with this status.</p></div>
            ) : (
              <table>
                <thead>
                  <tr><th>ID</th><th>Vehicle</th><th>Plate</th><th>Type</th><th>Driver</th><th>Primary</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(v => (
                    <tr key={v.vehicle_id}>
                      <td className="mono">V-{v.vehicle_id}</td>
                      <td>
                        <div style={{ fontWeight:500, fontSize:13 }}>{v.make} {v.model}</div>
                        <div style={{ fontSize:11, color:'var(--text-m)' }}>{v.color} · {v.year}</div>
                      </td>
                      <td className="mono" style={{ fontSize:12 }}>{v.license_plate}</td>
                      <td><span className="badge badge-muted" style={{ textTransform:'capitalize' }}>{v.vehicle_type}</span></td>
                      <td>
                        <div style={{ fontSize:13 }}>{v.driver_name}</div>
                        <div style={{ fontSize:11, color:'var(--text-m)' }}>{v.driver_email}</div>
                      </td>
                      <td>{v.is_primary ? <span className="badge badge-accent">Primary</span> : <span className="muted">—</span>}</td>
                      <td>{verifBadge(v.verification_status)}</td>
                      <td>
                        {v.verification_status === 'pending' && (
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-primary btn-sm" disabled={actionId === v.vehicle_id}
                              onClick={() => handleVehicleVerify(v.vehicle_id, 'verified')}>
                              {actionId === v.vehicle_id ? '…' : 'Approve'}
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                              disabled={actionId === v.vehicle_id}
                              onClick={() => handleVehicleVerify(v.vehicle_id, 'rejected')}>
                              Reject
                            </button>
                          </div>
                        )}
                        {v.verification_status === 'verified' && <span className="badge badge-success">Approved</span>}
                        {v.verification_status === 'rejected' && <span className="badge badge-muted">Rejected</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Leaderboard ── */}
      {tab === 'leaderboard' && (
        <div className="grid-3">
          {lbByCity.length === 0 && !loading && (
            <div className="card" style={{ gridColumn:'1/-1' }}>
              <div className="empty-state"><div className="empty-icon">🏆</div><p>No leaderboard data yet. Drivers need completed trips.</p></div>
            </div>
          )}
          {lbByCity.map(({ city: c, drivers: drs }) => (
            <div key={c} className="card">
              <div className="card-title">🏆 {c}</div>
              {drs.map((d: any, i: number) => (
                <div key={d.driver_id} className="metric-row" style={{ alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:14, fontWeight:700, width:22, textAlign:'center' }}>{rankIcon(i)}</span>
                    <div className="avatar gold">{d.full_name?.[0] ?? '?'}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{d.full_name}</div>
                      <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.trips_completed} trips</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:'var(--accent)', fontWeight:600, fontSize:14 }}>★ {Number(d.avg_rating).toFixed(2)}</div>
                    {availBadge(d.availability)}
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

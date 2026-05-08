'use client';
import { useState, useEffect } from 'react';
import { api, loadUser } from '@/utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DriverDashboard() {
  const [profile,   setProfile]   = useState<any>(null);
  const [earnings,  setEarnings]  = useState<any[]>([]);
  const [pending,   setPending]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState(false);

  const user = loadUser();

  const load = async () => {
    setLoading(true);
    try {
      const [p, e, pen] = await Promise.all([
        api.driver.getProfile(),
        api.driver.getEarnings(),
        api.driver.getPending(),
      ]);
      setProfile(p);
      setEarnings(e);
      setPending(pen);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleAvailability = async () => {
    if (!profile) return;
    const next = profile.availability === 'online' ? 'offline' : 'online';
    setToggling(true);
    try { await api.driver.setAvailability(next); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setToggling(false); }
  };

  // Build earnings chart: last 10 entries grouped by date
  const earningsChart = earnings.slice(0, 10).reverse().map((e, i) => ({
    day:    `D${i+1}`,
    net:    Number(e.net_amount ?? 0),
    gross:  Number(e.gross_amount ?? 0),
  }));

  const totalNet    = earnings.reduce((s, e) => s + Number(e.net_amount   ?? 0), 0);
  const totalGross  = earnings.reduce((s, e) => s + Number(e.gross_amount ?? 0), 0);
  const commission  = totalGross - totalNet;
  const activeRides = pending.filter(r => ['accepted','in_progress','driver_en_route'].includes(r.status));

  const availBadge = (a: string) => {
    const map: Record<string,string> = { online:'success', on_trip:'accent', offline:'muted' };
    return <span className={`badge badge-${map[a] ?? 'muted'}`} style={{ textTransform:'capitalize', fontSize:11 }}>{a?.replace('_',' ')}</span>;
  };

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'var(--text-m)', flexDirection:'column', gap:12 }}>
        <div style={{ width:32, height:32, border:'3px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        Loading dashboard…
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Good to see you, {profile?.full_name?.split(' ')[0] ?? user?.full_name ?? 'Driver'} 👋</div>
          <div className="page-subtitle">Here's your activity overview</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {profile && availBadge(profile.availability)}
          <button className="btn btn-primary" disabled={toggling || profile?.availability === 'on_trip'}
            onClick={toggleAvailability}>
            {toggling ? '…' : profile?.availability === 'online' ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">🏁</span>
          <div className="stat-label">Total Trips</div>
          <div className="stat-value accent">{profile?.trips_completed ?? 0}</div>
          <div className="stat-meta">all time</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-label">My Rating</div>
          <div className="stat-value">★ {Number(profile?.avg_rating ?? 0).toFixed(2)}</div>
          <div className="stat-meta" style={{ color: profile?.avg_rating >= 4 ? 'var(--success-fg)' : 'var(--warn-fg)' }}>
            {profile?.avg_rating >= 4.5 ? 'Excellent' : profile?.avg_rating >= 4 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-label">Wallet Balance</div>
          <div className="stat-value accent">₨{Number(profile?.wallet_balance ?? 0).toLocaleString()}</div>
          <div className="stat-meta">available to withdraw</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-label">Account Status</div>
          <div className="stat-value" style={{ fontSize:18, color: profile?.verification_status === 'verified' ? 'var(--success-fg)' : 'var(--warn-fg)' }}>
            {profile?.verification_status === 'verified' ? 'Verified' : 'Pending'}
          </div>
          <div className="stat-meta">CNIC + License</div>
        </div>
      </div>

      <div className="grid-7-3 mb-16">
        <div className="card">
          <div className="card-title">My Earnings — Last 10 Trips</div>
          <div className="chart-container tall">
            {earningsChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsChart} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <XAxis dataKey="day" tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: any) => `₨${v}`} />
                  <Tooltip contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }}
                    formatter={(v: any) => [`₨${Number(v ?? 0).toLocaleString()}`, '']} />
                  <Line type="monotone" dataKey="net" stroke="#C4A96D" strokeWidth={2} dot={false} activeDot={{ r:4 }} name="Net" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height:'100%' }}><div className="empty-icon">📈</div><p>Complete trips to see earnings chart</p></div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Earnings Summary</div>
          <div className="metric-row"><span className="metric-key">Total Trips</span><span className="metric-val accent">{earnings.length}</span></div>
          <div className="metric-row"><span className="metric-key">Gross Earned</span><span className="metric-val">₨{totalGross.toLocaleString()}</span></div>
          <div className="metric-row"><span className="metric-key">Commission (20%)</span><span className="metric-val" style={{ color:'var(--danger-fg)' }}>−₨{commission.toLocaleString()}</span></div>
          <div className="divider" />
          <div className="metric-row"><span className="metric-key">Net Earned</span><span className="metric-val" style={{ color:'var(--success-fg)', fontWeight:600 }}>₨{totalNet.toLocaleString()}</span></div>
          <div className="divider" />
          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:8 }}
            onClick={async () => { try { await api.driver.requestPayout(); alert('Payout requested!'); } catch (e: any) { alert(e.message); } }}>
            Request Payout
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="card-title" style={{ marginBottom:0 }}>Recent Earnings</div>
          <a href="/driver/earnings" className="btn btn-ghost btn-sm">All earnings →</a>
        </div>
        {earnings.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏁</div><p>No completed trips yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ride</th><th>Route</th><th>Gross</th><th>Commission</th><th>Net</th><th>Date</th></tr></thead>
              <tbody>
                {earnings.slice(0, 5).map((e: any) => (
                  <tr key={e.earning_id}>
                    <td className="mono">#{e.earning_id}</td>
                    <td className="muted" style={{ fontSize:12, maxWidth:200 }}>{e.pickup_address} → {e.dropoff_address}</td>
                    <td>₨{Number(e.gross_amount ?? 0).toLocaleString()}</td>
                    <td style={{ color:'var(--danger-fg)' }}>−₨{Number(e.commission_amount ?? 0).toLocaleString()}</td>
                    <td style={{ color:'var(--success-fg)', fontWeight:500 }}>₨{Number(e.net_amount ?? 0).toLocaleString()}</td>
                    <td className="muted" style={{ fontSize:11 }}>{e.credited_at?.slice(0,16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

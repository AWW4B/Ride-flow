'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/utils/api';

const PIE_COLORS = ['#C4A96D', '#6D9AC4', '#6DC4A9', '#C46D6D'];

export default function DashboardPage() {
  const [rides,      setRides]      = useState<any[]>([]);
  const [drivers,    setDrivers]    = useState<any[]>([]);
  const [revenue,    setRevenue]    = useState<any[]>([]);
  const [payments,   setPayments]   = useState<any[]>([]);
  const [leaderboard,setLeaderboard]= useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 17 * 86400000).toISOString().slice(0, 10);

    Promise.all([
      api.admin.getRides(),
      api.admin.getDrivers(),
      api.admin.getRevenue(monthAgo, today),
      api.admin.getPaymentReport(),
      api.admin.getLeaderboard(),
    ]).then(([r, d, rev, pay, lb]) => {
      setRides(r);
      setDrivers(d);
      setRevenue(rev);
      setPayments(pay);
      setLeaderboard(lb);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeRides   = rides.filter(r => ['accepted','driver_en_route','in_progress'].includes(r.status));
  const onlineDrivers = drivers.filter(d => ['online','on_trip'].includes(d.availability));
  const todayRevenue  = revenue.at(-1)?.gross_revenue ?? 0;

  // Payment method aggregates for pie
  const payMethodMap: Record<string, number> = {};
  for (const p of payments) {
    if (p.payment_status === 'paid')
      payMethodMap[p.payment_method] = (payMethodMap[p.payment_method] ?? 0) + Number(p.total ?? 0);
  }
  const totalPay = Object.values(payMethodMap).reduce((a, b) => a + b, 0) || 1;
  const pieData = Object.entries(payMethodMap).map(([name, val], i) => ({
    name,
    value: Math.round((val / totalPay) * 100),
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

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
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle"><span className="live-dot"/>Live operations · {new Date().toDateString()}</div>
        </div>
        <a href="/rides" className="btn btn-primary">View All Rides</a>
      </div>

      {/* KPI Row */}
      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">🚗</span>
          <div className="stat-label">Active Rides</div>
          <div className="stat-value accent">{activeRides.length}</div>
          <div className="stat-meta">of {rides.length} total today</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👨‍💼</span>
          <div className="stat-label">Online Drivers</div>
          <div className="stat-value">{onlineDrivers.length}</div>
          <div className="stat-meta">of {drivers.length} registered</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-label">Revenue (Today)</div>
          <div className="stat-value accent">₨{Number(todayRevenue).toLocaleString()}</div>
          <div className="stat-meta">gross platform revenue</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-label">Avg Driver Rating</div>
          <div className="stat-value">
            {drivers.length > 0
              ? (drivers.reduce((s, d) => s + (d.avg_rating ?? 0), 0) / drivers.length).toFixed(2)
              : '—'}
          </div>
          <div className="stat-meta">across all verified drivers</div>
        </div>
      </div>

      <div className="grid-7-3 mb-16">
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-title">Platform Revenue — Last 17 Days</div>
          <div className="chart-container tall">
            {revenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenue} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                  <XAxis dataKey="earning_date" tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false}
                    interval={2} tickFormatter={(v: string) => v?.slice(5) ?? ''} />
                  <YAxis tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: any) => `₨${Number(v ?? 0) / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }}
                    formatter={(v: any) => [`₨${Number(v ?? 0).toLocaleString()}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="gross_revenue" stroke="#C4A96D" strokeWidth={2} dot={false} activeDot={{ r:4, fill:'#C4A96D' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height:'100%' }}>
                <div className="empty-icon">📈</div><p>No revenue data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Pie */}
        <div className="card">
          <div className="card-title">Payment Methods</div>
          {pieData.length > 0 ? (
            <>
              <div style={{ height:160, marginBottom:12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }}
                      formatter={(v: any) => [`${v}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {pieData.map(m => (
                <div key={m.name} className="metric-row">
                  <span className="metric-key" style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:m.color, display:'inline-block' }} />
                    {m.name}
                  </span>
                  <span className="metric-val">{m.value}%</span>
                </div>
              ))}
            </>
          ) : (
            <div className="empty-state"><div className="empty-icon">💳</div><p>No payment data yet</p></div>
          )}
        </div>
      </div>

      <div className="grid-2 mb-16">
        {/* Active Rides */}
        <div className="card">
          <div className="card-title"><span className="live-dot"/>Active Rides</div>
          {activeRides.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🚗</div><p>No active rides right now</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Rider</th><th>Driver</th><th>Status</th></tr></thead>
                <tbody>
                  {activeRides.slice(0, 8).map(r => (
                    <tr key={r.ride_id}>
                      <td className="mono">#{r.ride_id}</td>
                      <td>{r.rider_name}</td>
                      <td className="muted">{r.driver_name ?? '—'}</td>
                      <td><span className={`badge badge-${r.status === 'in_progress' ? 'success' : 'warn'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Driver Leaderboard */}
        <div className="card">
          <div className="card-title">Top Drivers — Leaderboard</div>
          {leaderboard.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏆</div><p>No verified drivers yet</p></div>
          ) : (
            leaderboard.slice(0, 5).map((d, i) => (
              <div key={d.driver_id} className="metric-row" style={{ alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:13, width:16, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : 'var(--text-m)' }}>{i + 1}</span>
                  <div className="driver-avatar" style={{ width:28, height:28, fontSize:12 }}>{d.full_name?.[0] ?? '?'}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--text-p)' }}>{d.full_name}</div>
                    <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.trips_completed} trips · {d.city}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div className="metric-val accent">★ {Number(d.avg_rating ?? 0).toFixed(2)}</div>
                  <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.availability}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Rides Table */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="card-title" style={{ marginBottom:0 }}>Recent Rides</div>
          <a href="/rides" className="btn btn-ghost btn-sm">View all →</a>
        </div>
        {rides.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📋</div><p>No rides recorded yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Rider</th><th>Driver</th><th>Route</th><th>Fare</th><th>Status</th></tr></thead>
              <tbody>
                {rides.slice(0, 5).map(r => (
                  <tr key={r.ride_id}>
                    <td className="mono">#{r.ride_id}</td>
                    <td style={{ fontWeight:500 }}>{r.rider_name}</td>
                    <td className="muted">{r.driver_name ?? '—'}</td>
                    <td className="muted" style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.pickup_address} → {r.dropoff_address}
                    </td>
                    <td className="metric-val accent">{r.fare > 0 ? `₨${Number(r.fare).toLocaleString()}` : '—'}</td>
                    <td><span className={`badge badge-${r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'error' : 'warn'}`}>{r.status}</span></td>
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

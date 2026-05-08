'use client';
import { mockRides, mockDrivers, mockPayments, revenueData, paymentMethodData } from '@/utils/mockData';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getRideStatusBadge, formatCurrency, formatDate } from '@/utils/helpers';

const activeRides = mockRides.filter(r => ['accepted','enroute','in_progress'].includes(r.status));
const todayRevenue = mockPayments.filter(p => p.payment_status === 'paid').reduce((s,p) => s + p.amount, 0);
const onlineDrivers = mockDrivers.filter(d => d.availability === 'online' || d.availability === 'on_trip');

export default function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle"><span className="live-dot"/>Live operations · Thu 8 May 2026</div>
        </div>
        <button className="btn btn-primary">+ New Ride Request</button>
      </div>

      {/* KPI Row */}
      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">🚗</span>
          <div className="stat-label">Active Rides</div>
          <div className="stat-value accent">{activeRides.length}</div>
          <div className="stat-meta"><span className="stat-delta-up">▲</span>2 vs last hour</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👨‍💼</span>
          <div className="stat-label">Online Drivers</div>
          <div className="stat-value">{onlineDrivers.length}</div>
          <div className="stat-meta"><span className="stat-delta-up">▲</span>of {mockDrivers.length} total</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-label">Revenue (Today)</div>
          <div className="stat-value accent">₨{formatCurrency(todayRevenue)}</div>
          <div className="stat-meta"><span className="stat-delta-up">▲</span>+12% vs yesterday</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-label">Avg Driver Rating</div>
          <div className="stat-value">4.76</div>
          <div className="stat-meta"><span className="stat-delta-up">▲</span>+0.04 this week</div>
        </div>
      </div>

      <div className="grid-7-3 mb-16">
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-title">Platform Revenue — Last 17 Days</div>
          <div className="chart-container tall">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                <XAxis dataKey="date" tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={v => `₨${v}`} />
                <Tooltip
                  contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }}
                  formatter={(v: any) => [`₨${Number(v ?? 0).toLocaleString()}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#C4A96D" strokeWidth={2} dot={false} activeDot={{ r:4, fill:'#C4A96D' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <div className="card-title">Payment Methods</div>
          <div style={{ height:160, marginBottom:12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {paymentMethodData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }} formatter={(v: any) => [`${v}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {paymentMethodData.map(m => (
            <div key={m.name} className="metric-row">
              <span className="metric-key" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:m.color, display:'inline-block' }} />
                {m.name}
              </span>
              <span className="metric-val">{m.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 mb-16">
        {/* Active Rides */}
        <div className="card">
          <div className="card-title"><span className="live-dot"/>Active Rides</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Rider</th><th>Driver</th><th>Status</th><th>Surge</th>
                </tr>
              </thead>
              <tbody>
                {activeRides.map(r => (
                  <tr key={r.ride_id}>
                    <td className="mono">#{r.ride_id}</td>
                    <td>{r.rider_name}</td>
                    <td className="muted">{r.driver_name}</td>
                    <td>{getRideStatusBadge(r.status)}</td>
                    <td>{r.surge_multiplier > 1 ? <span className="badge badge-warn">×{r.surge_multiplier}</span> : <span className="badge badge-muted">×1.0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Driver Leaderboard */}
        <div className="card">
          <div className="card-title">Top Drivers — Islamabad</div>
          {mockDrivers.filter(d => d.city === 'Islamabad' && d.verification_status === 'verified').sort((a,b) => b.avg_rating - a.avg_rating).map((d, i) => (
            <div key={d.driver_id} className="metric-row" style={{ alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span className={`rank-${i+1}`} style={{ fontSize:13, width:16 }}>{i+1}</span>
                <div className="driver-avatar" style={{ width:28, height:28, fontSize:12 }}>{d.full_name[0]}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text-p)' }}>{d.full_name}</div>
                  <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.trips_completed} trips</div>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div className="metric-val accent">★ {d.avg_rating.toFixed(2)}</div>
                <div style={{ fontSize:11, color:'var(--text-m)' }}>{d.availability}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Rides Full Table */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="card-title" style={{ marginBottom:0 }}>Recent Rides</div>
          <a href="/rides" className="btn btn-ghost btn-sm">View all →</a>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Rider</th><th>Driver</th><th>Route</th><th>Fare</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {mockRides.slice(0,5).map(r => (
                <tr key={r.ride_id}>
                  <td className="mono">#{r.ride_id}</td>
                  <td style={{ fontWeight:500 }}>{r.rider_name}</td>
                  <td className="muted">{r.driver_name}</td>
                  <td className="muted" style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.pickup_address} → {r.dropoff_address}</td>
                  <td className="metric-val accent">₨{r.final_fare > 0 ? formatCurrency(r.final_fare) : '—'}</td>
                  <td>{getRideStatusBadge(r.status)}</td>
                  <td className="muted">{formatDate(r.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

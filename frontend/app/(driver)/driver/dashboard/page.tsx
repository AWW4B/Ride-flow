'use client';
import { mockDrivers, mockRides, revenueData } from '@/utils/mockData';
import { getAvailabilityBadge, formatCurrency } from '@/utils/helpers';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const driver = mockDrivers[0]; // Ali Raza
const myRides = mockRides.filter(r => r.driver_name === 'Ali Raza');
const completedRides = myRides.filter(r => r.status === 'completed');
const activeRide = myRides.find(r => r.status === 'in_progress' || r.status === 'enroute');
const earningsData = revenueData.slice(-10).map(d => ({ ...d, myEarnings: Math.round(d.revenue * 0.25) }));

export default function DriverDashboard() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Good afternoon, Ali 👋</div>
          <div className="page-subtitle">Here's your activity overview for today</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {getAvailabilityBadge(driver.availability)}
          <button className="btn btn-primary">Go Online</button>
        </div>
      </div>

      {/* Active ride banner */}
      {activeRide && (
        <div className="mb-16" style={{ background:'rgba(196,169,109,0.08)', border:'1px solid rgba(196,169,109,0.25)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11, color:'var(--accent)', fontWeight:500, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:4 }}>
                <span className="live-dot" />Active Ride
              </div>
              <div style={{ fontSize:14, fontWeight:600 }}>Picking up {activeRide.rider_name}</div>
              <div style={{ fontSize:12, color:'var(--text-s)', marginTop:2 }}>{activeRide.pickup_address} → {activeRide.dropoff_address}</div>
            </div>
            <button className="btn btn-primary">View Details →</button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">🏁</span>
          <div className="stat-label">Total Trips</div>
          <div className="stat-value accent">{driver.trips_completed}</div>
          <div className="stat-meta">{completedRides.length} this session</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-label">My Rating</div>
          <div className="stat-value">★ {driver.avg_rating.toFixed(2)}</div>
          <div className="stat-meta" style={{ color: driver.avg_rating >= 4 ? 'var(--success-fg)' : 'var(--warn-fg)' }}>
            {driver.avg_rating >= 4.5 ? 'Excellent' : driver.avg_rating >= 4 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-label">Wallet Balance</div>
          <div className="stat-value accent">₨{formatCurrency(driver.wallet_balance)}</div>
          <div className="stat-meta">available to withdraw</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-label">Account Status</div>
          <div className="stat-value" style={{ fontSize:18, color:'var(--success-fg)' }}>Verified</div>
          <div className="stat-meta">CNIC + License checked</div>
        </div>
      </div>

      <div className="grid-7-3 mb-16">
        {/* Earnings chart */}
        <div className="card">
          <div className="card-title">My Earnings — Last 10 Days</div>
          <div className="chart-container tall">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={earningsData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                <XAxis dataKey="date" tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={v => `₨${v}`} />
                <Tooltip
                  contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }}
                  formatter={(v: number) => [`₨${v.toLocaleString()}`, 'My Earnings']}
                />
                <Line type="monotone" dataKey="myEarnings" stroke="#C4A96D" strokeWidth={2} dot={false} activeDot={{ r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick stats */}
        <div className="card">
          <div className="card-title">This Week</div>
          <div className="metric-row">
            <span className="metric-key">Rides Completed</span>
            <span className="metric-val accent">8</span>
          </div>
          <div className="metric-row">
            <span className="metric-key">Gross Earned</span>
            <span className="metric-val">₨2,840</span>
          </div>
          <div className="metric-row">
            <span className="metric-key">Commission (20%)</span>
            <span className="metric-val" style={{ color:'var(--danger-fg)' }}>−₨568</span>
          </div>
          <div className="metric-row">
            <span className="metric-key">Net Earned</span>
            <span className="metric-val" style={{ color:'var(--success-fg)', fontWeight:600 }}>₨2,272</span>
          </div>
          <div className="divider" />
          <div className="metric-row">
            <span className="metric-key">Acceptance Rate</span>
            <span className="metric-val">87%</span>
          </div>
          <div className="metric-row">
            <span className="metric-key">Cancellation Rate</span>
            <span className="metric-val" style={{ color:'var(--warn-fg)' }}>5%</span>
          </div>
          <div className="metric-row">
            <span className="metric-key">Avg Trip Duration</span>
            <span className="metric-val">18 min</span>
          </div>
        </div>
      </div>

      {/* Recent trips */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="card-title" style={{ marginBottom:0 }}>Recent Trips</div>
          <a href="/driver/trips" className="btn btn-ghost btn-sm">All trips →</a>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Ride</th><th>Rider</th><th>Route</th><th>Distance</th><th>Fare</th><th>Status</th></tr>
            </thead>
            <tbody>
              {myRides.map(r => (
                <tr key={r.ride_id}>
                  <td className="mono">#{r.ride_id}</td>
                  <td style={{ fontWeight:500 }}>{r.rider_name}</td>
                  <td className="muted" style={{ fontSize:12, maxWidth:200 }}>{r.pickup_address} → {r.dropoff_address}</td>
                  <td className="muted">{r.distance_km > 0 ? `${r.distance_km} km` : '—'}</td>
                  <td style={{ color:'var(--accent)', fontWeight:500 }}>{r.final_fare > 0 ? `₨${formatCurrency(r.final_fare)}` : '—'}</td>
                  <td>
                    {r.status === 'completed' && <span className="badge badge-success">Completed</span>}
                    {r.status === 'in_progress' && <span className="badge badge-accent">In Progress</span>}
                    {r.status === 'enroute' && <span className="badge badge-warn">En Route</span>}
                    {r.status === 'cancelled' && <span className="badge badge-danger">Cancelled</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

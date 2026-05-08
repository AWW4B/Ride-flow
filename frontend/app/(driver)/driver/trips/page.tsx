'use client';
import { mockRides } from '@/utils/mockData';
import { formatCurrency, formatDateTime, getRideStatusBadge } from '@/utils/helpers';

const myTrips = mockRides.filter(r => r.driver_name === 'Ali Raza');

export default function DriverTripsPage() {
  const total = myTrips.filter(r => r.status === 'completed').reduce((s,r) => s + r.final_fare, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Trips</div>
          <div className="page-subtitle">Complete history of your rides</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <span className="badge badge-accent" style={{ padding:'6px 12px' }}>{myTrips.length} total trips</span>
        </div>
      </div>

      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-label">Completed</div>
          <div className="stat-value accent">{myTrips.filter(r=>r.status==='completed').length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">❌</span>
          <div className="stat-label">Cancelled</div>
          <div className="stat-value" style={{ color:'var(--danger-fg)' }}>{myTrips.filter(r=>r.status==='cancelled').length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📍</span>
          <div className="stat-label">KM Driven</div>
          <div className="stat-value">{myTrips.reduce((s,r)=>s+r.distance_km,0).toFixed(1)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-label">Total Gross</div>
          <div className="stat-value accent">₨{formatCurrency(total)}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Rider</th><th>Route</th><th>Distance</th><th>Duration</th><th>Fare</th><th>Surge</th><th>Payment</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {myTrips.map(r => (
                <tr key={r.ride_id}>
                  <td className="mono">#{r.ride_id}</td>
                  <td style={{ fontWeight:500 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div className="avatar" style={{ width:24, height:24, fontSize:10 }}>{r.rider_name[0]}</div>
                      {r.rider_name}
                    </div>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-s)', maxWidth:180 }}>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.pickup_address}</div>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-m)' }}>→ {r.dropoff_address}</div>
                  </td>
                  <td className="muted">{r.distance_km > 0 ? `${r.distance_km} km` : '—'}</td>
                  <td className="muted">{r.duration_min > 0 ? `${r.duration_min} min` : '—'}</td>
                  <td style={{ color:'var(--accent)', fontWeight:500 }}>{r.final_fare > 0 ? `₨${formatCurrency(r.final_fare)}` : '—'}</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

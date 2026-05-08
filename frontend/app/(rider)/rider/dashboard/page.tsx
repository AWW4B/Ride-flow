'use client';
import { mockRiders, mockRides } from '@/utils/mockData';
import { getRideStatusBadge, formatCurrency, formatDateTime } from '@/utils/helpers';
import Link from 'next/link';

const rider = mockRiders[0]; // Sara Khan
const myRides = mockRides.filter(r => r.rider_name === 'Sara Khan');
const activeRide = myRides.find(r => r.status === 'in_progress');

export default function RiderDashboard() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Hey Sara 👋</div>
          <div className="page-subtitle">Ready for your next ride?</div>
        </div>
        <Link href="/rider/book" className="btn btn-primary" style={{ fontSize:14, padding:'10px 20px' }}>+ Book a Ride</Link>
      </div>

      {/* Active ride tracker */}
      {activeRide && (
        <div className="mb-16" style={{ background:'rgba(196,169,109,0.06)', border:'1px solid rgba(196,169,109,0.25)', borderRadius:12, padding:'16px 20px' }}>
          <div style={{ fontSize:11, color:'var(--accent)', fontWeight:500, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:8 }}>
            <span className="live-dot" />Your Ride is In Progress
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Ali Raza · Toyota Corolla</div>
              <div style={{ fontSize:12, color:'var(--text-s)' }}>{activeRide.pickup_address} → {activeRide.dropoff_address}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--accent)' }}>En Route</div>
              <div style={{ fontSize:12, color:'var(--text-m)', marginTop:2 }}>ETA ~8 min</div>
            </div>
          </div>

          {/* Mini stepper */}
          <div className="stepper" style={{ marginTop:14 }}>
            {['Driver Matched','En Route to You','In Progress','Completed'].map((label, i) => (
              <div key={i} className="step-item">
                {i < 3 && (
                  <div style={{ position:'absolute', top:9, left:'50%', right:'-50%', height:2, background: i < 2 ? 'var(--success-fg)' : 'var(--border)', zIndex:0 }} />
                )}
                <div className={`step-dot ${i < 2 ? 'done' : i === 2 ? 'active' : ''}`}>
                  {i < 2 ? '✓' : ''}
                </div>
                <div className="step-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid mb-16" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <div className="stat-card">
          <span className="stat-icon">🚗</span>
          <div className="stat-label">Total Rides</div>
          <div className="stat-value accent">{rider.total_rides}</div>
          <div className="stat-meta">{rider.cancelled_rides} cancelled</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💸</span>
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">₨{formatCurrency(rider.total_spent)}</div>
          <div className="stat-meta">all time</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <div className="stat-label">My Rating</div>
          <div className="stat-value">★ {rider.avg_rating.toFixed(1)}</div>
          <div className="stat-meta">as a passenger</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Recent Rides */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="card-title" style={{ marginBottom:0 }}>Recent Rides</div>
            <Link href="/rider/trips" className="btn btn-ghost btn-sm">All trips →</Link>
          </div>
          {myRides.map(r => (
            <div key={r.ride_id} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>{r.driver_name}</div>
                <div style={{ fontSize:11, color:'var(--text-m)', marginTop:2 }}>{r.pickup_address}</div>
                <div style={{ fontSize:11, color:'var(--text-m)' }}>→ {r.dropoff_address}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                {r.final_fare > 0 && <div style={{ color:'var(--accent)', fontWeight:600, marginBottom:4 }}>₨{formatCurrency(r.final_fare)}</div>}
                {getRideStatusBadge(r.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ border:'1px solid rgba(196,169,109,0.2)' }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Book a Ride</div>
              <div style={{ fontSize:12, color:'var(--text-s)' }}>Get a driver in minutes</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {['Economy','Premium','Bike'].map(t => (
                <Link key={t} href="/rider/book" className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}>
                  {t === 'Economy' ? '🚗' : t === 'Premium' ? '🏎️' : '🏍️'} {t}
                </Link>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title">Active Promos</div>
            {[
              { code:'WELCOME10', discount:'10% off', expires:'Dec 2026' },
              { code:'FLAT50', discount:'₨50 off', expires:'Jun 2026' },
            ].map(p => (
              <div key={p.code} className="metric-row">
                <div>
                  <span className="badge badge-accent" style={{ marginBottom:2 }}>{p.code}</span>
                  <div style={{ fontSize:11, color:'var(--text-m)' }}>Expires {p.expires}</div>
                </div>
                <div style={{ color:'var(--success-fg)', fontWeight:500, fontSize:13 }}>{p.discount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

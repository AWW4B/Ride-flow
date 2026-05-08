'use client';
import { mockDrivers } from '@/utils/mockData';
import { getVerificationBadge } from '@/utils/helpers';

const driver = mockDrivers[0];
const vehicle = { make:'Toyota', model:'Corolla', year:2022, color:'White', plate:'LHR-1234', type:'Economy', status:'verified' };

export default function DriverVehiclePage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Vehicle</div>
          <div className="page-subtitle">Vehicle registration and verification status</div>
        </div>
        <button className="btn btn-ghost">+ Register Another Vehicle</button>
      </div>

      <div className="grid-2 mb-16">
        {/* Primary Vehicle Card */}
        <div className="card" style={{ border:'1px solid rgba(196,169,109,0.25)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--accent)', fontWeight:500, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:4 }}>Primary Vehicle</div>
              <div style={{ fontSize:20, fontWeight:700 }}>{vehicle.make} {vehicle.model}</div>
              <div style={{ fontSize:13, color:'var(--text-s)' }}>{vehicle.year} · {vehicle.color}</div>
            </div>
            <div style={{ fontSize:40 }}>🚗</div>
          </div>

          <div className="divider" />

          <div className="kv-pair"><span className="kv-key">License Plate</span><span className="kv-val" style={{ fontFamily:'JetBrains Mono,monospace', letterSpacing:1 }}>{vehicle.plate}</span></div>
          <div className="kv-pair"><span className="kv-key">Vehicle Type</span><span className="kv-val">{vehicle.type}</span></div>
          <div className="kv-pair"><span className="kv-key">Verification</span><span className="kv-val">{getVerificationBadge(vehicle.status)}</span></div>
          <div className="kv-pair"><span className="kv-key">Year</span><span className="kv-val">{vehicle.year}</span></div>

          <div className="divider" />
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}>Edit Details</button>
            <button className="btn btn-danger btn-sm" style={{ flex:1, justifyContent:'center' }}>Remove</button>
          </div>
        </div>

        {/* Fare Preview */}
        <div className="card">
          <div className="card-title">Economy Fare Rates</div>
          <div style={{ background:'var(--bg-s2)', borderRadius:8, padding:14, marginBottom:14, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:12, color:'var(--text-m)', marginBottom:8 }}>Fare = Base + (Per KM × Distance) + (Per Min × Duration)</div>
            <div className="metric-row"><span className="metric-key">Base Rate</span><span className="metric-val accent">₨80.00</span></div>
            <div className="metric-row"><span className="metric-key">Per KM Rate</span><span className="metric-val">₨25.00</span></div>
            <div className="metric-row"><span className="metric-key">Per Minute Rate</span><span className="metric-val">₨3.00</span></div>
          </div>
          <div className="card-title" style={{ marginBottom:8 }}>Sample Estimate</div>
          <div style={{ fontSize:12, color:'var(--text-m)', marginBottom:8 }}>10 km trip, 25 minutes</div>
          <div className="metric-row"><span className="metric-key">Calculation</span><span className="metric-val">80 + (25×10) + (3×25)</span></div>
          <div className="metric-row"><span className="metric-key">Before Surge</span><span className="metric-val">₨405.00</span></div>
          <div className="metric-row"><span className="metric-key">With 1.5× Surge</span><span className="metric-val accent">₨607.50</span></div>
          <div className="metric-row"><span className="metric-key">Your Net (80%)</span><span className="metric-val" style={{ color:'var(--success-fg)' }}>₨486.00</span></div>
        </div>
      </div>

      {/* Driver Profile snapshot */}
      <div className="card">
        <div className="card-title">Driver Profile</div>
        <div className="grid-3">
          <div>
            <div className="metric-row"><span className="metric-key">Full Name</span><span className="metric-val">{driver.full_name}</span></div>
            <div className="metric-row"><span className="metric-key">City</span><span className="metric-val">{driver.city}</span></div>
            <div className="metric-row"><span className="metric-key">License #</span><span className="metric-val" style={{ fontSize:12, fontFamily:'monospace' }}>{driver.license_number}</span></div>
          </div>
          <div>
            <div className="metric-row"><span className="metric-key">Verification</span><span className="metric-val">{getVerificationBadge(driver.verification_status)}</span></div>
            <div className="metric-row"><span className="metric-key">Total Trips</span><span className="metric-val accent">{driver.trips_completed}</span></div>
            <div className="metric-row"><span className="metric-key">Avg Rating</span><span className="metric-val accent">★ {driver.avg_rating.toFixed(2)}</span></div>
          </div>
          <div>
            <div className="metric-row"><span className="metric-key">CNIC</span><span className="metric-val" style={{ fontSize:12, fontFamily:'monospace' }}>3520100000001</span></div>
            <div className="metric-row"><span className="metric-key">Phone</span><span className="metric-val">{driver.phone}</span></div>
            <div className="metric-row"><span className="metric-key">Email</span><span className="metric-val" style={{ fontSize:12 }}>{driver.email}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

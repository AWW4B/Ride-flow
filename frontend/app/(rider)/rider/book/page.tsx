'use client';
import { useState } from 'react';

const VEHICLE_TYPES = [
  { key:'economy', label:'Economy', icon:'🚗', desc:'Affordable everyday rides', base:'₨80 + ₨25/km' },
  { key:'premium', label:'Premium', icon:'🏎️', desc:'Luxury vehicles, priority service', base:'₨150 + ₨45/km' },
  { key:'bike',    label:'Bike',    icon:'🏍️', desc:'Fast & budget-friendly', base:'₨40 + ₨12/km' },
];

const PROMO_CODES = ['WELCOME10','FLAT50','EID25'];

const POPULAR_ROUTES = [
  { from:'F-7 Markaz, Islamabad', to:'Blue Area, Islamabad' },
  { from:'G-9 Markaz, Islamabad', to:'Jinnah Super, Islamabad' },
  { from:'E-11, Islamabad',        to:'DHA Phase 2, Islamabad' },
];

export default function BookRidePage() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [vehicleType, setVehicleType] = useState('economy');
  const [promo, setPromo] = useState('');
  const [schedule, setSchedule] = useState('');
  const [step, setStep] = useState<'form'|'confirm'|'searching'|'matched'>('form');

  const selected = VEHICLE_TYPES.find(v => v.key === vehicleType)!;

  const handleBook = () => {
    setStep('searching');
    setTimeout(() => setStep('matched'), 2200);
  };

  if (step === 'matched') {
    return (
      <div>
        <div className="page-header">
          <div><div className="page-title">Ride Matched! 🎉</div></div>
          <button className="btn btn-ghost" onClick={()=>setStep('form')}>Book Another</button>
        </div>
        <div style={{ maxWidth:500 }}>
          <div className="card" style={{ border:'1px solid rgba(196,169,109,0.25)', marginBottom:16 }}>
            <div style={{ textAlign:'center', padding:'12px 0 16px' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🚗</div>
              <div style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>Ali Raza</div>
              <div style={{ fontSize:13, color:'var(--text-s)', marginBottom:8 }}>Toyota Corolla 2022 · White · LHR-1234</div>
              <div style={{ color:'var(--accent)', fontSize:18 }}>★ 4.91</div>
            </div>
            <div className="divider" />
            <div className="metric-row"><span className="metric-key">Pickup</span><span className="metric-val">{pickup || 'F-7 Markaz'}</span></div>
            <div className="metric-row"><span className="metric-key">Dropoff</span><span className="metric-val">{dropoff || 'Blue Area'}</span></div>
            <div className="metric-row"><span className="metric-key">Vehicle</span><span className="metric-val">{selected.label}</span></div>
            <div className="metric-row"><span className="metric-key">Est. Fare</span><span className="metric-val accent">₨285.00</span></div>
            <div className="metric-row"><span className="metric-key">ETA</span><span className="metric-val" style={{ color:'var(--success-fg)' }}>~4 min</span></div>
            <div className="divider" />
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ fontSize:11, color:'var(--text-m)', marginBottom:4 }}>Driver is on the way</div>
              <div className="live-dot" /><span style={{ fontSize:12, color:'var(--success-fg)' }}>Live tracking active</span>
            </div>
          </div>
          <button className="btn btn-danger" style={{ width:'100%', justifyContent:'center' }}>Cancel Ride</button>
        </div>
      </div>
    );
  }

  if (step === 'searching') {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:16 }}>
        <div style={{ fontSize:48 }}>🔍</div>
        <div style={{ fontSize:18, fontWeight:600 }}>Finding you a driver…</div>
        <div style={{ fontSize:13, color:'var(--text-s)' }}>Searching {selected.label} drivers near you</div>
        <div style={{ display:'flex', gap:6, marginTop:8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)', animation:`pulse-dot 1.4s ${i*0.2}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Book a Ride</div>
          <div className="page-subtitle">Enter your pickup and destination</div>
        </div>
      </div>

      <div className="grid-6-4">
        {/* Form */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Location inputs */}
          <div className="card">
            <div className="card-title">Trip Details</div>
            <div style={{ display:'flex', gap:12, marginBottom:14 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:10 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--success-fg)' }} />
                <div style={{ width:1, flex:1, background:'var(--border)', margin:'6px 0' }} />
                <div style={{ width:10, height:10, borderRadius:2, background:'var(--danger-fg)' }} />
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                <input className="input" placeholder="Pickup location" value={pickup} onChange={e=>setPickup(e.target.value)} />
                <input className="input" placeholder="Dropoff destination" value={dropoff} onChange={e=>setDropoff(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Schedule (optional)</label>
              <input className="input" type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)} />
            </div>
          </div>

          {/* Vehicle Type */}
          <div className="card">
            <div className="card-title">Vehicle Type</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {VEHICLE_TYPES.map(v => (
                <div
                  key={v.key}
                  onClick={() => setVehicleType(v.key)}
                  style={{
                    padding:'12px 14px', borderRadius:8, cursor:'pointer', transition:'all 0.15s',
                    border: vehicleType === v.key ? '1px solid rgba(196,169,109,0.4)' : '1px solid var(--border)',
                    background: vehicleType === v.key ? 'var(--accent-dim)' : 'var(--bg-s2)',
                    display:'flex', justifyContent:'space-between', alignItems:'center'
                  }}
                >
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <span style={{ fontSize:24 }}>{v.icon}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color: vehicleType===v.key ? 'var(--accent)' : 'var(--text-p)' }}>{v.label}</div>
                      <div style={{ fontSize:11, color:'var(--text-m)' }}>{v.desc}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, color: vehicleType===v.key ? 'var(--accent)' : 'var(--text-s)', fontWeight:500 }}>{v.base}</div>
                    {vehicleType === v.key && <span className="badge badge-accent" style={{ marginTop:4 }}>Selected</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Promo */}
          <div className="card">
            <div className="card-title">Promo Code</div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="input" placeholder="Enter code (e.g. WELCOME10)" value={promo} onChange={e=>setPromo(e.target.value.toUpperCase())} style={{ flex:1 }} />
              <button className="btn btn-ghost">Apply</button>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:10 }}>
              {PROMO_CODES.map(c => (
                <button key={c} className="btn btn-ghost btn-sm" onClick={()=>setPromo(c)}>
                  <span className="badge badge-accent">{c}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ justifyContent:'center', padding:'12px', fontSize:15 }}
            disabled={!pickup || !dropoff}
            onClick={handleBook}
          >
            {(!pickup || !dropoff) ? 'Enter pickup & destination' : `Request ${selected.label} Ride →`}
          </button>
        </div>

        {/* Sidebar: fare estimate + popular */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-title">Fare Estimate</div>
            <div style={{ fontSize:32, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>₨285</div>
            <div style={{ fontSize:12, color:'var(--text-m)', marginBottom:14 }}>for ~8 km · ~22 min</div>
            <div className="metric-row"><span className="metric-key">Base fare</span><span className="metric-val">₨80</span></div>
            <div className="metric-row"><span className="metric-key">Distance (8km)</span><span className="metric-val">₨200</span></div>
            <div className="metric-row"><span className="metric-key">Time (22min)</span><span className="metric-val">₨66</span></div>
            {promo && <div className="metric-row"><span className="metric-key">Promo ({promo})</span><span className="metric-val" style={{ color:'var(--success-fg)' }}>−₨34.60</span></div>}
            <div className="divider" />
            <div className="metric-row">
              <span style={{ fontWeight:600 }}>Total</span>
              <span style={{ color:'var(--accent)', fontWeight:700, fontSize:16 }}>{promo ? '₨311.40' : '₨346.00'}</span>
            </div>
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, color:'var(--text-m)', marginBottom:6 }}>No surge active right now</div>
              <div style={{ fontSize:11, color:'var(--text-m)' }}>Payment via Wallet or Cash</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Popular Routes</div>
            {POPULAR_ROUTES.map((r, i) => (
              <div key={i} className="metric-row" style={{ cursor:'pointer', flexDirection:'column', alignItems:'flex-start', padding:'8px 0' }}
                onClick={() => { setPickup(r.from); setDropoff(r.to); }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:2 }}>{r.from}</div>
                <div style={{ fontSize:11, color:'var(--text-m)' }}>→ {r.to}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

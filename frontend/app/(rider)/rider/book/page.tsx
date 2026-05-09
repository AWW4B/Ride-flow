'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';

const VEHICLE_TYPES = [
  { key:'economy', label:'Economy', icon:'🚗', desc:'Affordable everyday rides', base:'₨80 + ₨25/km' },
  { key:'premium', label:'Premium', icon:'🏎️', desc:'Luxury vehicles, priority service', base:'₨150 + ₨45/km' },
  { key:'bike',    label:'Bike',    icon:'🏍️', desc:'Fast & budget-friendly', base:'₨40 + ₨12/km' },
];

const POPULAR_ROUTES = [
  { from:'F-7 Markaz, Islamabad', to:'Blue Area, Islamabad' },
  { from:'G-9 Markaz, Islamabad', to:'Jinnah Super, Islamabad' },
  { from:'E-11, Islamabad',        to:'DHA Phase 2, Islamabad' },
];

export default function BookRidePage() {
  const router = useRouter();

  const [pickup,      setPickup]      = useState('');
  const [dropoff,     setDropoff]     = useState('');
  const [vehicleType, setVehicleType] = useState('economy');
  const [promo,       setPromo]       = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle'|'checking'|'valid'|'invalid'>('idle');
  const [promoDetail, setPromoDetail] = useState<any>(null);
  const [schedule,    setSchedule]    = useState('');

  const [step,        setStep]        = useState<'form'|'searching'|'matched'>('form');
  const [booking,     setBooking]     = useState(false);
  const [activeRide,  setActiveRide]  = useState<any>(null);
  const [cancelling,  setCancelling]  = useState(false);

  // Promo chips removed — rider types the code manually and clicks Apply

  const applyPromo = async () => {
    if (!promo.trim()) return;
    setPromoStatus('checking');
    try {
      const detail = await api.rider.checkPromo(promo.trim());
      setPromoDetail(detail);
      setPromoStatus('valid');
    } catch {
      setPromoDetail(null);
      setPromoStatus('invalid');
    }
  };

  const handleBook = async () => {
    if (!pickup || !dropoff) return;
    setBooking(true);
    try {
      const ride = await api.rider.requestRide({
        pickup_address:  pickup,
        dropoff_address: dropoff,
        vehicle_type:    vehicleType,
        promo_code:      promoStatus === 'valid' ? promo : undefined,
        scheduled_at:    schedule || undefined,
      });
      setActiveRide(ride);
      setStep('matched');
    } catch (err: any) {
      alert(err.message ?? 'Could not request ride');
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      if (activeRide?.ride_id) {
        await api.rider.cancelRide(activeRide.ride_id);
      } else if (activeRide?.request_id) {
        await api.rider.cancelRequest(activeRide.request_id);
      }
      setStep('form');
      setActiveRide(null);
    } catch (err: any) {
      alert(err.message ?? 'Could not cancel');
    } finally { setCancelling(false); }
  };

  const selected = VEHICLE_TYPES.find(v => v.key === vehicleType)!;

  if (step === 'matched') {
    return (
      <div>
        <div className="page-header">
          <div><div className="page-title">Ride Requested! 🎉</div></div>
          <button className="btn btn-ghost" onClick={() => { setStep('form'); setActiveRide(null); }}>Book Another</button>
        </div>
        <div style={{ maxWidth:500 }}>
          <div className="card" style={{ border:'1px solid rgba(196,169,109,0.25)', marginBottom:16 }}>
            <div style={{ textAlign:'center', padding:'12px 0 16px' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🚗</div>
              <div style={{ fontSize:18, fontWeight:700, marginBottom:2 }}>Searching for a driver…</div>
              <div style={{ fontSize:13, color:'var(--text-s)', marginBottom:8 }}>Ride #{activeRide?.ride_id ?? '—'}</div>
            </div>
            <div className="divider" />
            <div className="metric-row"><span className="metric-key">Pickup</span><span className="metric-val">{pickup}</span></div>
            <div className="metric-row"><span className="metric-key">Dropoff</span><span className="metric-val">{dropoff}</span></div>
            <div className="metric-row"><span className="metric-key">Vehicle</span><span className="metric-val">{selected.label}</span></div>
            {activeRide?.final_fare && (
              <div className="metric-row"><span className="metric-key">Fare</span><span className="metric-val accent">₨{Number(activeRide.final_fare).toLocaleString()}</span></div>
            )}
            <div className="divider" />
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div className="live-dot" />
              <span style={{ fontSize:12, color:'var(--success-fg)' }}>Looking for nearby drivers</span>
            </div>
          </div>
          <button
            className="btn btn-danger"
            style={{ width:'100%', justifyContent:'center', opacity: cancelling ? 0.7 : 1 }}
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? 'Cancelling…' : 'Cancel Ride'}
          </button>
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
                <input className="input" placeholder="Pickup — e.g. F-7 Markaz, Islamabad" value={pickup} onChange={e=>setPickup(e.target.value)} />
                <input className="input" placeholder="Dropoff — e.g. Blue Area, Islamabad"  value={dropoff} onChange={e=>setDropoff(e.target.value)} />
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
              <input
                className="input"
                placeholder="Enter code (e.g. WELCOME10)"
                value={promo}
                onChange={e => { setPromo(e.target.value.toUpperCase()); setPromoStatus('idle'); setPromoDetail(null); }}
                style={{ flex:1 }}
              />
              <button
                className="btn btn-ghost"
                onClick={applyPromo}
                disabled={promoStatus === 'checking' || !promo.trim()}
              >
                {promoStatus === 'checking' ? '…' : 'Apply'}
              </button>
            </div>
            {promoStatus === 'valid' && promoDetail && (
              <div style={{ marginTop:8, fontSize:12, color:'var(--success-fg)', padding:'6px 10px', background:'rgba(100,200,100,0.1)', borderRadius:6 }}>
                ✓ {promoDetail.discount_type === 'percentage' ? `${promoDetail.discount_value}% off` : `₨${promoDetail.discount_value} off`} applied
              </div>
            )}
            {promoStatus === 'invalid' && (
              <div style={{ marginTop:8, fontSize:12, color:'var(--danger)', padding:'6px 10px', background:'rgba(200,60,60,0.1)', borderRadius:6 }}>
                Invalid or expired promo code
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ justifyContent:'center', padding:'12px', fontSize:15, opacity: booking ? 0.7 : 1 }}
            disabled={!pickup || !dropoff || booking}
            onClick={handleBook}
          >
            {booking ? 'Requesting ride…' : (!pickup || !dropoff) ? 'Enter pickup & destination' : `Request ${selected.label} Ride →`}
          </button>
        </div>

        {/* Sidebar: popular routes */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-title">Fare Info</div>
            <div className="metric-row"><span className="metric-key">Base fare</span><span className="metric-val">₨{selected.key==='economy'?80:selected.key==='premium'?150:40}</span></div>
            <div className="metric-row"><span className="metric-key">Per km</span><span className="metric-val">₨{selected.key==='economy'?25:selected.key==='premium'?45:12}</span></div>
            <div className="metric-row"><span className="metric-key">Per min</span><span className="metric-val">₨{selected.key==='economy'?3:selected.key==='premium'?5:1.5}</span></div>
            <div className="divider" />
            <div style={{ fontSize:11, color:'var(--text-m)' }}>Final fare calculated by server including surge & promo</div>
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

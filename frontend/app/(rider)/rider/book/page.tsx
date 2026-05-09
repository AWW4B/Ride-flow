'use client';
import { useState, useEffect, useRef } from 'react';
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

// ── ride-status helpers ────────────────────────────────────────────────────────
const STATUS_STEPS = [
  { key: 'pending',         label: 'Waiting for driver',   icon: '🕐', color: 'var(--warn-fg)' },
  { key: 'accepted',        label: 'Driver accepted!',     icon: '✅', color: 'var(--success-fg)' },
  { key: 'driver_en_route', label: 'Driver on the way',    icon: '🚗', color: 'var(--accent)' },
  { key: 'in_progress',     label: 'Ride in progress',     icon: '🏁', color: 'var(--accent)' },
  { key: 'completed',       label: 'Ride complete!',       icon: '🎉', color: 'var(--success-fg)' },
];

function getStepInfo(requestStatus: string, rideStatus?: string) {
  const status = rideStatus ?? requestStatus ?? 'pending';
  return STATUS_STEPS.find(s => s.key === status) ?? STATUS_STEPS[0];
}

function StepProgress({ requestStatus, rideStatus }: { requestStatus: string; rideStatus?: string }) {
  const current = rideStatus ?? requestStatus ?? 'pending';
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '20px 0' }}>
      {STATUS_STEPS.map((s, i) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
            background: i <= currentIdx ? s.color : 'var(--bg-s2)',
            color: i <= currentIdx ? '#fff' : 'var(--text-m)',
            border: `2px solid ${i <= currentIdx ? s.color : 'var(--border)'}`,
            transition: 'all 0.4s ease',
          }}>
            {i < currentIdx ? '✓' : i === currentIdx ? s.icon : i + 1}
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2,
              background: i < currentIdx ? 'var(--success-fg)' : 'var(--border)',
              transition: 'background 0.4s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── component ──────────────────────────────────────────────────────────────────
export default function BookRidePage() {
  const router = useRouter();

  // form state
  const [pickup,      setPickup]      = useState('');
  const [dropoff,     setDropoff]     = useState('');
  const [vehicleType, setVehicleType] = useState('economy');
  const [promo,       setPromo]       = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle'|'checking'|'valid'|'invalid'>('idle');
  const [promoDetail, setPromoDetail] = useState<any>(null);
  const [schedule,    setSchedule]    = useState('');

  // booking / live state
  const [step,        setStep]        = useState<'form'|'live'|'completed'>('form');
  const [booking,     setBooking]     = useState(false);
  const [liveRide,    setLiveRide]    = useState<any>(null);   // estimated fare + request_id
  const [cancelling,  setCancelling]  = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── poll active ride every 3s ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'live') { if (pollRef.current) clearInterval(pollRef.current); return; }

    const poll = async () => {
      try {
        const data = await api.rider.getActiveRide();
        if (!data.active) { setStep('form'); return; }
        setLiveRide((prev: any) => ({ ...prev, ...data }));
        if (data.ride_status === 'completed') {
          setStep('completed');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* ignore poll errors */ }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step]);

  // ── booking submission ──────────────────────────────────────────────────────
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
      setLiveRide(ride);   // has estimated_fare, request_id
      setStep('live');
    } catch (err: any) {
      alert(err.message ?? 'Could not request ride');
    } finally {
      setBooking(false);
    }
  };

  // ── cancel ──────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    setCancelling(true);
    try {
      const rid  = liveRide?.ride_id;
      const reqId = liveRide?.request_id;
      if (rid)   await api.rider.cancelRide(rid);
      else if (reqId) await api.rider.cancelRequest(reqId);
      setStep('form');
      setLiveRide(null);
    } catch (err: any) {
      alert(err.message ?? 'Could not cancel');
    } finally { setCancelling(false); }
  };

  const selected = VEHICLE_TYPES.find(v => v.key === vehicleType)!;
  const stepInfo = liveRide ? getStepInfo(liveRide.request_status, liveRide.ride_status) : STATUS_STEPS[0];
  const canCancel = !liveRide?.ride_status || ['pending','accepted'].includes(liveRide?.ride_status ?? '');

  // ──────────────────────────────────────────────────────────────────────────
  // COMPLETED screen
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'completed') {
    const fare = liveRide?.final_fare ?? liveRide?.estimated_fare ?? '—';
    return (
      <div>
        <div className="page-header">
          <div><div className="page-title">Ride Completed 🎉</div></div>
          <button className="btn btn-primary" onClick={() => { setStep('form'); setLiveRide(null); }}>Book Another</button>
        </div>
        <div style={{ maxWidth: 500 }}>
          <div className="card" style={{ border: '1px solid rgba(100,200,100,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>You have arrived!</div>
            <div style={{ fontSize: 13, color: 'var(--text-m)', marginBottom: 20 }}>Thank you for riding with RideFlow</div>
            <div className="divider" />
            <div className="metric-row"><span className="metric-key">From</span><span className="metric-val">{liveRide?.pickup_address}</span></div>
            <div className="metric-row"><span className="metric-key">To</span><span className="metric-val">{liveRide?.dropoff_address}</span></div>
            {liveRide?.driver_name && <div className="metric-row"><span className="metric-key">Driver</span><span className="metric-val">{liveRide.driver_name}</span></div>}
            <div className="divider" />
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success-fg)', margin: '12px 0' }}>
              ₨{typeof fare === 'number' ? fare.toLocaleString() : fare}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-m)', marginBottom: 16 }}>Cash payment — paid to driver</div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => router.push('/rider/history')}>View Ride History</button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LIVE TRACKING screen
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 'live') {
    const fare = liveRide?.final_fare ?? liveRide?.estimated_fare;
    return (
      <div>
        <div className="page-header">
          <div><div className="page-title">Live Ride Tracking</div></div>
        </div>
        <div style={{ maxWidth: 560 }}>
          <div className="card" style={{ border: '1px solid rgba(196,169,109,0.2)' }}>
            {/* Status header */}
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>{stepInfo.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: stepInfo.color }}>{stepInfo.label}</div>
              {liveRide?.driver_name && (
                <div style={{ fontSize: 13, color: 'var(--text-m)', marginTop: 4 }}>
                  Driver: <strong>{liveRide.driver_name}</strong>
                  {liveRide.driver_rating > 0 && ` · ★ ${Number(liveRide.driver_rating).toFixed(1)}`}
                </div>
              )}
            </div>

            {/* Step progress bar */}
            <StepProgress requestStatus={liveRide?.request_status} rideStatus={liveRide?.ride_status} />

            <div className="divider" />

            {/* Trip details */}
            <div className="metric-row"><span className="metric-key">📍 Pickup</span><span className="metric-val" style={{ fontSize: 12 }}>{liveRide?.pickup_address ?? pickup}</span></div>
            <div className="metric-row"><span className="metric-key">🏁 Dropoff</span><span className="metric-val" style={{ fontSize: 12 }}>{liveRide?.dropoff_address ?? dropoff}</span></div>
            <div className="metric-row">
              <span className="metric-key">💰 Fare</span>
              <span className="metric-val accent" style={{ fontWeight: 700 }}>
                {fare ? `₨${Number(fare).toLocaleString()}` : 'Calculating…'}
              </span>
            </div>

            <div className="divider" />

            {/* Pulsing live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '8px 0' }}>
              <div className="live-dot" />
              <span style={{ fontSize: 12, color: 'var(--text-m)' }}>Updating every 3 seconds…</span>
            </div>

            {/* Cancel — only before driver_en_route */}
            {canCancel && (
              <button
                className="btn btn-danger"
                style={{ width: '100%', justifyContent: 'center', marginTop: 12, opacity: cancelling ? 0.7 : 1 }}
                disabled={cancelling}
                onClick={handleCancel}
              >
                {cancelling ? 'Cancelling…' : 'Cancel Ride'}
              </button>
            )}
            {!canCancel && (
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-m)', marginTop: 12 }}>
                Ride in progress — cannot cancel
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BOOKING FORM
  // ──────────────────────────────────────────────────────────────────────────
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Location inputs */}
          <div className="card">
            <div className="card-title">Trip Details</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success-fg)' }} />
                <div style={{ width: 1, flex: 1, background: 'var(--border)', margin: '6px 0' }} />
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger-fg)' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input className="input" placeholder="Pickup — e.g. F-7 Markaz, Islamabad" value={pickup} onChange={e => setPickup(e.target.value)} />
                <input className="input" placeholder="Dropoff — e.g. Blue Area, Islamabad"  value={dropoff} onChange={e => setDropoff(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Schedule (optional)</label>
              <input className="input" type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} />
            </div>
          </div>

          {/* Vehicle Type */}
          <div className="card">
            <div className="card-title">Vehicle Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {VEHICLE_TYPES.map(v => (
                <div key={v.key} onClick={() => setVehicleType(v.key)} style={{
                  padding: '12px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                  border: vehicleType === v.key ? '1px solid rgba(196,169,109,0.4)' : '1px solid var(--border)',
                  background: vehicleType === v.key ? 'var(--accent-dim)' : 'var(--bg-s2)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 24 }}>{v.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: vehicleType === v.key ? 'var(--accent)' : 'var(--text-p)' }}>{v.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-m)' }}>{v.desc}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: vehicleType === v.key ? 'var(--accent)' : 'var(--text-s)', fontWeight: 500 }}>{v.base}</div>
                    {vehicleType === v.key && <span className="badge badge-accent" style={{ marginTop: 4 }}>Selected</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Promo */}
          <div className="card">
            <div className="card-title">Promo Code</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Enter code (e.g. WELCOME10)" value={promo}
                onChange={e => { setPromo(e.target.value.toUpperCase()); setPromoStatus('idle'); setPromoDetail(null); }}
                style={{ flex: 1 }} />
              <button className="btn btn-ghost" onClick={async () => {
                if (!promo.trim()) return;
                setPromoStatus('checking');
                try {
                  const d = await api.rider.checkPromo(promo.trim());
                  setPromoDetail(d); setPromoStatus('valid');
                } catch { setPromoDetail(null); setPromoStatus('invalid'); }
              }} disabled={promoStatus === 'checking' || !promo.trim()}>
                {promoStatus === 'checking' ? '…' : 'Apply'}
              </button>
            </div>
            {promoStatus === 'valid' && promoDetail && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success-fg)', padding: '6px 10px', background: 'rgba(100,200,100,0.1)', borderRadius: 6 }}>
                ✓ {promoDetail.discount_type === 'percentage' ? `${promoDetail.discount_value}% off` : `₨${promoDetail.discount_value} off`} applied
              </div>
            )}
            {promoStatus === 'invalid' && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', padding: '6px 10px', background: 'rgba(200,60,60,0.1)', borderRadius: 6 }}>
                Invalid or expired promo code
              </div>
            )}
          </div>

          <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px', fontSize: 15, opacity: booking ? 0.7 : 1 }}
            disabled={!pickup || !dropoff || booking} onClick={handleBook}>
            {booking ? 'Requesting ride…' : (!pickup || !dropoff) ? 'Enter pickup & destination' : `Request ${selected.label} Ride →`}
          </button>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title">Fare Estimate</div>
            <div className="metric-row"><span className="metric-key">Base fare</span><span className="metric-val">₨{selected.key==='economy'?80:selected.key==='premium'?150:40}</span></div>
            <div className="metric-row"><span className="metric-key">Per km</span><span className="metric-val">₨{selected.key==='economy'?25:selected.key==='premium'?45:12}</span></div>
            <div className="metric-row"><span className="metric-key">Per min</span><span className="metric-val">₨{selected.key==='economy'?3:selected.key==='premium'?5:1.5}</span></div>
            <div className="divider" />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
              Approx: ₨{selected.key==='economy'?205:selected.key==='premium'?325:102}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-m)', marginTop: 4 }}>Based on 5 km · 10 min avg</div>
          </div>

          <div className="card">
            <div className="card-title">Popular Routes</div>
            {POPULAR_ROUTES.map((r, i) => (
              <div key={i} className="metric-row" style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 0' }}
                onClick={() => { setPickup(r.from); setDropoff(r.to); }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{r.from}</div>
                <div style={{ fontSize: 11, color: 'var(--text-m)' }}>→ {r.to}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">How it works</div>
            {['Request your ride', 'Driver accepts (auto-advances)', 'Track status live', 'Pay cash on arrival'].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</span>
                <span style={{ fontSize: 12, color: 'var(--text-m)', paddingTop: 2 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

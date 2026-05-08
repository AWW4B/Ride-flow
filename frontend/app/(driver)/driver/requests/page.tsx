'use client';
import { useState } from 'react';

const INCOMING = [
  {
    id: 3, rider_name: 'Sara Khan', rider_rating: 4.0, pickup: 'E-11, Islamabad',
    dropoff: 'DHA Phase 2, Islamabad', distance_km: 9.2, estimated_fare: 290,
    vehicle_type: 'Economy', surge: 1.0, surge_type: 'none', time: '2 min ago',
  },
  {
    id: 7, rider_name: 'Omar Siddiq', rider_rating: 4.5, pickup: 'F-6 Markaz, Islamabad',
    dropoff: 'I-9, Islamabad', distance_km: 5.8, estimated_fare: 225,
    vehicle_type: 'Economy', surge: 1.5, surge_type: 'time_based', time: 'Just now',
  },
];

export default function RequestsPage() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [accepted, setAccepted] = useState<number | null>(null);

  const visible = INCOMING.filter(r => !dismissed.includes(r.id));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ride Requests</div>
          <div className="page-subtitle">Incoming requests near your location</div>
        </div>
        <div>
          <span className="badge badge-success" style={{ padding:'6px 12px' }}>
            <span className="live-dot" />{visible.length} Incoming
          </span>
        </div>
      </div>

      {accepted !== null && (
        <div className="mb-16" style={{ background:'var(--success-bg)', border:'1px solid rgba(107,142,35,0.25)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--success-fg)' }}>✓ Ride accepted — navigating to pickup</div>
          <div style={{ fontSize:12, color:'var(--text-s)', marginTop:4 }}>Head to pickup location. Rider has been notified.</div>
        </div>
      )}

      {visible.length === 0 && accepted === null && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🕐</div>
            <p>No pending requests near you.</p>
            <p style={{ marginTop:4 }}>Make sure you are set to <strong style={{ color:'var(--accent)' }}>Online</strong>.</p>
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {visible.map(req => (
          <div key={req.id} className="card" style={{ border:'1px solid rgba(196,169,109,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--text-m)', marginBottom:3 }}>{req.time}</div>
                <div style={{ fontSize:16, fontWeight:650 }}>Ride Request #{req.id}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:22, fontWeight:700, color:'var(--accent)' }}>₨{req.estimated_fare}</div>
                {req.surge > 1 && <span className="badge badge-warn">×{req.surge} Peak Surge</span>}
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom:14 }}>
              <div>
                <div style={{ fontSize:10, color:'var(--text-m)', fontWeight:500, marginBottom:4, letterSpacing:'0.5px', textTransform:'uppercase' }}>Rider</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div className="avatar">{req.rider_name[0]}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{req.rider_name}</div>
                    <div style={{ fontSize:12, color:'var(--accent)' }}>★ {req.rider_rating.toFixed(1)}</div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'var(--text-m)', fontWeight:500, marginBottom:4, letterSpacing:'0.5px', textTransform:'uppercase' }}>Trip</div>
                <div className="kv-pair"><span className="kv-key">Distance</span><span className="kv-val">{req.distance_km} km</span></div>
                <div className="kv-pair"><span className="kv-key">Type</span><span className="kv-val">{req.vehicle_type}</span></div>
              </div>
            </div>

            {/* Route */}
            <div style={{ background:'var(--bg-s2)', borderRadius:8, padding:'10px 12px', marginBottom:14, border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:3 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--success-fg)' }} />
                  <div style={{ width:1, height:20, background:'var(--border)', margin:'3px 0' }} />
                  <div style={{ width:8, height:8, borderRadius:2, background:'var(--danger-fg)' }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>{req.pickup}</div>
                  <div style={{ fontSize:12, color:'var(--text-s)' }}>{req.dropoff}</div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button
                className="btn btn-primary"
                style={{ flex:1, justifyContent:'center', padding:'10px' }}
                onClick={() => { setAccepted(req.id); setDismissed(d => [...d, req.id]); }}
              >
                ✓ Accept Ride
              </button>
              <button
                className="btn btn-ghost"
                style={{ flex:1, justifyContent:'center', padding:'10px' }}
                onClick={() => setDismissed(d => [...d, req.id])}
              >
                ✕ Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { mockRides, mockRatings } from '@/utils/mockData';
import { getRideStatusBadge, formatCurrency, formatDateTime, renderStars } from '@/utils/helpers';

const myRides = mockRides.filter(r => r.rider_name === 'Sara Khan');

export default function RiderTripsPage() {
  const [ratingRide, setRatingRide] = useState<number | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [submitted, setSubmitted] = useState<number[]>([]);
  const [comment, setComment] = useState('');

  const completed = myRides.filter(r => r.status === 'completed');
  const totalSpent = completed.reduce((s,r) => s + r.final_fare, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Trips</div>
          <div className="page-subtitle">Your complete ride history</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <span className="badge badge-success" style={{ padding:'6px 12px' }}>{completed.length} completed</span>
          <span className="badge badge-accent" style={{ padding:'6px 12px' }}>₨{formatCurrency(totalSpent)} spent</span>
        </div>
      </div>

      {/* Rate dialog */}
      {ratingRide && !submitted.includes(ratingRide) && (
        <div className="mb-16" style={{ background:'var(--bg-s1)', border:'1px solid rgba(196,169,109,0.25)', borderRadius:12, padding:'16px 20px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Rate your driver for Ride #{ratingRide}</div>
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={()=>setRatingScore(s)} style={{
                fontSize:26, background:'none', border:'none', cursor:'pointer',
                color: s <= ratingScore ? 'var(--accent)' : 'var(--text-m)',
                transition:'color 0.1s, transform 0.1s',
                transform: s <= ratingScore ? 'scale(1.15)' : 'scale(1)',
              }}>★</button>
            ))}
          </div>
          <textarea className="input" rows={2} placeholder="Leave a comment (optional)" value={comment} onChange={e=>setComment(e.target.value)} style={{ marginBottom:10, resize:'none' }} />
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary" disabled={!ratingScore} onClick={() => { setSubmitted(s=>[...s,ratingRide!]); setRatingRide(null); setRatingScore(0); setComment(''); }}>
              Submit Rating
            </button>
            <button className="btn btn-ghost" onClick={()=>setRatingRide(null)}>Skip</button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {myRides.map(r => (
          <div key={r.ride_id} className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span className="mono" style={{ fontSize:12, color:'var(--text-m)' }}>Ride #{r.ride_id}</span>
                  {getRideStatusBadge(r.status)}
                  {r.surge_multiplier > 1 && <span className="badge badge-warn">×{r.surge_multiplier} Surge</span>}
                </div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{r.driver_name}</div>
                <div style={{ fontSize:12, color:'var(--text-s)' }}>{r.vehicle}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                {r.final_fare > 0 && <div style={{ fontSize:20, fontWeight:700, color:'var(--accent)' }}>₨{formatCurrency(r.final_fare)}</div>}
                <div style={{ fontSize:12, color:'var(--text-m)', marginTop:2 }}>{r.payment_method} · {formatDateTime(r.started_at)}</div>
              </div>
            </div>
            <div className="divider" style={{ margin:'10px 0' }} />
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:3 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--success-fg)' }} />
                <div style={{ width:1, height:16, background:'var(--border)', margin:'4px 0' }} />
                <div style={{ width:8, height:8, borderRadius:2, background:'var(--danger-fg)' }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, marginBottom:6 }}>{r.pickup_address}</div>
                <div style={{ fontSize:12, color:'var(--text-s)' }}>{r.dropoff_address}</div>
              </div>
              {r.distance_km > 0 && (
                <div style={{ fontSize:11, color:'var(--text-m)', textAlign:'right' }}>
                  <div>{r.distance_km} km</div>
                  <div>{r.duration_min} min</div>
                </div>
              )}
            </div>

            {r.status === 'completed' && (
              <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end', gap:8 }}>
                {submitted.includes(r.ride_id) ? (
                  <span className="badge badge-success">✓ Rated</span>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => setRatingRide(r.ride_id)}>
                    ★ Rate Driver
                  </button>
                )}
                <button className="btn btn-ghost btn-sm">Book Again</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

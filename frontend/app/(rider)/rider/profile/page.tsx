'use client';
import { mockRiders, mockRatings } from '@/utils/mockData';
import { getAccountStatusBadge, formatDate, formatCurrency } from '@/utils/helpers';

const rider = mockRiders[0]; // Sara Khan
const myRatings = mockRatings.filter(r => r.ratee_name === 'Sara Khan');

export default function RiderProfilePage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Profile</div>
          <div className="page-subtitle">Account info and reputation</div>
        </div>
        <button className="btn btn-ghost">Edit Profile</button>
      </div>

      <div className="grid-6-4 mb-16">
        {/* Profile */}
        <div className="card">
          <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:16 }}>
            <div style={{ width:64, height:64, borderRadius:14, background:'var(--info-bg)', border:'2px solid rgba(106,159,212,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:'var(--info-fg)', flexShrink:0 }}>
              {rider.full_name[0]}
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:700 }}>{rider.full_name}</div>
              <div style={{ fontSize:13, color:'var(--text-s)', marginTop:2 }}>{rider.email}</div>
              <div style={{ fontSize:12, color:'var(--text-m)', marginTop:4 }}>Rider since {formatDate(rider.registered_at)}</div>
              <div style={{ marginTop:8 }}>{getAccountStatusBadge(rider.account_status)}</div>
            </div>
          </div>
          <div className="divider" />
          <div className="grid-2">
            <div>
              <div className="metric-row"><span className="metric-key">Phone</span><span className="metric-val">{rider.phone}</span></div>
              <div className="metric-row"><span className="metric-key">Total Rides</span><span className="metric-val accent">{rider.total_rides}</span></div>
              <div className="metric-row"><span className="metric-key">Total Spent</span><span className="metric-val">₨{formatCurrency(rider.total_spent)}</span></div>
            </div>
            <div>
              <div className="metric-row"><span className="metric-key">My Rating</span><span className="metric-val accent">★ {rider.avg_rating.toFixed(1)}</span></div>
              <div className="metric-row"><span className="metric-key">Cancellations</span><span className="metric-val" style={{ color: rider.cancelled_rides > 2 ? 'var(--warn-fg)' : undefined }}>{rider.cancelled_rides}</span></div>
              <div className="metric-row"><span className="metric-key">Member Since</span><span className="metric-val">{formatDate(rider.registered_at)}</span></div>
            </div>
          </div>
          <div className="divider" />
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}>Change Password</button>
            <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}>Manage Phones</button>
          </div>
        </div>

        {/* Rating summary */}
        <div className="card">
          <div className="card-title">Passenger Rating</div>
          <div style={{ textAlign:'center', padding:'12px 0 16px' }}>
            <div style={{ fontSize:48, fontWeight:700, color:'var(--accent)', letterSpacing:-2 }}>{rider.avg_rating.toFixed(1)}</div>
            <div style={{ fontSize:20, color:'var(--accent)', margin:'4px 0' }}>{'★'.repeat(Math.round(rider.avg_rating))}{'☆'.repeat(5-Math.round(rider.avg_rating))}</div>
            <div style={{ fontSize:12, color:'var(--text-m)' }}>{myRatings.length} ratings from drivers</div>
          </div>
          <div style={{ background: rider.avg_rating >= 4.0 ? 'var(--success-bg)' : rider.avg_rating >= 3.0 ? 'var(--warn-bg)' : 'var(--danger-bg)', borderRadius:8, padding:'10px 12px', textAlign:'center', border: `1px solid ${rider.avg_rating >= 4.0 ? 'rgba(107,142,35,0.2)' : rider.avg_rating >= 3.0 ? 'rgba(196,150,60,0.2)' : 'rgba(180,70,60,0.2)'}` }}>
            <div style={{ fontSize:13, fontWeight:500, color: rider.avg_rating >= 4.0 ? 'var(--success-fg)' : rider.avg_rating >= 3.0 ? 'var(--warn-fg)' : 'var(--danger-fg)' }}>
              {rider.avg_rating >= 4.5 ? '🌟 Excellent Passenger' : rider.avg_rating >= 4.0 ? '✅ Good Standing' : rider.avg_rating >= 3.0 ? '⚠ Needs Improvement' : '🚩 At Risk of Suspension'}
            </div>
            <div style={{ fontSize:11, color:'var(--text-s)', marginTop:2 }}>
              {rider.avg_rating >= 3.0 ? 'Keep being respectful to drivers!' : 'Ratings below 3.0 may result in account suspension.'}
            </div>
          </div>
        </div>
      </div>

      {/* Ratings received from drivers */}
      <div className="card">
        <div className="card-title">Reviews From Drivers</div>
        {myRatings.length === 0 && (
          <div className="empty-state"><div className="empty-icon">💬</div><p>No reviews yet.</p></div>
        )}
        {myRatings.map(r => (
          <div key={r.rating_id} style={{ padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div className="avatar gold">{r.rater_name[0]}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{r.rater_name}</div>
                  <div style={{ fontSize:11, color:'var(--text-m)' }}>Ride #{r.ride_id}</div>
                </div>
              </div>
              <div style={{ color:'var(--accent)', fontSize:15 }}>{'★'.repeat(r.score)}{'☆'.repeat(5-r.score)}</div>
            </div>
            {r.comment && <div style={{ marginTop:8, fontSize:12, color:'var(--text-s)', marginLeft:42 }}>&ldquo;{r.comment}&rdquo;</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

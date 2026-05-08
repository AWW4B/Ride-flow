'use client';
import { mockRatings, mockDrivers } from '@/utils/mockData';
import { renderStars, formatDateTime } from '@/utils/helpers';

const driver = mockDrivers[0];
const myRatings = mockRatings.filter(r => r.ratee_name === 'Ali Raza');

export default function DriverProfilePage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Profile</div>
          <div className="page-subtitle">Account details and ratings history</div>
        </div>
        <button className="btn btn-ghost">Edit Profile</button>
      </div>

      <div className="grid-6-4 mb-16">
        {/* Profile Card */}
        <div className="card">
          <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:16 }}>
            <div style={{ width:64, height:64, borderRadius:14, background:'var(--accent-dim)', border:'2px solid rgba(196,169,109,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:'var(--accent)', flexShrink:0 }}>
              {driver.full_name[0]}
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:700 }}>{driver.full_name}</div>
              <div style={{ fontSize:13, color:'var(--text-s)', marginTop:2 }}>{driver.email}</div>
              <div style={{ fontSize:12, color:'var(--text-m)', marginTop:4 }}>{driver.city} · Driver since Jan 2026</div>
              <div style={{ marginTop:8, display:'flex', gap:6 }}>
                <span className="badge badge-success">Verified</span>
                <span className="badge badge-success">Online</span>
              </div>
            </div>
          </div>
          <div className="divider" />
          <div className="grid-2">
            <div className="metric-row"><span className="metric-key">Phone</span><span className="metric-val">{driver.phone}</span></div>
            <div className="metric-row"><span className="metric-key">City</span><span className="metric-val">{driver.city}</span></div>
            <div className="metric-row"><span className="metric-key">License #</span><span className="metric-val" style={{ fontSize:12 }}>{driver.license_number}</span></div>
            <div className="metric-row"><span className="metric-key">CNIC</span><span className="metric-val" style={{ fontSize:12 }}>3520100000001</span></div>
          </div>
        </div>

        {/* Rating Summary */}
        <div className="card">
          <div className="card-title">Rating Summary</div>
          <div style={{ textAlign:'center', padding:'12px 0 16px' }}>
            <div style={{ fontSize:48, fontWeight:700, color:'var(--accent)', letterSpacing:-2 }}>{driver.avg_rating.toFixed(1)}</div>
            <div style={{ fontSize:20, color:'var(--accent)', margin:'4px 0' }}>{'★'.repeat(Math.round(driver.avg_rating))}</div>
            <div style={{ fontSize:12, color:'var(--text-m)' }}>{myRatings.length} ratings received</div>
          </div>
          <div className="divider" />
          {[5,4,3,2,1].map(s => {
            const count = myRatings.filter(r=>r.score===s).length;
            const pct = myRatings.length > 0 ? (count/myRatings.length)*100 : 0;
            return (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:11, color:'var(--text-s)', width:10 }}>{s}</span>
                <span style={{ color:'var(--accent)', fontSize:11 }}>★</span>
                <div className="progress-bar" style={{ flex:1 }}>
                  <div className="progress-fill" style={{ width:`${pct}%` }} />
                </div>
                <span style={{ fontSize:11, color:'var(--text-m)', width:16, textAlign:'right' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="card">
        <div className="card-title">Reviews From Riders</div>
        {myRatings.length === 0 && (
          <div className="empty-state"><div className="empty-icon">💬</div><p>No reviews yet.</p></div>
        )}
        {myRatings.map(r => (
          <div key={r.rating_id} style={{ padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div className="avatar">{r.rater_name[0]}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{r.rater_name}</div>
                  <div style={{ fontSize:11, color:'var(--text-m)' }}>Ride #{r.ride_id} · {formatDateTime(r.rated_at)}</div>
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

'use client';

const PROMO_CODES = [
  { code:'WELCOME10', type:'percentage', value:10, validFrom:'2026-01-01', validTo:'2026-12-31', usageLimit:1000, timesUsed:143, status:'active' },
  { code:'FLAT50',    type:'flat',       value:50, validFrom:'2026-04-01', validTo:'2026-06-30', usageLimit:500,  timesUsed:87,  status:'active' },
  { code:'EID25',     type:'percentage', value:25, validFrom:'2026-03-28', validTo:'2026-04-05', usageLimit:200,  timesUsed:200, status:'expired' },
];

const FARE_CONFIG = [
  { type:'Economy',  base:80,  perKm:25, perMin:3.00 },
  { type:'Premium',  base:150, perKm:45, perMin:5.00 },
  { type:'Bike',     base:40,  perKm:12, perMin:1.50 },
];

const SURGE_RULES = [
  { label:'Morning Peak',  from:'08:00', to:'10:00', days:'Mon–Fri', multiplier:1.50 },
  { label:'Evening Peak',  from:'17:00', to:'20:00', days:'Mon–Fri', multiplier:1.40 },
  { label:'Weekend Night', from:'22:00', to:'23:59', days:'Sat–Sun', multiplier:1.30 },
];

export default function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Platform configuration, fare rules, promo codes & surge pricing</div>
        </div>
        <button className="btn btn-primary">Save Changes</button>
      </div>

      <div className="grid-2 mb-16">
        {/* Fare Config */}
        <div className="card">
          <div className="card-title">Fare Configuration</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Vehicle Type</th><th>Base Rate</th><th>Per KM</th><th>Per Min</th></tr>
              </thead>
              <tbody>
                {FARE_CONFIG.map(fc=>(
                  <tr key={fc.type}>
                    <td style={{ fontWeight:500 }}>{fc.type}</td>
                    <td style={{ color:'var(--accent)' }}>₨{fc.base}</td>
                    <td className="muted">₨{fc.perKm}</td>
                    <td className="muted">₨{fc.perMin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divider" />
          <div className="metric-row">
            <span className="metric-key">Platform Commission</span>
            <span className="metric-val accent">20.00%</span>
          </div>
          <div style={{ marginTop:12 }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label" style={{ display:'block', fontSize:11, color:'var(--text-s)', marginBottom:5 }}>Commission Rate (%)</label>
              <div style={{ display:'flex', gap:8 }}>
                <input className="input" type="number" defaultValue={20} style={{ maxWidth:120 }} />
                <button className="btn btn-ghost btn-sm">Update</button>
              </div>
            </div>
          </div>
        </div>

        {/* Surge Rules */}
        <div className="card">
          <div className="card-title">Surge Pricing Rules</div>
          {SURGE_RULES.map((s,i)=>(
            <div key={i} className="metric-row" style={{ flexDirection:'column', alignItems:'flex-start', gap:4, padding:'10px 0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
                <div style={{ fontWeight:500, fontSize:13 }}>{s.label}</div>
                <span className="badge badge-warn">×{s.multiplier}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--text-m)' }}>{s.from} – {s.to} · {s.days}</div>
            </div>
          ))}
          <div className="divider" />
          <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center' }}>+ Add Surge Rule</button>
        </div>
      </div>

      {/* Promo Codes */}
      <div className="card mb-16">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div className="card-title" style={{ marginBottom:0 }}>Promo Codes</div>
          <button className="btn btn-primary btn-sm">+ New Promo</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Code</th><th>Type</th><th>Value</th><th>Valid</th><th>Usage</th><th>Remaining</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {PROMO_CODES.map(p=>(
                <tr key={p.code}>
                  <td><span className="badge badge-accent">{p.code}</span></td>
                  <td><span className="badge badge-muted" style={{ textTransform:'capitalize' }}>{p.type}</span></td>
                  <td style={{ color:'var(--accent)', fontWeight:500 }}>
                    {p.type==='percentage' ? `${p.value}%` : `₨${p.value}`}
                  </td>
                  <td className="muted">{p.validFrom} → {p.validTo}</td>
                  <td>
                    <div>
                      <div style={{ fontSize:12 }}>{p.timesUsed} / {p.usageLimit}</div>
                      <div className="progress-bar" style={{ width:80, marginTop:3 }}>
                        <div className="progress-fill" style={{ width:`${(p.timesUsed/p.usageLimit)*100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ color: p.usageLimit-p.timesUsed < 50 ? 'var(--warn-fg)' : 'var(--text-s)' }}>
                    {p.usageLimit - p.timesUsed}
                  </td>
                  <td>
                    {p.status === 'active'
                      ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-muted">Expired</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-ghost btn-sm">Edit</button>
                      <button className="btn btn-danger btn-sm">Disable</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role-based Access */}
      <div className="card">
        <div className="card-title">Role-Based Access Control (DCL)</div>
        <div className="grid-3">
          {[
            { role:'Admin (rf_admin)', perms:['ALL on rideflow.*'], color:'var(--accent)' },
            { role:'Rider (rf_rider)', perms:['SELECT, INSERT on Ride_Request','SELECT, INSERT on Payment','SELECT, INSERT on Rating','SELECT on Ride, Ride_History, Driver, Vehicle'], color:'var(--info-fg)' },
            { role:'Driver (rf_driver)', perms:['SELECT, UPDATE on Driver','SELECT, UPDATE on Driver_Notification','SELECT on Ride, Ride_History, Driver_Earnings','SELECT, INSERT on Payout_Request, Rating'], color:'var(--success-fg)' },
          ].map(r=>(
            <div key={r.role} style={{ background:'var(--bg-s2)', borderRadius:8, padding:14, border:'1px solid var(--border)' }}>
              <div style={{ fontWeight:600, color:r.color, marginBottom:10, fontSize:13 }}>{r.role}</div>
              {r.perms.map((p,i)=>(
                <div key={i} style={{ fontSize:11, color:'var(--text-m)', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
                  {p}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

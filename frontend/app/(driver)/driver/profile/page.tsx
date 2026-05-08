'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function DriverProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.driver.getProfile().then(setProfile).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding:40, color:'var(--text-m)' }}>Loading profile…</div>;
  if (!profile) return <div style={{ padding:40, color:'var(--danger-fg)' }}>Failed to load profile.</div>;

  const verifBadge = (v: string) => {
    const map: Record<string,string> = { verified:'success', pending:'warn', rejected:'error' };
    return <span className={`badge badge-${map[v] ?? 'muted'}`} style={{ textTransform:'capitalize' }}>{v}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">My Profile</div><div className="page-subtitle">Account details & verification status</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
            <div className="avatar gold" style={{ width:54, height:54, fontSize:22 }}>{profile.full_name?.[0]}</div>
            <div>
              <div style={{ fontSize:18, fontWeight:600 }}>{profile.full_name}</div>
              <div style={{ fontSize:13, color:'var(--text-m)' }}>{profile.email}</div>
            </div>
          </div>
          <div className="metric-row"><span className="metric-key">City</span><span className="metric-val">{profile.city ?? '—'}</span></div>
          <div className="metric-row"><span className="metric-key">Licence No.</span><span className="metric-val mono">{profile.license_number}</span></div>
          <div className="metric-row"><span className="metric-key">CNIC</span><span className="metric-val mono">{profile.cnic}</span></div>
          <div className="metric-row"><span className="metric-key">Verification</span><span className="metric-val">{verifBadge(profile.verification_status)}</span></div>
          <div className="metric-row"><span className="metric-key">Account</span><span className="metric-val">{profile.account_status}</span></div>
        </div>
        <div className="card">
          <div className="card-title">Performance</div>
          <div className="metric-row"><span className="metric-key">Avg Rating</span><span className="metric-val accent">★ {Number(profile.avg_rating ?? 0).toFixed(2)}</span></div>
          <div className="metric-row"><span className="metric-key">Trips Completed</span><span className="metric-val">{profile.trips_completed ?? 0}</span></div>
          <div className="metric-row"><span className="metric-key">Wallet Balance</span><span className="metric-val" style={{ color:'var(--success-fg)' }}>₨{Number(profile.wallet_balance ?? 0).toLocaleString()}</span></div>
          <div className="metric-row"><span className="metric-key">Availability</span><span className="metric-val" style={{ textTransform:'capitalize' }}>{profile.availability?.replace('_',' ')}</span></div>
        </div>
      </div>
    </div>
  );
}

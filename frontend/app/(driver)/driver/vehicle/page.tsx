'use client';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';

export default function DriverVehiclePage() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.driver.getProfile().then(setProfile).catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">My Vehicle</div><div className="page-subtitle">Vehicle registration & verification status</div></div>
      </div>
      <div className="card">
        {!profile ? (
          <div style={{ color:'var(--text-m)', padding:20 }}>Loading vehicle info…</div>
        ) : (
          <div style={{ padding:'8px 0' }}>
            <div className="metric-row"><span className="metric-key">Driver</span><span className="metric-val">{profile.full_name}</span></div>
            <div className="metric-row"><span className="metric-key">City</span><span className="metric-val">{profile.city ?? '—'}</span></div>
            <div className="metric-row"><span className="metric-key">Licence No.</span><span className="metric-val mono">{profile.license_number}</span></div>
            <div className="metric-row"><span className="metric-key">Verification</span>
              <span className={`badge badge-${profile.verification_status === 'verified' ? 'success' : 'warn'}`}>{profile.verification_status}</span>
            </div>
            <div style={{ marginTop:20, padding:'14px 16px', background:'rgba(196,169,109,0.07)', borderRadius:8, border:'1px solid rgba(196,169,109,0.15)', color:'var(--text-m)', fontSize:13 }}>
              Vehicle details (make, model, plate, colour) are stored in the database and managed via the admin panel.
              Contact support if you need to update your registered vehicle.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

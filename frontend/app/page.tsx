'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'rider' | 'driver'>('admin');
  const [email, setEmail] = useState('zohaib@rideflow.pk');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (role === 'admin')  router.push('/dashboard');
      if (role === 'driver') router.push('/driver/dashboard');
      if (role === 'rider')  router.push('/rider/dashboard');
    }, 900);
  };

  const roles = [
    { key: 'admin',  label: 'Admin',  icon: '🛡️', email: 'zohaib@rideflow.pk' },
    { key: 'driver', label: 'Driver', icon: '🚗', email: 'ali@example.com' },
    { key: 'rider',  label: 'Rider',  icon: '🧍', email: 'sara@example.com' },
  ] as const;

  const selectRole = (r: typeof role, emailPrefill: string) => {
    setRole(r);
    setEmail(emailPrefill);
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-logo">
          <div className="logo-icon" style={{ width:44,height:44,fontSize:20,margin:'0 auto 10px',borderRadius:12,background:'var(--accent)',color:'#0F0F0F',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }}>R</div>
          <div className="login-title">RideFlow</div>
          <div className="login-sub">Sign in to your portal</div>
        </div>

        <div className="role-pills">
          {roles.map(r => (
            <button key={r.key} className={`role-pill${role === r.key ? ' selected' : ''}`} onClick={() => selectRole(r.key, r.email)}>
              <span className="role-icon">{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@rideflow.pk" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'10px', marginTop:6, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Signing in…' : `Sign in as ${role}`}
          </button>
        </form>

        <div className="form-hint" style={{ marginTop:14 }}>
          <span style={{ color:'var(--text-m)' }}>Demo · any password · Portal: </span>
          <span style={{ color:'var(--accent)', textTransform:'capitalize' }}>{role}</span>
        </div>
      </div>
    </div>
  );
}

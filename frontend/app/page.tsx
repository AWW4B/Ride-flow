'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveSession } from '@/utils/api';

const ROLES = [
  { key: 'admin',  label: 'Admin',  icon: '🛡️' },
  { key: 'driver', label: 'Driver', icon: '🚗' },
  { key: 'rider',  label: 'Rider',  icon: '🧍' },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole]         = useState<'admin'|'rider'|'driver'>('admin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const selectRole = (r: typeof role) => {
    setRole(r);
    setEmail('');
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.login({ email, password, role });
      saveSession(token, user);
      if (role === 'admin')  router.push('/dashboard');
      if (role === 'driver') router.push('/driver/dashboard');
      if (role === 'rider')  router.push('/rider/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-logo">
          <div style={{ width:44,height:44,fontSize:20,margin:'0 auto 10px',borderRadius:12,background:'var(--accent)',color:'#0F0F0F',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }}>R</div>
          <div className="login-title">RideFlow</div>
          <div className="login-sub">Sign in to your portal</div>
        </div>

        <div className="role-pills">
          {ROLES.map(r => (
            <button key={r.key} className={`role-pill${role===r.key?' selected':''}`} onClick={() => selectRole(r.key)}>
              <span className="role-icon">{r.icon}</span>{r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} maxLength={20} />
          </div>
          {error && <div style={{ color:'var(--danger)',fontSize:12,marginBottom:8,padding:'8px 12px',background:'rgba(200,60,60,0.1)',borderRadius:6 }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width:'100%',justifyContent:'center',padding:'10px',marginTop:6,opacity:loading?0.7:1 }} disabled={loading}>
            {loading ? 'Signing in…' : `Sign in as ${role}`}
          </button>
        </form>

        {(role === 'rider' || role === 'driver') && (
          <div style={{ marginTop:16, textAlign:'center', fontSize:13, color:'var(--text-m)' }}>
            Don&apos;t have an account?{' '}
            <a href={`/signup?role=${role}`} style={{ color:'var(--accent)', fontWeight:500, textDecoration:'none' }}>
              Sign up as {role}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

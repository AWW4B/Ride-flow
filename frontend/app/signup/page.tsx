'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, saveSession } from '@/utils/api';
import { Suspense } from 'react';

function SignupForm() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const defaultRole   = (searchParams.get('role') === 'driver' ? 'driver' : 'rider') as 'rider' | 'driver';

  const [role,     setRole]     = useState<'rider' | 'driver'>(defaultRole);
  const [form,     setForm]     = useState({
    full_name: '', email: '', password: '', confirm: '',
    phone: '', license_number: '', cnic: '', city: '',
  });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      let res: any;
      if (role === 'rider') {
        res = await api.registerRider({
          full_name: form.full_name, email: form.email,
          password: form.password, phone: form.phone || undefined,
        });
      } else {
        res = await api.registerDriver({
          full_name: form.full_name, email: form.email,
          password: form.password, phone: form.phone || undefined,
          license_number: form.license_number || undefined,
          cnic: form.cnic || undefined,
          city: form.city || undefined,
        });
      }
      saveSession(res.token, res.user);
      router.push(role === 'rider' ? '/rider/dashboard' : '/driver/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in" style={{ maxWidth: 460 }}>
        <div className="login-logo">
          <div style={{ width:44,height:44,fontSize:20,margin:'0 auto 10px',borderRadius:12,background:'var(--accent)',color:'#0F0F0F',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }}>R</div>
          <div className="login-title">Create Account</div>
          <div className="login-sub">Join RideFlow today</div>
        </div>

        <div className="role-pills" style={{ marginBottom: 20 }}>
          <button className={`role-pill${role==='rider'?' selected':''}`} onClick={() => setRole('rider')}>
            <span className="role-icon">🧍</span>Rider
          </button>
          <button className={`role-pill${role==='driver'?' selected':''}`} onClick={() => setRole('driver')}>
            <span className="role-icon">🚗</span>Driver
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="input" type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Ali Raza" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone <span style={{ color:'var(--text-m)', fontWeight:400 }}>(optional)</span></label>
            <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+92 3XX XXXXXXX" />
          </div>

          {role === 'driver' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className="form-group">
                  <label className="form-label">License No.</label>
                  <input className="input" value={form.license_number} onChange={e => set('license_number', e.target.value)} placeholder="LHR-12345" />
                </div>
                <div className="form-group">
                  <label className="form-label">CNIC</label>
                  <input className="input" value={form.cnic} onChange={e => set('cnic', e.target.value)} placeholder="3520X-XXXXXXX-X" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Lahore" />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Password <span style={{ color:'var(--text-m)', fontWeight:400 }}>(6–20 characters)</span></label>
            <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required minLength={6} maxLength={20} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input className="input" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="••••••••" required minLength={6} maxLength={20} />
          </div>

          {error && <div style={{ color:'var(--danger)',fontSize:12,padding:'8px 12px',background:'rgba(200,60,60,0.1)',borderRadius:6 }}>{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width:'100%',justifyContent:'center',padding:'10px',marginTop:4,opacity:loading?0.7:1 }} disabled={loading}>
            {loading ? 'Creating account…' : `Sign up as ${role}`}
          </button>
        </form>

        <div style={{ marginTop:16, textAlign:'center', fontSize:13, color:'var(--text-m)' }}>
          Already have an account?{' '}
          <a href="/" style={{ color:'var(--accent)', fontWeight:500, textDecoration:'none' }}>Sign in</a>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

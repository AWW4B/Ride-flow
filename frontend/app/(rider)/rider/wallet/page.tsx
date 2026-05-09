'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

const METHODS = ['cash', 'card', 'wallet'];

export default function RiderWalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [amount,  setAmount]  = useState('');
  const [method,  setMethod]  = useState('card');
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');

  const loadBalance = async () => {
    try {
      const { balance: b } = await api.rider.getWallet();
      setBalance(b);
    } catch { /* ignore — may not have a wallet row yet */ }
  };

  useEffect(() => { loadBalance(); }, []);

  const topup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.rider.topupWallet({ amount: Number(amount), payment_method: method });
      setMsg(`₨${amount} top-up recorded via ${method}.`);
      setAmount('');
      await loadBalance();
    } catch (err: any) { setMsg(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Wallet & Payments</div><div className="page-subtitle">Manage your payment methods and top up balance</div></div>
      </div>
      <div style={{ maxWidth:440 }}>
        {/* Balance card */}
        <div className="card" style={{ marginBottom:12, textAlign:'center', padding:'24px 20px' }}>
          <div style={{ fontSize:12, color:'var(--text-m)', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:6 }}>Wallet Balance</div>
          <div style={{ fontSize:36, fontWeight:700, color:'var(--accent)' }}>
            {balance === null ? '—' : `₨${Number(balance).toLocaleString()}`}
          </div>
          <div style={{ fontSize:12, color:'var(--text-m)', marginTop:4 }}>Available for rides</div>
        </div>

        <div className="card">
          <div className="card-title">Add Funds</div>
          <form onSubmit={topup} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Amount (₨)</label>
              <input className="input" type="number" min="100" step="50" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="500" required />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
              </select>
            </div>
            {msg && <div style={{ fontSize:12, padding:'8px 12px', borderRadius:6, background: msg.includes('₨') ? 'rgba(100,200,100,0.1)' : 'rgba(200,60,60,0.1)', color: msg.includes('₨') ? 'var(--success-fg)' : 'var(--danger-fg)' }}>{msg}</div>}
            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={saving}>
              {saving ? 'Processing…' : 'Top Up Wallet'}
            </button>
          </form>
        </div>
        <div className="card" style={{ marginTop:12 }}>
          <div style={{ color:'var(--text-m)', fontSize:13 }}>
            💡 Payment history for all rides is recorded against each trip in the ride history. Top-ups are processed via your selected method.
          </div>
        </div>
      </div>
    </div>
  );
}

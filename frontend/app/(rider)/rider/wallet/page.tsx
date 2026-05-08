'use client';
import { useState } from 'react';
import { api } from '@/utils/api';

const METHODS = ['cash', 'card', 'wallet'];

export default function RiderWalletPage() {
  const [amount, setAmount]  = useState('');
  const [method, setMethod]  = useState('card');
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');

  const topup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.rider.topupWallet({ amount: Number(amount), payment_method: method });
      setMsg(`₨${amount} top-up recorded via ${method}.`);
      setAmount('');
    } catch (err: any) { setMsg(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Wallet & Payments</div><div className="page-subtitle">Manage your payment methods and top up balance</div></div>
      </div>
      <div style={{ maxWidth:440 }}>
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
                {METHODS.map(m => <option key={m} value={m} style={{ textTransform:'capitalize' }}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
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

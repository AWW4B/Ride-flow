'use client';
import { useState } from 'react';
import { mockPayments } from '@/utils/mockData';
import { getPaymentStatusBadge, formatCurrency, formatDateTime } from '@/utils/helpers';

const myPayments = mockPayments.filter(p => p.rider_name === 'Sara Khan');
const walletBalance = 1240.50;

export default function RiderWalletPage() {
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState('card');
  const [topUpDone, setTopUpDone] = useState(false);

  const QUICK_AMOUNTS = [200, 500, 1000, 2000];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Wallet & Payments</div>
          <div className="page-subtitle">Manage your balance, payment methods & promo codes</div>
        </div>
      </div>

      <div className="grid-2 mb-16">
        {/* Wallet Card */}
        <div className="card" style={{ background:'linear-gradient(135deg, #1E1E1E 0%, #252525 100%)', border:'1px solid rgba(196,169,109,0.25)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(196,169,109,0.06)' }} />
          <div style={{ position:'absolute', bottom:-30, left:-30, width:140, height:140, borderRadius:'50%', background:'rgba(196,169,109,0.04)' }} />
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:11, color:'var(--text-m)', fontWeight:500, letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:8 }}>Wallet Balance</div>
            <div style={{ fontSize:36, fontWeight:700, color:'var(--accent)', letterSpacing:-1, marginBottom:4 }}>₨{formatCurrency(walletBalance)}</div>
            <div style={{ fontSize:12, color:'var(--text-s)' }}>Sara Khan · Rider Wallet</div>
          </div>
        </div>

        {/* Top Up */}
        <div className="card">
          <div className="card-title">Add Money</div>
          {topUpDone ? (
            <div style={{ background:'var(--success-bg)', border:'1px solid rgba(107,142,35,0.25)', borderRadius:8, padding:'14px', textAlign:'center' }}>
              <div style={{ color:'var(--success-fg)', fontWeight:600, fontSize:15, marginBottom:4 }}>✓ ₨{topUpAmount} Added</div>
              <div style={{ fontSize:12, color:'var(--text-s)' }}>New balance: ₨{formatCurrency(walletBalance + Number(topUpAmount))}</div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop:10 }} onClick={()=>{ setTopUpDone(false); setTopUpAmount(''); }}>Add More</button>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} className={`btn btn-ghost btn-sm${topUpAmount===String(a)?' ':''}` } style={{ border: topUpAmount===String(a) ? '1px solid rgba(196,169,109,0.4)' : undefined, color: topUpAmount===String(a) ? 'var(--accent)' : undefined }}
                    onClick={()=>setTopUpAmount(String(a))}>₨{a}</button>
                ))}
              </div>
              <input className="input" type="number" placeholder="Custom amount" value={topUpAmount} onChange={e=>setTopUpAmount(e.target.value)} style={{ marginBottom:10 }} />
              <select className="input" value={topUpMethod} onChange={e=>setTopUpMethod(e.target.value)} style={{ marginBottom:12 }}>
                <option value="card">Credit / Debit Card</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="jazzcash">JazzCash</option>
              </select>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={!topUpAmount || Number(topUpAmount) < 1}
                onClick={()=>setTopUpDone(true)}>
                Add ₨{topUpAmount || '—'} via {topUpMethod}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="grid-2 mb-16">
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="card-title" style={{ marginBottom:0 }}>Payment Methods</div>
            <button className="btn btn-ghost btn-sm">+ Add Card</button>
          </div>
          {[
            { type:'wallet', label:'RideFlow Wallet', detail:`₨${formatCurrency(walletBalance)} balance`, icon:'💳', primary:true },
            { type:'card',   label:'Visa ending in 4242', detail:'Expires 08/27', icon:'💳', primary:false },
          ].map((m,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:40, height:28, background:'var(--bg-s3)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{m.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{m.label}</div>
                <div style={{ fontSize:11, color:'var(--text-m)' }}>{m.detail}</div>
              </div>
              {m.primary && <span className="badge badge-accent">Default</span>}
            </div>
          ))}
        </div>

        {/* Promo Codes */}
        <div className="card">
          <div className="card-title">Active Promo Codes</div>
          {[
            { code:'WELCOME10', type:'10% off',  expires:'Dec 31, 2026', uses:857  },
            { code:'FLAT50',    type:'₨50 flat', expires:'Jun 30, 2026', uses:413 },
          ].map(p => (
            <div key={p.code} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span className="badge badge-accent" style={{ fontSize:13, padding:'4px 10px' }}>{p.code}</span>
                <span style={{ color:'var(--success-fg)', fontWeight:600 }}>{p.type}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--text-m)' }}>
                Expires {p.expires} · {p.uses} uses remaining
              </div>
              <div className="progress-bar" style={{ marginTop:6 }}>
                <div className="progress-fill" style={{ width:`${Math.min((p.uses/1000)*100,100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="card">
        <div className="card-title">Transaction History</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Ride</th><th>Amount</th><th>Method</th><th>Promo</th><th>Discount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {myPayments.map(p => (
                <tr key={p.payment_id}>
                  <td className="mono">P-{p.payment_id}</td>
                  <td className="mono">#{p.ride_id}</td>
                  <td style={{ color:'var(--accent)', fontWeight:500 }}>₨{formatCurrency(p.amount)}</td>
                  <td><span className="badge badge-muted" style={{ textTransform:'capitalize' }}>{p.payment_method}</span></td>
                  <td>{p.promo_code ? <span className="badge badge-accent">{p.promo_code}</span> : <span style={{ color:'var(--text-m)' }}>—</span>}</td>
                  <td>{p.promo_discount > 0 ? <span style={{ color:'var(--success-fg)' }}>−₨{formatCurrency(p.promo_discount)}</span> : <span style={{ color:'var(--text-m)' }}>—</span>}</td>
                  <td>{getPaymentStatusBadge(p.payment_status)}</td>
                  <td className="muted">{formatDateTime(p.transaction_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

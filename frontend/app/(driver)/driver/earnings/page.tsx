'use client';
import { useState } from 'react';
import { mockDrivers } from '@/utils/mockData';
import { formatCurrency } from '@/utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const driver = mockDrivers[0];
const earningsHistory = [
  { week:'Apr W1', gross:1240, net:992 },
  { week:'Apr W2', gross:1860, net:1488 },
  { week:'Apr W3', gross:2100, net:1680 },
  { week:'Apr W4', gross:1530, net:1224 },
  { week:'May W1', gross:2840, net:2272 },
];

export default function EarningsPage() {
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const gross = driver.wallet_balance / 0.80;
  const commission = gross * 0.20;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Earnings</div>
          <div className="page-subtitle">Your income breakdown and payout requests</div>
        </div>
      </div>

      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-label">Wallet Balance</div>
          <div className="stat-value accent">₨{formatCurrency(driver.wallet_balance)}</div>
          <div className="stat-meta">available to withdraw</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📈</span>
          <div className="stat-label">Total Gross Earned</div>
          <div className="stat-value">₨{formatCurrency(gross)}</div>
          <div className="stat-meta">across {driver.trips_completed} trips</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏦</span>
          <div className="stat-label">Platform Commission</div>
          <div className="stat-value" style={{ color:'var(--danger-fg)', fontSize:20 }}>₨{formatCurrency(commission)}</div>
          <div className="stat-meta">20% deducted</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-label">Net Earned</div>
          <div className="stat-value accent">₨{formatCurrency(driver.wallet_balance)}</div>
          <div className="stat-meta" style={{ color:'var(--success-fg)' }}>credited to wallet</div>
        </div>
      </div>

      <div className="grid-6-4 mb-16">
        <div className="card">
          <div className="card-title">Weekly Earnings Trend</div>
          <div className="chart-container tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsHistory} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <XAxis dataKey="week" tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={v=>`₨${v}`} />
                <Tooltip contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }} />
                <Bar dataKey="gross" fill="rgba(196,169,109,0.25)" name="Gross" radius={[3,3,0,0]} />
                <Bar dataKey="net" fill="#C4A96D" name="Net" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-s)' }}>
              <span style={{ width:10,height:10,background:'rgba(196,169,109,0.25)',borderRadius:2,display:'inline-block' }} /> Gross
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-s)' }}>
              <span style={{ width:10,height:10,background:'var(--accent)',borderRadius:2,display:'inline-block' }} /> Net (after 20%)
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Request Payout</div>
          <div className="metric-row">
            <span className="metric-key">Available Balance</span>
            <span className="metric-val accent">₨{formatCurrency(driver.wallet_balance)}</span>
          </div>
          <div className="metric-row">
            <span className="metric-key">Min Payout</span>
            <span className="metric-val">₨200</span>
          </div>
          <div className="divider" />
          {submitted ? (
            <div style={{ background:'var(--success-bg)', border:'1px solid rgba(107,142,35,0.25)', borderRadius:8, padding:'12px', textAlign:'center' }}>
              <div style={{ color:'var(--success-fg)', fontWeight:600, marginBottom:4 }}>✓ Payout Requested</div>
              <div style={{ fontSize:12, color:'var(--text-s)' }}>₨{amount} — processed within 48h</div>
            </div>
          ) : (
            <>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Amount (₨)</label>
                <input className="input" type="number" min={200} max={driver.wallet_balance} placeholder="e.g. 300" value={amount} onChange={e=>setAmount(e.target.value)} />
              </div>
              <button
                className="btn btn-primary"
                style={{ width:'100%', justifyContent:'center' }}
                disabled={!amount || Number(amount) < 200 || Number(amount) > driver.wallet_balance}
                onClick={() => setSubmitted(true)}
              >
                Request Payout
              </button>
            </>
          )}
          <div className="divider" />
          <div className="card-title" style={{ marginBottom:8 }}>Payout History</div>
          <div className="metric-row">
            <div>
              <div style={{ fontSize:12, fontWeight:500 }}>₨150.00</div>
              <div style={{ fontSize:11, color:'var(--text-m)' }}>01 May 2026</div>
            </div>
            <span className="badge badge-success">Paid</span>
          </div>
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="card">
        <div className="card-title">Earnings Breakdown — Completed Trips</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ride #</th><th>Gross Fare</th><th>Commission (20%)</th><th>Net Earned</th><th>Credited</th></tr></thead>
            <tbody>
              <tr>
                <td className="mono">#1</td>
                <td>₨483.97</td>
                <td style={{ color:'var(--danger-fg)' }}>−₨96.79</td>
                <td style={{ color:'var(--success-fg)', fontWeight:500 }}>₨387.18</td>
                <td className="muted">26 Apr 2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

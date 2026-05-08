'use client';
import { useState } from 'react';
import { mockPayments, mockPayouts, mockDrivers, revenueData, paymentMethodData } from '@/utils/mockData';
import { getPaymentStatusBadge, getPayoutStatusBadge, formatCurrency, formatDateTime } from '@/utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const totalRevenue = mockPayments.filter(p=>p.payment_status==='paid').reduce((s,p)=>s+p.amount,0);
const totalRefunds = mockPayments.filter(p=>p.payment_status==='refunded').reduce((s,p)=>s+p.amount,0);
const totalCommission = totalRevenue * 0.20;

export default function PaymentsPage() {
  const [tab, setTab] = useState<'payments'|'earnings'|'payouts'>('payments');
  const [search, setSearch] = useState('');

  const filtered = mockPayments.filter(p => {
    const q = search.toLowerCase();
    return !q || p.rider_name.toLowerCase().includes(q);
  });

  const recentBar = revenueData.slice(-8);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Payments & Finance</div>
          <div className="page-subtitle">Revenue, earnings, payouts & refunds</div>
        </div>
      </div>

      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value accent">₨{formatCurrency(totalRevenue)}</div>
          <div className="stat-meta">from paid transactions</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏦</span>
          <div className="stat-label">Platform Commission</div>
          <div className="stat-value">₨{formatCurrency(totalCommission)}</div>
          <div className="stat-meta">20% of gross</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔄</span>
          <div className="stat-label">Refunds</div>
          <div className="stat-value" style={{ color:'var(--danger-fg)' }}>₨{formatCurrency(totalRefunds)}</div>
          <div className="stat-meta">{mockPayments.filter(p=>p.payment_status==='refunded').length} transactions</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏳</span>
          <div className="stat-label">Pending Payouts</div>
          <div className="stat-value" style={{ color:'var(--warn-fg)' }}>{mockPayouts.filter(p=>p.status==='pending').length}</div>
          <div className="stat-meta">awaiting approval</div>
        </div>
      </div>

      <div className="grid-2 mb-16">
        <div className="card">
          <div className="card-title">Revenue (Last 8 Days)</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentBar} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <XAxis dataKey="date" tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={v=>`₨${v}`} />
                <Tooltip contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }} formatter={(v:number)=>[`₨${v.toLocaleString()}`,'Revenue']} />
                <Bar dataKey="revenue" fill="#C4A96D" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Revenue by Payment Method</div>
          <div style={{ height:120, marginBottom:16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                  {paymentMethodData.map((e,i)=><Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }} formatter={(v:number)=>[`${v}%`,'']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {paymentMethodData.map(m=>(
            <div key={m.name} className="metric-row">
              <span className="metric-key" style={{ display:'flex',alignItems:'center',gap:6 }}>
                <span style={{ width:8,height:8,borderRadius:2,background:m.color,display:'inline-block' }}/>
                {m.name}
              </span>
              <span className="metric-val">{m.value}% of transactions</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tabs">
        <div className={`tab${tab==='payments'?' active':''}`} onClick={()=>setTab('payments')}>Payment Records</div>
        <div className={`tab${tab==='earnings'?' active':''}`} onClick={()=>setTab('earnings')}>Driver Earnings</div>
        <div className={`tab${tab==='payouts'?' active':''}`} onClick={()=>setTab('payouts')}>Payout Requests</div>
      </div>

      {tab === 'payments' && (
        <div className="card">
          <div className="filter-bar">
            <input className="input" placeholder="Search rider…" value={search} onChange={e=>setSearch(e.target.value)} />
            <button className="btn btn-ghost btn-sm">Export</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Ride</th><th>Rider</th><th>Amount</th><th>Method</th><th>Promo</th><th>Discount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {filtered.map(p=>(
                  <tr key={p.payment_id}>
                    <td className="mono">P-{p.payment_id}</td>
                    <td className="mono">#{p.ride_id}</td>
                    <td style={{ fontWeight:500 }}>{p.rider_name}</td>
                    <td style={{ color:'var(--accent)',fontWeight:500 }}>₨{formatCurrency(p.amount)}</td>
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
      )}

      {tab === 'earnings' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Driver</th><th>City</th><th>Trips Paid</th><th>Gross Earned</th><th>Commission (20%)</th><th>Net Earned</th><th>Wallet Balance</th></tr>
              </thead>
              <tbody>
                {mockDrivers.filter(d=>d.trips_completed>0).map(d=>{
                  const gross = d.wallet_balance / 0.80;
                  const commission = gross * 0.20;
                  return (
                    <tr key={d.driver_id}>
                      <td>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <div className="avatar gold">{d.full_name[0]}</div>
                          <div>
                            <div style={{ fontWeight:500,fontSize:13 }}>{d.full_name}</div>
                            <div style={{ fontSize:11,color:'var(--text-m)' }}>{d.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{d.city}</td>
                      <td style={{ fontWeight:500 }}>{d.trips_completed}</td>
                      <td style={{ color:'var(--text-p)' }}>₨{formatCurrency(gross)}</td>
                      <td style={{ color:'var(--danger-fg)' }}>−₨{formatCurrency(commission)}</td>
                      <td style={{ color:'var(--success-fg)',fontWeight:500 }}>₨{formatCurrency(d.wallet_balance)}</td>
                      <td>
                        <div>
                          <div style={{ color:'var(--accent)',fontWeight:500 }}>₨{d.wallet_balance.toFixed(2)}</div>
                          <div className="progress-bar" style={{ width:80,marginTop:3 }}>
                            <div className="progress-fill" style={{ width:`${Math.min((d.wallet_balance/6000)*100,100)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payouts' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Driver</th><th>Requested</th><th>Wallet Balance</th><th>Status</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {mockPayouts.map(p=>(
                  <tr key={p.payout_id}>
                    <td className="mono">PO-{p.payout_id}</td>
                    <td style={{ fontWeight:500 }}>{p.driver_name}</td>
                    <td style={{ color:'var(--accent)',fontWeight:500 }}>₨{formatCurrency(p.requested_amount)}</td>
                    <td style={{ color:'var(--success-fg)' }}>₨{formatCurrency(p.wallet_balance)}</td>
                    <td>{getPayoutStatusBadge(p.status)}</td>
                    <td className="muted">{formatDateTime(p.requested_at)}</td>
                    <td>
                      {p.status === 'pending' && (
                        <div style={{ display:'flex',gap:4 }}>
                          <button className="btn btn-primary btn-sm">Approve</button>
                          <button className="btn btn-danger btn-sm">Reject</button>
                        </div>
                      )}
                      {p.status !== 'pending' && <span className="badge badge-muted">Processed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

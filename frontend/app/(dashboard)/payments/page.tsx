'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#C4A96D', '#6D9AC4', '#6DC4A9', '#C46D6D'];

export default function PaymentsPage() {
  const [tab,      setTab]      = useState<'payments'|'earnings'|'payouts'>('payments');
  const [revenue,  setRevenue]  = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payouts,  setPayouts]  = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    const today   = new Date().toISOString().slice(0,10);
    const weekAgo = new Date(Date.now() - 8 * 86400000).toISOString().slice(0,10);
    Promise.all([
      api.admin.getRevenue(weekAgo, today),
      api.admin.getDriverReport(),
      api.admin.getPayouts(),
      api.admin.getPaymentReport(),
    ]).then(([rev, earn, po, pay]) => {
      setRevenue(rev); setEarnings(earn); setPayouts(po); setPayments(pay);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const paidRows     = payments.filter(p => p.payment_status === 'paid');
  const refundedRows = payments.filter(p => p.payment_status === 'refunded');
  const totalRev     = paidRows.reduce((s, p) => s + Number(p.total ?? 0), 0);
  const totalRefund  = refundedRows.reduce((s, p) => s + Number(p.total ?? 0), 0);
  const pendingPO    = payouts.filter(p => p.status === 'pending').length;
  const commission   = totalRev * 0.20;

  const methodMap: Record<string,number> = {};
  for (const p of paidRows) methodMap[p.payment_method] = (methodMap[p.payment_method] ?? 0) + Number(p.total ?? 0);
  const pieTotal = Object.values(methodMap).reduce((a, b) => a + b, 0) || 1;
  const pieData  = Object.entries(methodMap).map(([name, val], i) => ({
    name, value: Math.round((val / pieTotal) * 100), color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const revenueBar = revenue.slice(-8).map(r => ({
    date: r.earning_date?.slice(5), revenue: Number(r.gross_revenue ?? 0),
  }));

  const approvePayout = async (id: number) => {
    setActionId(id);
    try { await api.admin.approvePayout(id); setPayouts(prev => prev.map(p => p.payout_id === id ? { ...p, status:'paid' } : p)); }
    catch (e: any) { alert(e.message); } finally { setActionId(null); }
  };

  const payBadge = (s: string) => {
    const m: Record<string,string> = { paid:'success', pending:'warn', refunded:'error' };
    return <span className={`badge badge-${m[s] ?? 'muted'}`} style={{ textTransform:'capitalize', fontSize:11 }}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Payments & Finance</div><div className="page-subtitle">Revenue, earnings, payouts & refunds</div></div>
      </div>
      <div className="stat-grid mb-16">
        <div className="stat-card"><span className="stat-icon">💰</span><div className="stat-label">Total Revenue</div><div className="stat-value accent">₨{totalRev.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div className="stat-meta">from paid transactions</div></div>
        <div className="stat-card"><span className="stat-icon">🏦</span><div className="stat-label">Platform Commission</div><div className="stat-value">₨{commission.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div className="stat-meta">20% of gross</div></div>
        <div className="stat-card"><span className="stat-icon">🔄</span><div className="stat-label">Refunds</div><div className="stat-value" style={{color:'var(--danger-fg)'}}>₨{totalRefund.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div className="stat-meta">{refundedRows.reduce((s,p)=>s+Number(p.count??0),0)} transactions</div></div>
        <div className="stat-card"><span className="stat-icon">⏳</span><div className="stat-label">Pending Payouts</div><div className="stat-value" style={{color:'var(--warn-fg)'}}>{pendingPO}</div><div className="stat-meta">awaiting approval</div></div>
      </div>
      <div className="grid-2 mb-16">
        <div className="card">
          <div className="card-title">Revenue — Last 8 Days</div>
          <div className="chart-container">
            {revenueBar.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueBar} margin={{top:4,right:4,left:-20,bottom:0}}>
                  <XAxis dataKey="date" tick={{fill:'#4A4845',fontSize:10}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:'#4A4845',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={(v:any)=>`₨${Number(v??0)/1000}k`}/>
                  <Tooltip contentStyle={{background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.07)',borderRadius:6,color:'#F0EDE6',fontSize:12}} formatter={(v:any)=>[`₨${Number(v??0).toLocaleString()}`,'Revenue']}/>
                  <Bar dataKey="revenue" fill="#C4A96D" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-state" style={{height:'100%'}}><div className="empty-icon">📊</div><p>No revenue data yet</p></div>}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Revenue by Payment Method</div>
          {pieData.length > 0 ? (
            <>
              <div style={{height:120,marginBottom:16}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                    {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.07)',borderRadius:6,color:'#F0EDE6',fontSize:12}} formatter={(v:any)=>[`${v}%`,'']}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {pieData.map(m=>(
                <div key={m.name} className="metric-row">
                  <span className="metric-key" style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:8,height:8,borderRadius:2,background:m.color,display:'inline-block'}}/>{m.name}</span>
                  <span className="metric-val">{m.value}% of transactions</span>
                </div>
              ))}
            </>
          ) : <div className="empty-state"><div className="empty-icon">💳</div><p>No payment method data yet</p></div>}
        </div>
      </div>
      <div className="tabs">
        <div className={`tab${tab==='payments'?' active':''}`} onClick={()=>setTab('payments')}>Payment Records</div>
        <div className={`tab${tab==='earnings'?' active':''}`} onClick={()=>setTab('earnings')}>Driver Earnings</div>
        <div className={`tab${tab==='payouts'?' active':''}`} onClick={()=>setTab('payouts')}>Payout Requests</div>
      </div>
      {tab==='payments' && (
        <div className="card">
          {loading ? <div style={{textAlign:'center',padding:40,color:'var(--text-m)'}}>Loading…</div>
          : payments.length===0 ? <div className="empty-state"><div className="empty-icon">💳</div><p>No payment records yet</p></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Method</th><th>Status</th><th>Count</th><th>Total</th></tr></thead>
              <tbody>{payments.map((p,i)=>(
                <tr key={i}><td><span className="badge badge-muted" style={{textTransform:'capitalize'}}>{p.payment_method}</span></td><td>{payBadge(p.payment_status)}</td><td className="muted">{p.count}</td><td style={{color:'var(--accent)',fontWeight:500}}>₨{Number(p.total??0).toLocaleString()}</td></tr>
              ))}</tbody>
            </table></div>}
        </div>
      )}
      {tab==='earnings' && (
        <div className="card">
          {loading ? <div style={{textAlign:'center',padding:40,color:'var(--text-m)'}}>Loading…</div>
          : earnings.length===0 ? <div className="empty-state"><div className="empty-icon">📈</div><p>No driver earnings yet</p></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>Driver</th><th>City</th><th>Trips</th><th>Gross</th><th>Commission</th><th>Net</th></tr></thead>
              <tbody>{earnings.map((d:any)=>(
                <tr key={d.driver_id}><td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="avatar gold">{d.full_name?.[0]??'?'}</div><div style={{fontWeight:500,fontSize:13}}>{d.full_name}</div></div></td><td className="muted">{d.city??'—'}</td><td style={{fontWeight:500}}>{d.trips_paid??0}</td><td>₨{Number(d.total_gross??0).toLocaleString()}</td><td style={{color:'var(--danger-fg)'}}>−₨{Number(d.total_commission??0).toLocaleString()}</td><td style={{color:'var(--success-fg)',fontWeight:500}}>₨{Number(d.total_net??0).toLocaleString()}</td></tr>
              ))}</tbody>
            </table></div>}
        </div>
      )}
      {tab==='payouts' && (
        <div className="card">
          {loading ? <div style={{textAlign:'center',padding:40,color:'var(--text-m)'}}>Loading…</div>
          : payouts.length===0 ? <div className="empty-state"><div className="empty-icon">⏳</div><p>No payout requests yet</p></div>
          : <div className="table-wrap"><table>
              <thead><tr><th>#</th><th>Driver</th><th>Amount</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>{payouts.map(p=>(
                <tr key={p.payout_id}><td className="mono">PO-{p.payout_id}</td><td style={{fontWeight:500}}>{p.driver_name}</td><td style={{color:'var(--accent)',fontWeight:500}}>₨{Number(p.amount??0).toLocaleString()}</td><td>{payBadge(p.status)}</td><td className="muted" style={{fontSize:11}}>{p.requested_at?.slice(0,16)}</td><td>{p.status==='pending'?<button className="btn btn-primary btn-sm" disabled={actionId===p.payout_id} onClick={()=>approvePayout(p.payout_id)}>{actionId===p.payout_id?'…':'Approve'}</button>:<span className="badge badge-muted">Processed</span>}</td></tr>
              ))}</tbody>
            </table></div>}
        </div>
      )}
    </div>
  );
}

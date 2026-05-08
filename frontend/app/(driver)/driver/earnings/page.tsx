'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DriverEarningsPage() {
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.driver.getEarnings().then(setEarnings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalGross   = earnings.reduce((s, e) => s + Number(e.gross_amount  ?? 0), 0);
  const totalNet     = earnings.reduce((s, e) => s + Number(e.net_amount    ?? 0), 0);
  const totalComm    = earnings.reduce((s, e) => s + Number(e.commission_amount ?? 0), 0);
  const chartData    = earnings.slice(0, 10).reverse().map((e, i) => ({
    day: `T${i+1}`, net: Number(e.net_amount ?? 0),
  }));

  const requestPayout = async () => {
    try { await api.driver.requestPayout(); alert('Payout request submitted!'); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Earnings</div><div className="page-subtitle">Detailed breakdown of your income</div></div>
        <button className="btn btn-primary" onClick={requestPayout}>Request Payout</button>
      </div>

      <div className="stat-grid mb-16">
        <div className="stat-card">
          <span className="stat-icon">💵</span>
          <div className="stat-label">Gross Earned</div>
          <div className="stat-value">₨{totalGross.toLocaleString()}</div>
          <div className="stat-meta">before commission</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏦</span>
          <div className="stat-label">Commission (20%)</div>
          <div className="stat-value" style={{ color:'var(--danger-fg)' }}>−₨{totalComm.toLocaleString()}</div>
          <div className="stat-meta">platform fee</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-label">Net Earned</div>
          <div className="stat-value accent">₨{totalNet.toLocaleString()}</div>
          <div className="stat-meta">credited to wallet</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏁</span>
          <div className="stat-label">Paid Trips</div>
          <div className="stat-value">{earnings.length}</div>
          <div className="stat-meta">with earnings recorded</div>
        </div>
      </div>

      <div className="card mb-16">
        <div className="card-title">Net Earnings — Last 10 Trips</div>
        <div className="chart-container">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <XAxis dataKey="day" tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill:'#4A4845', fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={(v:any) => `₨${v}`} />
                <Tooltip contentStyle={{ background:'#1E1E1E', border:'1px solid rgba(255,255,255,0.07)', borderRadius:6, color:'#F0EDE6', fontSize:12 }}
                  formatter={(v:any) => [`₨${Number(v??0).toLocaleString()}`, 'Net']} />
                <Bar dataKey="net" fill="#C4A96D" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height:'100%' }}><div className="empty-icon">📊</div><p>No earnings data yet</p></div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading earnings…</div>
          ) : earnings.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💸</div><p>No earnings yet. Complete trips to earn!</p></div>
          ) : (
            <table>
              <thead><tr><th>Trip</th><th>Gross</th><th>Commission</th><th>Net</th><th>Date</th></tr></thead>
              <tbody>
                {earnings.map(e => (
                  <tr key={e.earning_id}>
                    <td className="mono">#{e.earning_id}</td>
                    <td>₨{Number(e.gross_amount ?? 0).toLocaleString()}</td>
                    <td style={{ color:'var(--danger-fg)' }}>−₨{Number(e.commission_amount ?? 0).toLocaleString()}</td>
                    <td style={{ color:'var(--success-fg)', fontWeight:500 }}>₨{Number(e.net_amount ?? 0).toLocaleString()}</td>
                    <td className="muted" style={{ fontSize:11 }}>{e.credited_at?.slice(0,16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

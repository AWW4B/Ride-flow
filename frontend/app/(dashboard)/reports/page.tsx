'use client';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

function downloadCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows    = data.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','));
  const csv     = [headers.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

export default function ReportsPage() {
  const today   = new Date().toISOString().slice(0,10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10);

  const [dateFrom,  setDateFrom]  = useState(weekAgo);
  const [dateTo,    setDateTo]    = useState(today);
  const [revenue,   setRevenue]   = useState<any[]>([]);
  const [drivers,   setDrivers]   = useState<any[]>([]);
  const [payments,  setPayments]  = useState<any[]>([]);
  const [refunds,   setRefunds]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [rev, drv, pay, ref] = await Promise.all([
        api.admin.getRevenue(dateFrom, dateTo),
        api.admin.getDriverReport(),
        api.admin.getPaymentReport(),
        api.admin.getRefunds(),
      ]);
      setRevenue(rev);
      setDrivers(drv);
      setPayments(pay);
      setRefunds(ref);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const ReportCard = ({ title, sub, data, filename, cols }: { title:string; sub:string; data:any[]; filename:string; cols:{key:string; label:string; fmt?:(v:any)=>string}[] }) => (
    <div className="card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div className="card-title" style={{ marginBottom:4 }}>{title}</div>
          <div style={{ fontSize:12, color:'var(--text-m)' }}>{sub}</div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => downloadCSV(data, filename)} disabled={data.length === 0}>
          ⬇ CSV
        </button>
      </div>
      <div className="table-wrap">
        {loading ? (
          <div style={{ textAlign:'center', padding:24, color:'var(--text-m)' }}>Loading…</div>
        ) : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📄</div><p>No data for this period</p></div>
        ) : (
          <table>
            <thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {cols.map(c => (
                    <td key={c.key} className="muted" style={{ fontVariantNumeric:'tabular-nums' }}>
                      {c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const fmt = (v: any) => `₨${Number(v ?? 0).toLocaleString()}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Financial Reports</div>
          <div className="page-subtitle">Platform revenue and driver settlement summaries</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input type="date" className="btn btn-ghost" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize:12 }} />
          <input type="date" className="btn btn-ghost" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ fontSize:12 }} />
        </div>
      </div>

      <div className="grid-2">
        <ReportCard
          title="Daily Revenue Summary"
          sub="Gross, commission, and platform net per day"
          data={revenue}
          filename="daily_revenue"
          cols={[
            { key:'earning_date', label:'Date' },
            { key:'trips_count',  label:'Rides' },
            { key:'gross_revenue',label:'Gross',      fmt },
            { key:'net_revenue',  label:'Net (80%)',  fmt },
          ]}
        />
        <ReportCard
          title="Driver Settlements"
          sub="Per-driver gross earnings and net payable"
          data={drivers}
          filename="driver_settlements"
          cols={[
            { key:'full_name',       label:'Driver' },
            { key:'trips_paid',      label:'Trips' },
            { key:'total_gross',     label:'Gross',      fmt },
            { key:'total_commission',label:'Commission',  fmt },
            { key:'total_net',       label:'Net',         fmt },
          ]}
        />
        <ReportCard
          title="Payment Method Breakdown"
          sub="Volume by payment method and status"
          data={payments}
          filename="payment_methods"
          cols={[
            { key:'payment_method', label:'Method' },
            { key:'payment_status', label:'Status' },
            { key:'count',          label:'Count' },
            { key:'total',          label:'Volume', fmt },
          ]}
        />
        <ReportCard
          title="Refunds & Disputes"
          sub="Reversed transactions by date"
          data={refunds}
          filename="refunds"
          cols={[
            { key:'date',          label:'Date' },
            { key:'payment_method',label:'Method' },
            { key:'count',         label:'Count' },
            { key:'total_refunded',label:'Total Refunded', fmt },
          ]}
        />
      </div>
    </div>
  );
}

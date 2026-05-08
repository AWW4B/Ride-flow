'use client';
import { useState } from 'react';
import { mockPayments, mockRides, mockDrivers } from '@/utils/mockData';
import { formatCurrency, formatDate } from '@/utils/helpers';

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  // Mock Report Data (in real app, this would be fetched from /api/v1/admin/reports/...)
  const revenueReport = [
    { date: '2026-05-01', rides: 42, gross: 42000, commission: 8400, net: 33600 },
    { date: '2026-05-02', rides: 38, gross: 38500, commission: 7700, net: 30800 },
    { date: '2026-05-03', rides: 55, gross: 61000, commission: 12200, net: 48800 },
  ];

  const driverReport = mockDrivers.map(d => ({
    name: d.full_name,
    trips: d.trips_completed,
    gross: d.trips_completed * 450,
    commission: (d.trips_completed * 450) * 0.2,
    net: (d.trips_completed * 450) * 0.8
  }));

  const paymentReport = [
    { method: 'Cash', count: 120, total: 45000 },
    { method: 'Wallet', count: 85, total: 32000 },
    { method: 'Card', count: 45, total: 28000 },
  ];

  const refundReport = mockPayments.filter(p => p.payment_status === 'refunded').map(p => ({
    id: p.payment_id,
    ride: p.ride_id,
    amount: p.amount,
    date: p.transaction_date
  }));

  const downloadCSV = (data: any[], filename: string) => {
    setDownloading(filename);
    setTimeout(() => {
      const csvRows = [];
      const headers = Object.keys(data[0]);
      csvRows.push(headers.join(','));

      for (const row of data) {
        const values = headers.map(header => {
          const val = row[header];
          return `"${val}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `${filename}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloading(null);
    }, 500);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Financial Reports</div>
          <div className="page-subtitle">Platform revenue and driver settlement summaries</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
           <input type="date" className="btn btn-ghost" defaultValue="2026-05-01" style={{ fontSize:12 }} />
           <input type="date" className="btn btn-ghost" defaultValue="2026-05-08" style={{ fontSize:12 }} />
        </div>
      </div>

      <div className="grid-2">
        {/* Revenue Report */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div className="card-title" style={{ marginBottom:4 }}>Daily Revenue Summary</div>
              <div style={{ fontSize:12, color:'var(--text-m)' }}>Daily totals for gross, commission, and payouts</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => downloadCSV(revenueReport, 'daily_revenue')}>
              {downloading === 'daily_revenue' ? '...' : 'Download CSV'}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Rides</th><th>Gross</th><th>Comm (20%)</th><th>Net</th></tr>
              </thead>
              <tbody>
                {revenueReport.map(r => (
                  <tr key={r.date}>
                    <td className="mono">{r.date}</td>
                    <td>{r.rides}</td>
                    <td className="metric-val">₨{r.gross.toLocaleString()}</td>
                    <td className="muted">₨{r.commission.toLocaleString()}</td>
                    <td className="accent">₨{r.net.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Driver Earnings */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div className="card-title" style={{ marginBottom:4 }}>Driver Settlements</div>
              <div style={{ fontSize:12, color:'var(--text-m)' }}>Trips and net earnings per driver</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => downloadCSV(driverReport, 'driver_settlements')}>
              {downloading === 'driver_settlements' ? '...' : 'Download CSV'}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Driver</th><th>Trips</th><th>Gross</th><th>Net Earning</th></tr>
              </thead>
              <tbody>
                {driverReport.slice(0,4).map(r => (
                  <tr key={r.name}>
                    <td style={{ fontWeight:500 }}>{r.name}</td>
                    <td>{r.trips}</td>
                    <td className="muted">₨{r.gross.toLocaleString()}</td>
                    <td className="accent">₨{r.net.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div className="card-title" style={{ marginBottom:4 }}>Payment Method Breakdown</div>
              <div style={{ fontSize:12, color:'var(--text-m)' }}>Usage distribution across payment types</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => downloadCSV(paymentReport, 'payment_methods')}>
              {downloading === 'payment_methods' ? '...' : 'Download CSV'}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Method</th><th>Count</th><th>Total Vol</th></tr>
              </thead>
              <tbody>
                {paymentReport.map(r => (
                  <tr key={r.method}>
                    <td>{r.method}</td>
                    <td>{r.count}</td>
                    <td className="metric-val accent">₨{r.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refunds */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div className="card-title" style={{ marginBottom:4 }}>Refunds & Disputes</div>
              <div style={{ fontSize:12, color:'var(--text-m)' }}>List of reversed transactions</div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => downloadCSV(refundReport, 'refunds')}>
              {downloading === 'refunds' ? '...' : 'Download CSV'}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Ride #</th><th>Amount</th><th>Reason</th><th>Date</th></tr>
              </thead>
              <tbody>
                {refundReport.map(r => (
                  <tr key={r.id}>
                    <td className="mono">#{r.ride}</td>
                    <td className="metric-val accent">₨{r.amount.toLocaleString()}</td>
                    <td className="muted">Rider Cancellation</td>
                    <td className="muted">{formatDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

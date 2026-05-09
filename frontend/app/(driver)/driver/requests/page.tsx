'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/utils/api';

export default function RequestsPage() {
  const [requests,  setRequests]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [actionId,  setActionId]  = useState<number | null>(null);
  const [accepted,  setAccepted]  = useState<any | null>(null);
  const [error,     setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.driver.getPending();
      setRequests(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Poll every 15 seconds for new requests
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const handleAccept = async (req: any) => {
    setActionId(req.request_id);
    try {
      const result = await api.driver.acceptRequest(req.request_id);
      setAccepted({ ...req, ride_id: result.ride_id });
      setRequests(prev => prev.filter(r => r.request_id !== req.request_id));
    } catch (e: any) {
      alert(e.message ?? 'Failed to accept ride');
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (req: any) => {
    setActionId(req.request_id);
    // Remove from local list — no server action needed for pending requests
    setRequests(prev => prev.filter(r => r.request_id !== req.request_id));
    setActionId(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ride Requests</div>
          <div className="page-subtitle">Incoming requests near your location</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span className="badge badge-success" style={{ padding:'6px 12px' }}>
            <span className="live-dot" />{requests.length} Pending
          </span>
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom:16, color:'var(--danger)', background:'rgba(200,60,60,0.1)', padding:'10px 14px', borderRadius:8, fontSize:13 }}>{error}</div>
      )}

      {accepted && (
        <div className="mb-16" style={{ background:'var(--success-bg)', border:'1px solid rgba(107,142,35,0.25)', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--success-fg)' }}>✓ Accepted request from {accepted.rider_name} — head to pickup</div>
          <div style={{ fontSize:12, color:'var(--text-s)', marginTop:4 }}>
            {accepted.pickup_address} → {accepted.dropoff_address}
          </div>
        </div>
      )}

      {loading && requests.length === 0 ? (
        <div className="card">
          <div style={{ textAlign:'center', padding:40, color:'var(--text-m)' }}>Loading ride requests…</div>
        </div>
      ) : requests.length === 0 && !accepted ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🕐</div>
            <p>No pending requests right now.</p>
            <p style={{ marginTop:4 }}>Make sure you are set to <strong style={{ color:'var(--accent)' }}>Online</strong> in your dashboard.</p>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {requests.map(req => (
            <div key={req.request_id} className="card" style={{ border:'1px solid rgba(196,169,109,0.2)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text-m)', marginBottom:3 }}>
                    {req.requested_at ? new Date(req.requested_at).toLocaleTimeString() : ''}
                  </div>
                  <div style={{ fontSize:16, fontWeight:650 }}>Request #{req.request_id}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span className="badge badge-muted" style={{ textTransform:'capitalize' }}>
                    {req.vehicle_type_requested}
                  </span>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-m)', fontWeight:500, marginBottom:4, letterSpacing:'0.5px', textTransform:'uppercase' }}>Rider</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div className="avatar">{req.rider_name?.[0] ?? '?'}</div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{req.rider_name ?? '—'}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-m)', fontWeight:500, marginBottom:4, letterSpacing:'0.5px', textTransform:'uppercase' }}>Type</div>
                  <span className="badge badge-muted" style={{ textTransform:'capitalize' }}>{req.vehicle_type_requested}</span>
                </div>
              </div>

              {/* Route */}
              <div style={{ background:'var(--bg-s2)', borderRadius:8, padding:'10px 12px', marginBottom:14, border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:3 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--success-fg)' }} />
                    <div style={{ width:1, height:20, background:'var(--border)', margin:'3px 0' }} />
                    <div style={{ width:8, height:8, borderRadius:2, background:'var(--danger-fg)' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, marginBottom:8 }}>{req.pickup_address}</div>
                    <div style={{ fontSize:12, color:'var(--text-s)' }}>{req.dropoff_address}</div>
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex:1, justifyContent:'center', padding:'10px', opacity: actionId === req.request_id ? 0.7 : 1 }}
                  disabled={actionId === req.request_id}
                  onClick={() => handleAccept(req)}
                >
                  {actionId === req.request_id ? '…' : '✓ Accept Ride'}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ flex:1, justifyContent:'center', padding:'10px' }}
                  disabled={actionId === req.request_id}
                  onClick={() => handleDecline(req)}
                >
                  ✕ Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

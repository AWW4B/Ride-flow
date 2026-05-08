'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href:'/driver/dashboard', label:'Dashboard',  icon:'◈' },
  { href:'/driver/requests',  label:'Requests',   icon:'📨' },
  { href:'/driver/trips',     label:'My Trips',   icon:'⟳' },
  { href:'/driver/earnings',  label:'Earnings',   icon:'◆' },
  { href:'/driver/vehicle',   label:'My Vehicle', icon:'🚗' },
  { href:'/driver/profile',   label:'Profile',    icon:'◉' },
];

export default function DriverSidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon" style={{ background:'var(--bg-s3)', color:'var(--accent)', border:'1px solid rgba(196,169,109,0.3)' }}>🚗</div>
          <div>
            <div className="logo-text">RideFlow</div>
            <div className="logo-sub">Driver Portal</div>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Driver Menu</div>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} className={`nav-item${path === n.href ? ' active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar" style={{ background:'var(--bg-s3)', color:'var(--accent)', border:'1px solid rgba(196,169,109,0.25)' }}>AR</div>
          <div>
            <div className="user-name">Ali Raza</div>
            <div className="user-role">Driver · Islamabad</div>
          </div>
        </div>
        <Link href="/" className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center', marginTop:8 }}>Sign Out</Link>
      </div>
    </aside>
  );
}

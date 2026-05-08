'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href:'/rider/dashboard', label:'Home',        icon:'◈' },
  { href:'/rider/book',      label:'Book a Ride', icon:'➕' },
  { href:'/rider/trips',     label:'My Trips',    icon:'⟳' },
  { href:'/rider/wallet',    label:'Wallet',      icon:'◆' },
  { href:'/rider/profile',   label:'Profile',     icon:'◉' },
];

export default function RiderSidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon" style={{ background:'var(--bg-s3)', color:'var(--info-fg)', border:'1px solid rgba(106,159,212,0.3)' }}>🧍</div>
          <div>
            <div className="logo-text">RideFlow</div>
            <div className="logo-sub">Rider Portal</div>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Rider Menu</div>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} className={`nav-item${path === n.href ? ' active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar" style={{ background:'var(--info-bg)', color:'var(--info-fg)', border:'1px solid rgba(106,159,212,0.25)' }}>SK</div>
          <div>
            <div className="user-name">Sara Khan</div>
            <div className="user-role">Rider Account</div>
          </div>
        </div>
        <Link href="/" className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center', marginTop:8 }}>Sign Out</Link>
      </div>
    </aside>
  );
}

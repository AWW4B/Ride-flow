'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { loadUser, clearSession } from '@/utils/api';

const NAV = [
  { href:'/driver/dashboard', label:'Dashboard',  icon:'◈' },
  { href:'/driver/requests',  label:'Requests',   icon:'📨' },
  { href:'/driver/trips',     label:'My Trips',   icon:'⟳' },
  { href:'/driver/earnings',  label:'Earnings',   icon:'◆' },
  { href:'/driver/vehicle',   label:'My Vehicle', icon:'🚗' },
  { href:'/driver/profile',   label:'Profile',    icon:'◉' },
];

export default function DriverSidebar() {
  const path   = usePathname();
  const router = useRouter();
  const user   = loadUser();

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'D';

  const handleSignOut = () => {
    clearSession();
    router.push('/');
  };

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
          <div className="user-avatar" style={{ background:'var(--bg-s3)', color:'var(--accent)', border:'1px solid rgba(196,169,109,0.25)' }}>{initials}</div>
          <div>
            <div className="user-name">{user?.full_name ?? 'Driver'}</div>
            <div className="user-role">Driver Account</div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width:'100%', justifyContent:'center', marginTop:8 }}
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

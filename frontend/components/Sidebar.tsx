'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { loadUser, clearSession } from '@/utils/api';

const NAV = [
  { href:'/dashboard',  label:'Dashboard',  icon:'◈' },
  { href:'/rides',      label:'Rides',       icon:'⟳' },
  { href:'/drivers',    label:'Drivers',     icon:'◎' },
  { href:'/riders',     label:'Riders',      icon:'◉' },
  { href:'/payments',   label:'Payments',    icon:'◆' },
  { href:'/ratings',    label:'Ratings',     icon:'★' },
  { href:'/promos',     label:'Promos',      icon:'🏷️' },
  { href:'/reports',    label:'Reports',     icon:'📊' },
  { href:'/settings',   label:'Settings',    icon:'⚙' },
];

export default function Sidebar() {
  const path   = usePathname();
  const router = useRouter();
  const user   = loadUser();

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  const handleSignOut = () => {
    clearSession();
    router.push('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">R</div>
          <div>
            <div className="logo-text">RideFlow</div>
            <div className="logo-sub">Admin Console</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} className={`nav-item${path === n.href ? ' active' : ''}`}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.full_name ?? 'Admin'}</div>
            <div className="user-role">Super Admin</div>
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

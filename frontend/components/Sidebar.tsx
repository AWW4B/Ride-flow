'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  const path = usePathname();
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
          <div className="user-avatar">RZ</div>
          <div>
            <div className="user-name">Rana Zohaib</div>
            <div className="user-role">Super Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

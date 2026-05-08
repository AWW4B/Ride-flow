import DriverSidebar from '@/components/DriverSidebar';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <DriverSidebar />
      <main className="main-content fade-in">{children}</main>
    </div>
  );
}

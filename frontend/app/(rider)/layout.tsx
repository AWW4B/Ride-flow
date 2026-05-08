import RiderSidebar from '@/components/RiderSidebar';

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <RiderSidebar />
      <main className="main-content fade-in">{children}</main>
    </div>
  );
}

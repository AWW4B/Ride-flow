import type { RideStatus } from '@/types';

export function formatCurrency(n: number): string {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PK', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

const STATUS_MAP: Record<RideStatus, [string, string]> = {
  accepted:    ['Accepted',    'badge-info'],
  enroute:     ['En Route',   'badge-warn'],
  in_progress: ['In Progress','badge-accent'],
  completed:   ['Completed',  'badge-success'],
  cancelled:   ['Cancelled',  'badge-danger'],
};

export function getRideStatusBadge(status: RideStatus) {
  const [label, cls] = STATUS_MAP[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function getVerificationBadge(status: string) {
  const map: Record<string, [string, string]> = {
    verified: ['Verified', 'badge-success'],
    pending:  ['Pending',  'badge-warn'],
    rejected: ['Rejected', 'badge-danger'],
  };
  const [label, cls] = map[status] ?? ['Unknown','badge-muted'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function getAvailabilityBadge(status: string) {
  const map: Record<string, [string, string]> = {
    online:  ['Online',  'badge-success'],
    offline: ['Offline', 'badge-muted'],
    on_trip: ['On Trip', 'badge-accent'],
  };
  const [label, cls] = map[status] ?? ['Unknown','badge-muted'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function getAccountStatusBadge(status: string) {
  const map: Record<string, [string, string]> = {
    active:    ['Active',    'badge-success'],
    suspended: ['Suspended', 'badge-warn'],
    banned:    ['Banned',    'badge-danger'],
  };
  const [label, cls] = map[status] ?? ['Unknown','badge-muted'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function getPaymentStatusBadge(status: string) {
  const map: Record<string, [string, string]> = {
    paid:     ['Paid',     'badge-success'],
    pending:  ['Pending',  'badge-warn'],
    failed:   ['Failed',   'badge-danger'],
    refunded: ['Refunded', 'badge-info'],
  };
  const [label, cls] = map[status] ?? ['Unknown','badge-muted'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function getPayoutStatusBadge(status: string) {
  const map: Record<string, [string, string]> = {
    pending:  ['Pending',  'badge-warn'],
    approved: ['Approved', 'badge-accent'],
    paid:     ['Paid',     'badge-success'],
    rejected: ['Rejected', 'badge-danger'],
  };
  const [label, cls] = map[status] ?? ['Unknown','badge-muted'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function renderStars(score: number) {
  return (
    <span className="stars">
      {'★'.repeat(score)}{'☆'.repeat(5 - score)}
    </span>
  );
}

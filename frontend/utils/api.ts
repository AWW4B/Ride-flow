/**
 * frontend/utils/api.ts
 * Central API client. All fetch calls go through here.
 * Set NEXT_PUBLIC_API_URL in your .env.local or Vercel dashboard.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rf_token");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    // Pydantic validation errors: detail is an array of {loc, msg, type}
    let message: string;
    if (Array.isArray(err.detail)) {
      message = err.detail.map((e: any) => {
        const field = Array.isArray(e.loc) ? e.loc.filter((l: any) => l !== 'body').join('.') : '';
        return field ? `${field}: ${e.msg}` : e.msg;
      }).join('; ');
    } else {
      message = err.detail ?? err.message ?? "Request failed";
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────
  login: (body: { email: string; password: string; role: string }) =>
    apiFetch<{ token: string; user: UserInfo }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  registerRider: (body: object) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  registerDriver: (body: object) =>
    apiFetch("/auth/driver/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ── Admin ─────────────────────────────────────────────────────
  admin: {
    getUsers: (role?: string, status?: string) => {
      const q = new URLSearchParams();
      if (role) q.set("role", role);
      if (status) q.set("status", status);
      return apiFetch<any[]>(`/admin/users?${q}`);
    },
    updateUserStatus: (id: number, status: string) =>
      apiFetch(`/admin/users/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    getDrivers: () => apiFetch<any[]>("/admin/drivers"),
    verifyDriver: (id: number, status: string) =>
      apiFetch(`/admin/drivers/${id}/verify`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    verifyVehicle: (id: number, status: string) =>
      apiFetch(`/admin/vehicles/${id}/verify`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    getRides: (params?: { status?: string; date_from?: string; date_to?: string }) => {
      const q = new URLSearchParams(params as any);
      return apiFetch<any[]>(`/admin/rides?${q}`);
    },
    getRevenue: (date_from: string, date_to: string) =>
      apiFetch<any[]>(`/admin/reports/revenue?date_from=${date_from}&date_to=${date_to}`),
    getDriverReport: () => apiFetch<any[]>("/admin/reports/drivers"),
    getPaymentReport: () => apiFetch<any[]>("/admin/reports/payments"),
    getRefunds: () => apiFetch<any[]>("/admin/reports/refunds"),
    getLeaderboard: () => apiFetch<any[]>("/admin/leaderboard"),
    getFlaggedRiders: () => apiFetch<any[]>("/admin/flagged-riders"),
    getPayouts: () => apiFetch<any[]>("/admin/payouts"),
    approvePayout: (id: number) =>
      apiFetch(`/admin/payouts/${id}/approve`, { method: "PUT" }),
    // Promo Codes
    getPromos: () => apiFetch<any[]>("/admin/promos"),
    createPromo: (body: object) =>
      apiFetch("/admin/promos", { method: "POST", body: JSON.stringify(body) }),
    updatePromo: (id: number, body: object) =>
      apiFetch(`/admin/promos/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    deletePromo: (id: number) =>
      apiFetch(`/admin/promos/${id}`, { method: "DELETE" }),
  },

  // ── Rider ─────────────────────────────────────────────────────
  rider: {
    requestRide: (body: object) =>
      apiFetch("/rider/rides/request", { method: "POST", body: JSON.stringify(body) }),
    getHistory: () => apiFetch<any[]>("/rider/rides/history"),
    getRide: (id: number) => apiFetch<any>(`/rider/rides/${id}`),
    cancelRide: (id: number) =>
      apiFetch(`/rider/rides/${id}/cancel`, { method: "POST" }),
    rateDriver: (id: number, body: object) =>
      apiFetch(`/rider/rides/${id}/rate`, { method: "POST", body: JSON.stringify(body) }),
    getWallet: () => apiFetch<{ balance: number }>("/rider/wallet"),
    topupWallet: (body: object) =>
      apiFetch("/rider/wallet/topup", { method: "POST", body: JSON.stringify(body) }),
    checkPromo: (code: string) =>
      apiFetch<any>(`/rider/promos/check?code=${code}`),
    cancelRequest: (requestId: number) =>
      apiFetch(`/rider/requests/${requestId}/cancel`, { method: 'POST' }),
  },

  // ── Driver ────────────────────────────────────────────────────
  driver: {
    getPending: () => apiFetch<any[]>("/driver/rides/pending"),
    acceptRequest: (requestId: number) =>
      apiFetch(`/driver/requests/${requestId}/accept`, { method: 'POST' }),
    acceptRide: (id: number) =>
      apiFetch(`/driver/rides/${id}/accept`, { method: "PUT" }),
    rejectRide: (id: number) =>
      apiFetch(`/driver/rides/${id}/reject`, { method: "PUT" }),
    updateStatus: (id: number, status: string) =>
      apiFetch(`/driver/rides/${id}/status?status=${status}`, { method: "PUT" }),
    getEarnings: () => apiFetch<any[]>("/driver/earnings"),
    getWallet: () => apiFetch<{ balance: number }>("/driver/wallet"),
    requestPayout: () => apiFetch("/driver/payouts/request", { method: "POST" }),
    setAvailability: (status: string) =>
      apiFetch("/driver/availability", { method: "PUT", body: JSON.stringify({ status }) }),
    getProfile: () => apiFetch<any>("/driver/profile"),
    updateLocation: (lat: number, lng: number) =>
      apiFetch("/driver/location", { method: "PUT", body: JSON.stringify({ lat, lng }) }),
    registerVehicle: (body: object) =>
      apiFetch("/driver/vehicles", { method: "POST", body: JSON.stringify(body) }),
    getVehicles: () => apiFetch<any[]>("/driver/vehicles"),
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface UserInfo {
  user_id: number;
  entity_id?: number;
  driver_id?: number;
  full_name: string;
  email: string;
  role: "admin" | "rider" | "driver";
}

export function saveSession(token: string, user: UserInfo) {
  localStorage.setItem("rf_token", token);
  localStorage.setItem("rf_user", JSON.stringify(user));
}

export function loadUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem("rf_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("rf_token");
  localStorage.removeItem("rf_user");
}

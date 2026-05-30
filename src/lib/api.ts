// Central API client for SentinelIQ Laravel backend
// Base URL: http://localhost:8000/api

const BASE = 'http://127.0.0.1:8000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  // 30-second timeout — allows enough time for SMTP email sending to complete
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options?.headers instanceof Headers
      ? Object.fromEntries((options.headers as Headers).entries())
      : (options?.headers as Record<string, string> | undefined) ?? {}),
  };

  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('sentineliq-user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u && u.name) {
          headers['X-Audit-Actor'] = u.name;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      headers,
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Request timed out. Check backend connection.');
    throw err;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  name: string;
  color: string;
  desc: string;
  permissions: Record<string, Record<string, boolean>>;
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  actor: string;
  action: string;
  module: string;
  ip_address: string;
  created_at: string;
  updated_at: string;
}

export interface SystemHealth {
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  redis_status: string;
  worker_queue: number;
}

export interface Camera {
  id: number;
  name: string;
  url?: string;
  embed_url?: string;
  stream_type: 'youtube' | 'earthcam' | 'rtsp' | 'custom';
  location?: string;
  zone?: string;
  status: 'active' | 'inactive' | 'offline';
  ptz: boolean;
  crowd_count: number;
  assigned_person?: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  camera_id?: number;
  camera_name?: string;
  title: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'resolved' | 'closed';
  confidence: number;
  description?: string;
  created_at: string;
  updated_at: string;
  age: string;
}

export interface Stat {
  crowd_count: number;
  created_at: string;
}

export interface DashboardData {
  cameras: { total: number; active: number; offline: number };
  alerts: { total: number; critical: number; high: number; medium: number };
  people: { total: number };
  incidents: { today: number; yesterday: number };
  recent_alerts: { id: number; title: string; type: string; severity: string; status: string; camera_name: string; age: string }[];
  camera_statuses: Camera[];
  crowd_trend: { minute: string; avg_crowd: number }[];
}

export interface Paginated<T> {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => request<DashboardData>('/dashboard'),
};

// ─── Cameras ─────────────────────────────────────────────────────────────────

export const camerasApi = {
  list: () => request<{ data: Camera[] }>('/cameras'),
  get: (id: number) => request<{ data: Camera }>(`/cameras/${id}`),
  create: (data: Partial<Camera>) => request<{ data: Camera }>('/cameras', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Camera>) => request<{ data: Camera }>(`/cameras/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/cameras/${id}`, { method: 'DELETE' }),
  getStats: (id: number) => request<{ camera: Camera; stats: Stat[] }>(`/cameras/${id}/stats`),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────

export const alertsApi = {
  list: (params?: { camera_id?: number; severity?: string; status?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return request<Paginated<Alert>>(`/alerts${qs ? '?' + qs : ''}`);
  },
  get: (id: number) => request<{ data: Alert }>(`/alerts/${id}`),
  create: (data: Partial<Alert>) => request<{ data: Alert }>('/alerts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Alert>) => request<{ data: Alert }>(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/alerts/${id}`, { method: 'DELETE' }),
};

// ─── Users & Roles ───────────────────────────────────────────────────────────

export const usersApi = {
  list: () => request<User[]>('/users'),
  get: (id: number) => request<User>(`/users/${id}`),
  create: (data: Partial<User>) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<User>) => request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' }),
};

export const rolesApi = {
  list: () => request<Role[]>('/roles'),
  get: (id: number) => request<Role>(`/roles/${id}`),
  create: (data: Partial<Role>) => request<Role>('/roles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Role>) => request<Role>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/roles/${id}`, { method: 'DELETE' }),
};

export const auditLogsApi = {
  list: () => request<AuditLog[]>('/audit-logs'),
};

export const settingsApi = {
  list: () => request<Record<string, any>>('/settings'),
  update: (settings: Record<string, any>) => request<Record<string, any>>('/settings', { method: 'POST', body: JSON.stringify({ settings }) }),
};

export const systemApi = {
  health: () => request<SystemHealth>('/system/health'),
};

// ─── Stats ───────────────────────────────────────────────────────────────────

export const statsApi = {
  list: (camera_id?: number) => {
    const qs = camera_id ? `?camera_id=${camera_id}` : '';
    return request<Paginated<Stat>>(`/stats${qs}`);
  },
  create: (data: { camera_id: number; crowd_count: number }) =>
    request<{ data: Stat }>('/stats', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Landing Stats & Demo Booking ────────────────────────────────────────────

export interface LandingStats {
  cameras_monitored: number;
  uptime_sla: number;
  avg_alert_response: number;
  countries: number;
}

export const landingStatsApi = {
  get: () => request<LandingStats>('/landing-stats'),
};

export const demoApi = {
  book: (data: { name: string; email: string; company?: string }) =>
    request<{ success: boolean; message: string; data: any }>('/demo-bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const pricingApi = {
  requestPlan: (data: { name: string; email: string; company?: string; plan: string; need: string }) =>
    request<{ success: boolean; message: string; data: any }>('/pricing-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const authApi = {
  login: (data: Record<string, any>) => request<User>('/login', { method: 'POST', body: JSON.stringify(data) }),
};

// TanStack Query hooks with real-time polling
// All data comes from the Laravel API at localhost:8000

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi, camerasApi, dashboardApi, statsApi, landingStatsApi, demoApi, pricingApi, usersApi, rolesApi, auditLogsApi, settingsApi, systemApi, type Alert, type Camera, type DashboardData, type User, type Role, type AuditLog } from './api';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const QK = {
  dashboard: ['dashboard'] as const,
  cameras: ['cameras'] as const,
  camera: (id: number) => ['cameras', id] as const,
  cameraStats: (id: number) => ['cameras', id, 'stats'] as const,
  alerts: ['alerts'] as const,
  stats: ['stats'] as const,
  users: ['users'] as const,
  roles: ['roles'] as const,
  auditLogs: ['audit-logs'] as const,
  settings: ['settings'] as const,
  systemHealth: ['system-health'] as const,
};

// ─── Dashboard (polls every 5 seconds — drives live crowd counts) ─────────────

export function useDashboard() {
  return useQuery({
    queryKey: QK.dashboard,
    queryFn: dashboardApi.get,
    refetchInterval: 3_000,        // every 3 seconds for real-time responsiveness
    staleTime: 0,
    retry: 2,
    retryDelay: 1_000,
  });
}

// ─── Cameras (polls every 10 seconds) ────────────────────────────────────────

export function useCameras() {
  return useQuery({
    queryKey: QK.cameras,
    queryFn: () => camerasApi.list().then(r => r.data),
    refetchInterval: 3_000,        // poll every 3 seconds for real-time crowd analytics
    staleTime: 0,
  });
}

export function useCamera(id: number) {
  return useQuery({
    queryKey: QK.camera(id),
    queryFn: () => camerasApi.get(id).then(r => r.data),
    refetchInterval: 5_000,
    enabled: !!id,
  });
}

export function useCameraStats(id: number) {
  return useQuery({
    queryKey: QK.cameraStats(id),
    queryFn: () => camerasApi.getStats(id),
    refetchInterval: 5_000,
    enabled: !!id,
  });
}

export function useCreateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Camera>) => camerasApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.cameras });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

export function useUpdateCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Camera> }) => camerasApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.cameras });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

export function useDeleteCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => camerasApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.cameras });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

// ─── Alerts (polls every 5 seconds) ──────────────────────────────────────────

export function useAlerts(params?: { camera_id?: number; severity?: string; status?: string }) {
  return useQuery({
    queryKey: [...QK.alerts, params],
    queryFn: () => alertsApi.list(params).then(r => r.data),
    refetchInterval: 3_000,        // poll every 3 seconds for real-time incidents
    staleTime: 0,
  });
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Alert['status'] }) =>
      alertsApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: QK.dashboard });
      await qc.cancelQueries({ queryKey: QK.alerts });

      // Snapshot the previous query states
      const prevDashboard = qc.getQueryData<DashboardData>(QK.dashboard);
      const prevAlerts = qc.getQueryData<Alert[]>(QK.alerts);

      // Optimistically update the dashboard cache
      if (prevDashboard) {
        const targetAlert = prevDashboard.recent_alerts.find(a => a.id === id);
        const oldStatus = targetAlert ? (targetAlert.status || 'open') : 'open';

        // Adjust active counts in KPIs if status is changing from/to 'open'
        const updatedAlertsCount = { ...prevDashboard.alerts };
        if (oldStatus === 'open' && status !== 'open' && targetAlert) {
          updatedAlertsCount.total = Math.max(0, updatedAlertsCount.total - 1);
          const sev = targetAlert.severity;
          if (sev === 'critical') updatedAlertsCount.critical = Math.max(0, updatedAlertsCount.critical - 1);
          else if (sev === 'high') updatedAlertsCount.high = Math.max(0, updatedAlertsCount.high - 1);
          else if (sev === 'medium') updatedAlertsCount.medium = Math.max(0, updatedAlertsCount.medium - 1);
        } else if (oldStatus !== 'open' && status === 'open' && targetAlert) {
          updatedAlertsCount.total = updatedAlertsCount.total + 1;
          const sev = targetAlert.severity;
          if (sev === 'critical') updatedAlertsCount.critical = updatedAlertsCount.critical + 1;
          else if (sev === 'high') updatedAlertsCount.high = updatedAlertsCount.high + 1;
          else if (sev === 'medium') updatedAlertsCount.medium = updatedAlertsCount.medium + 1;
        }

        qc.setQueryData<DashboardData>(QK.dashboard, {
          ...prevDashboard,
          alerts: updatedAlertsCount,
          recent_alerts: prevDashboard.recent_alerts.map(a =>
            a.id === id ? { ...a, status } : a
          ),
        });
      }

      // Optimistically update the alerts list cache (for Alerts Center)
      if (prevAlerts) {
        qc.setQueryData<Alert[]>(
          QK.alerts,
          prevAlerts.map(a => (a.id === id ? { ...a, status } : a))
        );
      }

      return { prevDashboard, prevAlerts };
    },
    onError: (err, variables, context) => {
      // Rollback on failure
      if (context?.prevDashboard) {
        qc.setQueryData(QK.dashboard, context.prevDashboard);
      }
      if (context?.prevAlerts) {
        qc.setQueryData(QK.alerts, context.prevAlerts);
      }
    },
    onSettled: () => {
      // Invalidate to sync backend truth
      qc.invalidateQueries({ queryKey: QK.alerts });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Alert>) => alertsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.alerts });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => alertsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.alerts });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

// ─── Users (polls every 5 seconds) ───────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: QK.users,
    queryFn: () => usersApi.list(),
    refetchInterval: 3_000, // real-time user management
    staleTime: 0,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User>) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.users });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => usersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.users });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.users });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({
    queryKey: QK.roles,
    queryFn: () => rolesApi.list(),
    refetchInterval: 3_000,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Role>) => rolesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.roles });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Role> }) => rolesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.roles });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rolesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.roles });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

// ─── Dynamic Permissions ─────────────────────────────────────────────────────

/**
 * useUserPermissions — fetches roles from the backend and resolves the
 * logged-in user's permission map dynamically.
 *
 * Returns:
 *   hasPermission(module, action): boolean  — true if user can perform action
 *   isLoading: boolean                       — true while roles are being fetched
 *   userRole: string | null                  — the user's role name
 */
export function useUserPermissions() {
  const { data: roles = [], isLoading } = useRoles();

  const userRole = typeof window !== 'undefined' ? localStorage.getItem('sentineliq-role') : null;

  const hasPermission = (module: string, action: string): boolean => {
    if (!userRole) return false;
    if (userRole === 'Super Admin') return true; // Super Admin bypasses all checks

    const roleObj = roles.find(r => r.name === userRole);
    if (!roleObj || !roleObj.permissions) return false;

    return roleObj.permissions[module]?.[action] === true;
  };

  const canViewModule = (module: string): boolean => hasPermission(module, 'View');

  return { hasPermission, canViewModule, isLoading, userRole };
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export function useAuditLogs() {
  return useQuery({
    queryKey: QK.auditLogs,
    queryFn: () => auditLogsApi.list(),
    refetchInterval: 5_000,
  });
}

// ─── Settings & System Health ──────────────────────────────────────────────────

export function useSettings() {
  return useQuery({
    queryKey: QK.settings,
    queryFn: () => settingsApi.list(),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, any>) => settingsApi.update(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.settings });
      qc.invalidateQueries({ queryKey: QK.auditLogs });
    },
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: QK.systemHealth,
    queryFn: () => systemApi.health(),
    refetchInterval: 3_000,
  });
}

// ─── Landing Stats & Demo Booking Hooks ──────────────────────────────────────

export const QK_landing = {
  stats: ['landing-stats'] as const,
};

export function useLandingStats() {
  return useQuery({
    queryKey: QK_landing.stats,
    queryFn: landingStatsApi.get,
    refetchInterval: 15_000, // refresh stats every 15 seconds for real-time counts
    staleTime: 5_000,
  });
}

export function useBookDemo() {
  return useMutation({
    mutationFn: demoApi.book,
  });
}

export function useRequestPlan() {
  return useMutation({
    mutationFn: pricingApi.requestPlan,
  });
}

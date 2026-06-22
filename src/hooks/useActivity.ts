/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Activity logs and notification hooks — React Query layer.
 *
 * Phase 2 — Audit Log Integrity:
 *   useAddLogMutation / useAddLog have been removed.
 *   All audit log creation is now handled by backend services.
 *
 * NAMING CONVENTION:
 *   useActivityLogsQuery()            → read logs
 *   useNotificationsQuery()           → read notifications
 *   useAddNotificationMutation()      → create a notification
 *   useMarkAllNotificationsReadMutation()
 *   useClearNotificationMutation()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SystemNotification } from '../types';
import { activityService, notificationService } from '../services/activity.service';
import { useAuthStore } from '../stores/auth.store';
import { useSyncStore } from '../stores/sync.store';
import { queryKeys } from '../lib/queryKeys';

// ---------------------------------------------------------------------------
// Activity Logs (read-only)
// ---------------------------------------------------------------------------

export function useActivityLogsQuery() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.activity.logs(),
    queryFn: activityService.getLogs,
    enabled: !!accessToken,
  });
}

/** Backward-compat alias */
export const useActivityLogs = useActivityLogsQuery;

// useAddLogMutation / useAddLog have been intentionally removed.
// All audit logs are created by backend services (Phase 2 remediation).

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function useNotificationsQuery() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: notificationService.getAll,
    enabled: !!accessToken,
  });
}

/** Backward-compat alias */
export const useNotifications = useNotificationsQuery;

export function useAddNotificationMutation() {
  const qc = useQueryClient();
  const setNotifCenterOpen = useSyncStore((s) => s.setNotifCenterOpen);

  return useMutation({
    mutationFn: ({
      title,
      message,
      type,
    }: Pick<SystemNotification, 'title' | 'message' | 'type'>) =>
      notificationService.add(title, message, type),
    onSuccess: (notif) => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      if (notif.type === 'warning') setNotifCenterOpen(true);
    },
  });
}

/** Backward-compat alias */
export const useAddNotification = useAddNotificationMutation;

export function useMarkAllNotificationsReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
  });
}

/** Backward-compat alias */
export const useMarkAllNotificationsRead = useMarkAllNotificationsReadMutation;

export function useClearNotificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationService.remove,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all() }),
  });
}

/** Backward-compat alias */
export const useClearNotification = useClearNotificationMutation;

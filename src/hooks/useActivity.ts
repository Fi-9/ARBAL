/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Activity logs and notification hooks — React Query layer.
 *
 * NAMING CONVENTION:
 *   useActivityLogsQuery()            → read logs
 *   useAddLogMutation()               → append a log entry
 *   useNotificationsQuery()           → read notifications
 *   useAddNotificationMutation()      → create a notification
 *   useMarkAllNotificationsReadMutation()
 *   useClearNotificationMutation()
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityLog, RoleType, SystemNotification } from '../types';
import { activityService, notificationService } from '../services/activity.service';
import { useAuthStore } from '../stores/auth.store';
import { useSyncStore } from '../stores/sync.store';
import { queryKeys } from '../lib/queryKeys';

// ---------------------------------------------------------------------------
// Activity Logs
// ---------------------------------------------------------------------------

export function useActivityLogsQuery() {
  return useQuery({
    queryKey: queryKeys.activity.logs(),
    queryFn: activityService.getLogs,
  });
}

/** Backward-compat alias */
export const useActivityLogs = useActivityLogsQuery;

export function useAddLogMutation() {
  const qc = useQueryClient();
  const { actorName, selectedRole } = useAuthStore();

  return useMutation({
    mutationFn: ({
      action,
      category,
      details,
    }: {
      action: string;
      category: ActivityLog['category'];
      details: string;
      actorName?: string;
      actorRole?: RoleType;
    }) =>
      activityService.addLog(action, category, details, actorName, selectedRole),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.activity.logs() }),
  });
}

/** Backward-compat alias */
export const useAddLog = useAddLogMutation;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: notificationService.getAll,
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

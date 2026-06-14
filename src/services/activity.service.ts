/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Activity Log & Notification Service — real API adapter with response mapping.
 * Maps backend ActivityLog rows to the frontend ActivityLog type.
 */

import { ActivityLog, RoleType, SystemNotification } from '../types';
import { api } from '../lib/api';

// ---------------------------------------------------------------------------
// Backend → Frontend mappers
// ---------------------------------------------------------------------------

/** Map DB category enum → frontend label */
const DB_CATEGORY_MAP: Record<string, ActivityLog['category']> = {
  SISWA: 'Siswa',
  DOKUMEN: 'Dokumen',
  HAK_AKSES: 'Hak Akses',
  AUTENTIKASI: 'Hak Akses', // closest frontend category
};

function mapBackendLog(raw: any): ActivityLog {
  const createdAt = typeof raw.createdAt === 'string'
    ? raw.createdAt
    : new Date(raw.createdAt).toISOString();
  // Format: "YYYY-MM-DD HH:mm"
  const timestamp = createdAt.replace('T', ' ').substring(0, 16);

  return {
    id: raw.id,
    timestamp,
    actorName: raw.User?.name ?? raw.actorName ?? 'Sistem',
    actorRole: 'Super Admin' as RoleType, // Role is not stored in ActivityLog; default for display
    action: raw.action,
    category: DB_CATEGORY_MAP[raw.category] ?? 'Siswa',
    details: raw.details,
  };
}

// ---------------------------------------------------------------------------
// Activity Log Service
// ---------------------------------------------------------------------------

export const activityService = {
  /** GET /api/v1/logs */
  getLogs: async (): Promise<ActivityLog[]> => {
    const { data } = await api.get('/logs?limit=100');
    const rows = data.data ?? data;
    if (!Array.isArray(rows)) return [];
    return rows.map(mapBackendLog);
  },

  /** POST /api/v1/logs */
  addLog: async (
    action: string,
    category: ActivityLog['category'],
    details: string,
    actorName: string,
    actorRole: RoleType,
  ): Promise<ActivityLog> => {
    const { data } = await api.post<any>('/logs', {
      action,
      category: mapCategoryToDb(category),
      details,
      entityType: category,
      entityId: undefined,
      actorUserId: 'SYSTEM',
    });
    return mapBackendLog(data);
  },
};

// ---------------------------------------------------------------------------
// Notification Service
// ---------------------------------------------------------------------------

/** Notifications are frontend-only for now. Stored in an in-memory array
 *  since the backend doesn't have a dedicated notifications table yet.
 *  Phase 2+: move to a real SSE/WebSocket-backed endpoint.
 */

let _notifications: SystemNotification[] = [];

export const notificationService = {
  getAll: async (): Promise<SystemNotification[]> => {
    return [..._notifications];
  },

  add: async (
    title: string,
    message: string,
    type: SystemNotification['type'],
  ): Promise<SystemNotification> => {
    const notif: SystemNotification = {
      id: `NOTIF_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      title,
      message,
      type,
      read: false,
    };
    _notifications = [notif, ..._notifications];
    return notif;
  },

  markAllRead: async (): Promise<void> => {
    _notifications = _notifications.map((n) => ({ ...n, read: true }));
  },

  remove: async (id: string): Promise<void> => {
    _notifications = _notifications.filter((n) => n.id !== id);
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapCategoryToDb(category: ActivityLog['category']): string {
  const map: Record<string, string> = {
    Siswa: 'SISWA',
    Dokumen: 'DOKUMEN',
    'Hak Akses': 'HAK_AKSES',
    'Google Drive': 'DOKUMEN',
    'Google Sheets': 'DOKUMEN',
  };
  return map[category] ?? 'SISWA';
}

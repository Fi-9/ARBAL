/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Activity Log & Notification Service — real API adapter with response mapping.
 * Maps backend ActivityLog rows to the frontend ActivityLog type.
 *
 * Phase 2 — Audit Log Integrity:
 *   addLog() has been removed. All audit log entries are now created
 *   exclusively by backend services (auth, students, documents, users, backup).
 *   The frontend only reads logs via GET /api/v1/logs.
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
  BACKUP: 'Siswa', // displayed under general category
};

/** Map DB RoleName enum → frontend RoleType label */
const DB_ROLE_MAP: Record<string, RoleType> = {
  SUPER_ADMIN: 'Super Admin',
  GURU: 'Guru / Wali Kelas',
};

function mapBackendLog(raw: any): ActivityLog {
  let timestamp = '';
  try {
    const d = new Date(raw.createdAt);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;
    } else {
      timestamp = String(raw.createdAt).replace('T', ' ').substring(0, 16);
    }
  } catch {
    timestamp = String(raw.createdAt).replace('T', ' ').substring(0, 16);
  }

  // Resolve actor role: backend returns raw.actorRole (from User.Role.name)
  // or raw.User?.Role?.name — map DB enum to frontend label
  const rawRole = raw.actorRole ?? raw.User?.Role?.name ?? '';
  const actorRole: RoleType = DB_ROLE_MAP[rawRole] ?? ((rawRole as RoleType) || 'Guru / Wali Kelas');

  return {
    id: raw.id,
    timestamp,
    actorName: raw.User?.name ?? raw.actorName ?? 'Sistem',
    actorRole,
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

  // addLog() has been intentionally removed — see Phase 2 audit remediation.
  // All audit logs are created by backend services, never from the client.
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
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;

    const notif: SystemNotification = {
      id: `NOTIF_${Date.now()}`,
      timestamp,
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

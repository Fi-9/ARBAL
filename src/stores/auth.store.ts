/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth Store — JWT session + backward-compat RoleType.
 */

import { create } from 'zustand';
import { RoleType } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

type DbRole = 'SUPER_ADMIN' | 'GURU' | 'KEPALA_SEKOLAH' | 'TATA_USAHA';

const DB_TO_FRONTEND: Record<DbRole, RoleType> = {
  SUPER_ADMIN: 'Super Admin',
  GURU: 'Guru / Wali Kelas',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  TATA_USAHA: 'Tata Usaha',
};

const FRONTEND_TO_DB: Record<RoleType, DbRole> = {
  'Super Admin': 'SUPER_ADMIN',
  'Guru / Wali Kelas': 'GURU',
  'Kepala Sekolah': 'KEPALA_SEKOLAH',
  'Tata Usaha': 'TATA_USAHA',
};

/** Generic actor labels per frontend role — used only as a last-resort fallback */
const ACTOR_NAMES: Record<RoleType, string> = {
  'Super Admin': 'Super Admin',
  'Guru / Wali Kelas': 'Guru / Wali Kelas',
  'Kepala Sekolah': 'Kepala Sekolah',
  'Tata Usaha': 'Tata Usaha',
};

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, string[]> = {
  'Super Admin': [
    'student.read', 'student.write', 'student.delete',
    'document.read', 'document.upload', 'document.delete', 'document.verify',
    'role.manage', 'user.manage',
    'logs.view', 'dashboard.view', 'report.export', 'document.download',
    'backup.manage',
  ],
  'Guru / Wali Kelas': [
    'student.read',
    'document.read',
    'document.download',
    'dashboard.view',
  ],
  'Kepala Sekolah': [
    'student.read',
    'document.read',
    'document.download',
    'dashboard.view',
    'logs.view',
  ],
  'Tata Usaha': [
    'student.read', 'student.write', 'student.delete',
    'document.read', 'document.upload', 'document.delete', 'document.verify',
    'dashboard.view', 'document.download',
  ],
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface AuthState {
  // Real JWT session
  accessToken: string | null;
  user: UserProfile | null;
  isLoading: boolean;

  // ── Backward-compat derived API ──────────────────────────────────────────
  selectedRole: RoleType;
  actorName: string;
  permissions: string[];
  rolePermissionsMap: Record<string, string[]> | null;

  // ── Session actions ────────────────────────────────----------------──────
  setSession: (token: string, user: UserProfile) => void;
  setAccessToken: (token: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;

  // ── Simulated role switch for SUPER_ADMIN ────────────────────────────────
  setSimulatedRole: (role: RoleType) => void;
  setRolePermissionsMap: (map: Record<string, string[]>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Real session
  accessToken: null,
  user: null,
  isLoading: true,

  // Backward-compat defaults
  selectedRole: 'Super Admin',
  actorName: ACTOR_NAMES['Super Admin'],
  permissions: DEFAULT_ROLE_PERMISSIONS['Super Admin'],
  rolePermissionsMap: null,

  setSession: (token, user) => {
    const frontendRole = DB_TO_FRONTEND[user.role as DbRole] ?? user.role as RoleType;
    set({
      accessToken: token,
      user,
      selectedRole: frontendRole,
      actorName: user.name || ACTOR_NAMES[frontendRole],
      permissions: user.permissions || [],
      isLoading: false,
    });
  },

  setAccessToken: (token) => set({ accessToken: token }),

  clearSession: () =>
    set({
      accessToken: null,
      user: null,
      selectedRole: 'Super Admin',
      actorName: ACTOR_NAMES['Super Admin'],
      permissions: DEFAULT_ROLE_PERMISSIONS['Super Admin'],
      isLoading: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  // SUPER_ADMIN can temporarily simulate a different role for testing
  setSimulatedRole: (role) => {
    const dbRole = mapRoleToDb(role);
    const simulatedPermissions = useAuthStore.getState().rolePermissionsMap?.[dbRole]
      ?? DEFAULT_ROLE_PERMISSIONS[role]
      ?? [];
    set({
      selectedRole: role,
      actorName: ACTOR_NAMES[role],
      permissions: simulatedPermissions,
    });
  },

  setRolePermissionsMap: (map) => {
    const activeRole = useAuthStore.getState().selectedRole;
    const dbRole = mapRoleToDb(activeRole);
    const updatedPermissions = map[dbRole] ?? DEFAULT_ROLE_PERMISSIONS[activeRole] ?? [];
    set({
      rolePermissionsMap: map,
      permissions: updatedPermissions,
    });
  },
}));

export const getActorName = (role: RoleType): string => ACTOR_NAMES[role];

/** DEPRECATED: Use authStore.user.name instead. Kept for backward-compat only, returns generic label. */
export const getActiveUserLabel = (role: RoleType): string => {
  return ACTOR_NAMES[role] || role;
};

export const mapRoleToDb = (role: RoleType): string => FRONTEND_TO_DB[role] ?? role;

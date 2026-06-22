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
}

type DbRole = 'SUPER_ADMIN' | 'GURU';

const DB_TO_FRONTEND: Record<DbRole, RoleType> = {
  SUPER_ADMIN: 'Super Admin',
  GURU: 'Guru / Wali Kelas',
};

const FRONTEND_TO_DB: Record<RoleType, DbRole> = {
  'Super Admin': 'SUPER_ADMIN',
  'Guru / Wali Kelas': 'GURU',
};

/** Generic actor labels per frontend role — used only as a last-resort fallback */
const ACTOR_NAMES: Record<RoleType, string> = {
  'Super Admin': 'Super Admin',
  'Guru / Wali Kelas': 'Guru / Wali Kelas',
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

  // ── Session actions ────────────────────────────────----------------──────
  setSession: (token: string, user: UserProfile) => void;
  setAccessToken: (token: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;

  // ── Simulated role switch for SUPER_ADMIN ────────────────────────────────
  setSimulatedRole: (role: RoleType) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Real session
  accessToken: null,
  user: null,
  isLoading: true,

  // Backward-compat defaults
  selectedRole: 'Super Admin',
  actorName: ACTOR_NAMES['Super Admin'],

  setSession: (token, user) => {
    const frontendRole = DB_TO_FRONTEND[user.role as DbRole] ?? user.role as RoleType;
    set({
      accessToken: token,
      user,
      selectedRole: frontendRole,
      actorName: user.name || ACTOR_NAMES[frontendRole],
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
      isLoading: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  // SUPER_ADMIN can temporarily simulate a different role for testing
  setSimulatedRole: (role) =>
    set({
      selectedRole: role,
      actorName: ACTOR_NAMES[role],
    }),
}));

export const getActorName = (role: RoleType): string => ACTOR_NAMES[role];

/** DEPRECATED: Use authStore.user.name instead. Kept for backward-compat only, returns generic label. */
export const getActiveUserLabel = (role: RoleType): string => {
  return ACTOR_NAMES[role] || role;
};

export const mapRoleToDb = (role: RoleType): string => FRONTEND_TO_DB[role] ?? role;

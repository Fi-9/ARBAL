/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth Store — JWT session + backward-compat RoleType.
 *
 * STATE BOUNDARY:
 *   - accessToken + user profile → ZuStand (memory-only; refresh cookie is httpOnly)
 *   - selectedRole | actorName   → derived for backward compatibility
 *
 * ROLE MAPPING (DB → frontend):
 *   SUPER_ADMIN → 'Super Admin'
 *   STAFF_TU    → 'Staff TU'
 *   GURU        → 'Guru / Wali Kelas'
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

type DbRole = 'SUPER_ADMIN' | 'STAFF_TU' | 'GURU';

const DB_TO_FRONTEND: Record<DbRole, RoleType> = {
  SUPER_ADMIN: 'Super Admin',
  STAFF_TU: 'Staff TU',
  GURU: 'Guru / Wali Kelas',
};

const FRONTEND_TO_DB: Record<RoleType, DbRole> = {
  'Super Admin': 'SUPER_ADMIN',
  'Staff TU': 'STAFF_TU',
  'Guru / Wali Kelas': 'GURU',
};

/** Default actor names per frontend role — used as fallback when user.name is missing */
const ACTOR_NAMES: Record<RoleType, string> = {
  'Super Admin': 'Drs. H. Mulyono',
  'Staff TU': 'Rina Herawati, S.Pd',
  'Guru / Wali Kelas': 'Asep Saepudin, M.Pd',
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
  // These are cached in Zustand so existing code (App.tsx, views, hooks)
  // continues to work without changes. Updated whenever setSession is called.
  selectedRole: RoleType;
  actorName: string;

  // ── Session actions ──────────────────────────────────────────────────────
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

  // Backward-compat defaults (will be overwritten by setSession)
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

// ---------------------------------------------------------------------------
// Helpers (unchanged API)
// ---------------------------------------------------------------------------

export const getActorName = (role: RoleType): string => ACTOR_NAMES[role];

export const getActiveUserLabel = (role: RoleType): string => {
  if (role === 'Super Admin') return 'Drs. H. Mulyono (Kepala Sekolah)';
  if (role === 'Staff TU') return 'Rina Herawati, S.Pd (Waka. Kesiswaan/TU)';
  return 'Asep Saepudin, M.Pd (Wali Kelas XII RPL)';
};

export const mapRoleToDb = (role: RoleType): string => FRONTEND_TO_DB[role] ?? role;

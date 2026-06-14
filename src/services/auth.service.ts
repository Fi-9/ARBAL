/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth Service — real API adapter for authentication.
 *
 * All refresh-token cookie management is handled by the backend.
 * This service only manages the access token returned in response bodies.
 */

import { api } from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Auth Service
// ---------------------------------------------------------------------------

export const authService = {
  /** POST /api/v1/auth/login */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },

  /** POST /api/v1/auth/refresh — try to renew session from httpOnly cookie */
  refresh: async (): Promise<LoginResponse | null> => {
    try {
      const { data } = await api.post<LoginResponse>('/auth/refresh');
      return data;
    } catch {
      return null;
    }
  },

  /** POST /api/v1/auth/logout */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the request fails, we should still clear local state
    }
  },
};

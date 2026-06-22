/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Axios API Client — single instance for all HTTP calls.
 *
 * Request interceptor: attaches Bearer token from in-memory store.
 * Response interceptor: auto-refreshes on 401 via httpOnly cookie.
 *
 * USAGE:
 *   import { api } from '@/lib/api';
 *   const students = await api.get<Student[]>('/students');
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';

// ---------------------------------------------------------------------------
// Client instance
// ---------------------------------------------------------------------------

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  withCredentials: true, // Send httpOnly refresh-token cookie on every request
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach access token from memory (Phase 2)
// ---------------------------------------------------------------------------

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — 401 handling + auto token refresh (Phase 2)
// ---------------------------------------------------------------------------

let _isRefreshing = false;
let _refreshQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (token: string) => {
  _refreshQueue.forEach((cb) => cb.resolve(token));
  _refreshQueue = [];
};

const rejectQueue = (error: any) => {
  _refreshQueue.forEach((cb) => cb.reject(error));
  _refreshQueue = [];
};

/** Endpoints that should NEVER trigger the auto-refresh flow — would cause infinite loop */
const NO_REFRESH_PATHS = ['/auth/refresh', '/auth/login', '/auth/logout'];

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Don't try to refresh on auth endpoints — that would cause infinite recursion
    const url = originalRequest?.url ?? '';
    const isAuthEndpoint = NO_REFRESH_PATHS.some((path) => url.includes(path));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _refreshQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }
      originalRequest._retry = true;
      _isRefreshing = true;
      try {
        const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
        useAuthStore.getState().setAccessToken(data.accessToken);
        processQueue(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — reject all queued requests and clear session
        rejectQueue(refreshError);
        useAuthStore.getState().clearSession();
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

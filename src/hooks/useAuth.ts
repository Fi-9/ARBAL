/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth hooks — React Query layer for authentication.
 *
 * NAMING CONVENTION:
 *   useSessionQuery()        → check existing session (refresh)
 *   useLoginMutation()       → email + password login
 *   useLogoutMutation()      → clear session
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';
import { queryKeys } from '../lib/queryKeys';

// ---------------------------------------------------------------------------
// Session Query — check if there's an active session on mount
// ---------------------------------------------------------------------------

export function useSessionQuery() {
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: async () => {
      try {
        const result = await authService.refresh();
        if (result?.accessToken && result?.user) {
          setSession(result.accessToken, result.user);
        }
        return result;
      } finally {
        // Always clear loading flag, even when refresh fails or returns null
        useAuthStore.getState().setLoading(false);
      }
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !accessToken,
  });
}

// ---------------------------------------------------------------------------
// Login Mutation
// ---------------------------------------------------------------------------

export function useLoginMutation() {
  const setSession = useAuthStore((s) => s.setSession);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      // Invalidate session query so the app recognizes logged-in state
      qc.setQueryData(queryKeys.auth.session(), data);
    },
  });
}

// ---------------------------------------------------------------------------
// Logout Mutation
// ---------------------------------------------------------------------------

export function useLogoutMutation() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearSession();
      qc.clear(); // Clear all cached data on logout
    },
  });
}

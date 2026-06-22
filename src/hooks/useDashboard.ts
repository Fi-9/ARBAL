/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard hooks — real-time stats from backend API.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  alumniStudents: number;
  transferredStudents: number;
  inactiveStudents: number;
  completionRate: number;
  studentsWithDocuments: number;
  totalDocuments: number;
  perAngkatan: { angkatan: number; count: number }[];
  perJurusan: { jurusan: string; count: number }[];
  perDocumentType: { type: string; count: number }[];
  recentActivity: {
    id: string;
    action: string;
    category: string;
    entityType: string;
    details: string;
    actor: string;
    createdAt: string;
  }[];
}

export function useDashboardStats() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data } = await api.get<DashboardStats>('/dashboard/stats');
      return data;
    },
    staleTime: 60_000, // 1 minute — dashboard data is not super critical
    refetchOnWindowFocus: true,
    enabled: !!accessToken,
  });
}

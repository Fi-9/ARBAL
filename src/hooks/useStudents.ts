/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Student hooks — React Query layer.
 *
 * NAMING CONVENTION:
 *   useStudentsQuery()              → read list
 *   useStudentQuery(id)             → read single
 *   useCreateStudentMutation()      → create
 *   useUpdateStudentMutation()      → update
 *   useDeleteStudentMutation()      → delete
 *   useReplaceStudentsMutation()    → bulk replace (directory view)
 *
 * WHY NAMED MUTATIONS:
 *   - Each mutation has its own loading state (isPending)
 *   - RBAC guards can be applied per-mutation
 *   - Optimistic updates are scoped cleanly per action
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Student } from '../types';
import { studentService, StudentQueryParams, PaginatedStudents } from '../services/student.service';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../stores/auth.store';

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useStudentsQuery(params?: StudentQueryParams) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: [...queryKeys.students.all(), params ?? {}],
    queryFn: () => studentService.getAll(params),
    enabled: !!accessToken,
  });
}

/** Backward-compat alias — returns just the data array (for components that don't need pagination meta) */
export const useStudents = useStudentsQuery;

/** Hook returning full paginated response (for components that need total/page info) */
export function useStudentsPaginated(params?: StudentQueryParams) {
  return useStudentsQuery(params) as ReturnType<typeof useQuery<PaginatedStudents>>;
}

export function useStudentQuery(id: string | null) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: queryKeys.students.byId(id ?? ''),
    queryFn: () => studentService.getById(id!),
    enabled: !!id && !!accessToken,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCreateStudentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentService.create,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.students.all() }),
  });
}

/** Backward-compat alias */
export const useCreateStudent = useCreateStudentMutation;

export function useUpdateStudentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentService.update,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
      qc.setQueryData(queryKeys.students.byId(updated.id), updated);
    },
  });
}

/** Backward-compat alias */
export const useUpdateStudent = useUpdateStudentMutation;

export function useDeleteStudentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
      qc.invalidateQueries({ queryKey: ['students', 'trash'] });
    },
  });
}

/** Backward-compat alias */
export const useDeleteStudent = useDeleteStudentMutation;

export function useReplaceStudentsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updated: Student[]) => studentService.replaceAll(updated),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}

/** Backward-compat alias */
export const useReplaceStudents = useReplaceStudentsMutation;

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
import { studentService } from '../services/student.service';
import { queryKeys } from '../lib/queryKeys';

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useStudentsQuery() {
  return useQuery({
    queryKey: queryKeys.students.all(),
    queryFn: studentService.getAll,
  });
}

/** Backward-compat alias — keeps existing callers in App.tsx working */
export const useStudents = useStudentsQuery;

export function useStudentQuery(id: string | null) {
  return useQuery({
    queryKey: queryKeys.students.byId(id ?? ''),
    queryFn: () => studentService.getById(id!),
    enabled: !!id,
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.students.all() }),
  });
}

/** Backward-compat alias */
export const useDeleteStudent = useDeleteStudentMutation;

export function useReplaceStudentsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updated: Student[]) => studentService.replaceAll(updated),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.students.all(), data);
    },
  });
}

/** Backward-compat alias */
export const useReplaceStudents = useReplaceStudentsMutation;

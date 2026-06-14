/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized React Query key registry.
 *
 * WHY: Query keys must be consistent across useQuery and invalidateQueries.
 * A typo in one place silently breaks cache invalidation.
 * Centralizing here makes invalidation predictable and refactorable.
 *
 * CONVENTION:
 *   - List queries:   queryKeys.students.all()
 *   - Detail queries: queryKeys.students.byId(id)
 *   - Nested scope:   queryKeys.students.documents(studentId)
 */

export const queryKeys = {
  students: {
    all: () => ['students'] as const,
    byId: (id: string) => ['students', id] as const,
    documents: (studentId: string) => ['students', studentId, 'documents'] as const,
  },

  activity: {
    logs: () => ['activity-logs'] as const,
    // Future: queryKeys.activity.logsByActor(actorId)
  },

  notifications: {
    all: () => ['notifications'] as const,
  },

  auth: {
    session: () => ['auth', 'session'] as const,
  },

  // Future namespaces — add as features are built
  // documents: { byStudent: (id: string) => ['documents', id] as const },
} as const;

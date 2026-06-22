/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Document hooks — React Query layer for document operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/document.service';
import { queryKeys } from '../lib/queryKeys';

/** Approve or reject a document (verify status). */
export function useVerifyDocumentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, action }: { documentId: string; action: 'approve' | 'reject' }) =>
      documentService.verify(documentId, action),
    onSuccess: () => {
      // Invalidate students cache so document list refetches with new status
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}

/** Soft-delete a document. */
export function useDeleteDocumentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => documentService.remove(documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}

/** Upload a new document for a student. */
export function useUploadDocumentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, studentId, docType }: { file: File; studentId: string; docType: string }) =>
      documentService.upload(file, studentId, docType),
    onSuccess: () => {
      // Refresh student list so the new document shows up
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
    },
  });
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Document Service — handles file upload to backend API.
 */

import { api } from '../lib/api';
import { DocumentType } from '../types';

export interface UploadedDocument {
  id: string;
  studentId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  storagePath: string;
  uploadedAt: string;
}

/** Map frontend DocumentType to backend Prisma enum */
const DOC_TYPE_MAP: Record<DocumentType, string> = {
  'Ijazah': 'IJAZAH',
  'Kartu Keluarga': 'KARTU_KELUARGA',
  'Akta Kelahiran': 'AKTA_KELAHIRAN',
  'Pas Foto': 'PAS_FOTO',
  'Rapor': 'RAPOR',
  'KTP Ayah': 'KTP_AYAH',
  'KTP Ibu': 'KTP_IBU',
};

/** Map frontend DocKey to backend DocumentType enum */
const DOC_KEY_MAP: Record<string, string> = {
  'kk': 'KARTU_KELUARGA',
  'akta': 'AKTA_KELAHIRAN',
  'ijazah': 'IJAZAH',
  'rapor': 'RAPOR',
  'ktpAyahDoc': 'KTP_AYAH',
  'ktpIbuDoc': 'KTP_IBU',
};

/**
 * Upload a document file to the backend.
 * Sends multipart/form-data with file + studentId + type.
 */
export async function uploadDocument(
  file: File,
  studentId: string,
  docTypeOrKey: DocumentType | string,
): Promise<UploadedDocument> {
  // Resolve the backend enum value
  const backendType = DOC_KEY_MAP[docTypeOrKey] ?? DOC_TYPE_MAP[docTypeOrKey as DocumentType] ?? docTypeOrKey;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('studentId', studentId);
  formData.append('type', backendType);

  const { data } = await api.post<UploadedDocument>('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000, // 30s for file uploads
  });

  return data;
}

/**
 * Get the URL to view/download a document file.
 */
export function getDocumentFileUrl(documentId: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  return `${baseUrl}/documents/${documentId}/file`;
}

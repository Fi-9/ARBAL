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
  version?: number;
  isLatest?: boolean;
  previousId?: string | null;
  verificationNotes?: string | null;
}

const DOC_TYPE_MAP: Record<DocumentType, string> = {
  'Kartu Keluarga': 'KK',
  'Akta Kelahiran': 'AKTA',
  'Ijazah Terakhir': 'IJAZAH_TERAKHIR',
  'Rapor': 'RAPORT',
  'Pas Foto': 'PAS_FOTO',
  'KTP Ayah': 'KTP_AYAH',
  'KTP Ibu': 'KTP_IBU',
  'Surat Pindah': 'SURAT_PINDAH',
  'Sertifikat Kompetensi': 'SERTIFIKAT',
  'Laporan Prakerin': 'PRAKERIN',
  'Dokumen Pendukung': 'PENDUKUNG',
  'Surat Keterangan Lulus': 'SKL',
};

/** Map frontend DocKey to backend DocumentType enum */
const DOC_KEY_MAP: Record<string, string> = {
  'kk': 'KK',
  'akta': 'AKTA',
  'ijazah': 'IJAZAH_TERAKHIR',
  'rapor': 'RAPORT',
  'pasFoto': 'PAS_FOTO',
  'ktpAyahDoc': 'KTP_AYAH',
  'ktpIbuDoc': 'KTP_IBU',
  'suratPindah': 'SURAT_PINDAH',
  'sertifikat': 'SERTIFIKAT',
  'prakerin': 'PRAKERIN',
  'pendukung': 'PENDUKUNG',
  'skl': 'SKL',
};

/**
 * Upload a document file to the backend.
 * Sends multipart/form-data with file + studentId + type.
 */
export async function uploadDocument(
  file: File,
  studentId: string,
  docTypeOrKey: DocumentType | string,
  onUploadProgress?: (progressEvent: any) => void,
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
    onUploadProgress,
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

/**
 * Update document verification status (Approve / Reject).
 */
export async function verifyDocument(
  documentId: string,
  action: 'approve' | 'reject',
  notes?: string,
): Promise<UploadedDocument> {
  const status = action === 'approve' ? 'VERIFIED' : 'REJECTED';
  const { data } = await api.patch<UploadedDocument>(`/documents/${documentId}/status`, {
    status,
    notes,
    reason: notes,
  });
  return data;
}

/** Soft-delete a document (move to trash). */
export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}`);
}

/** Permanent delete — also removes physical file. */
export async function permanentDeleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}/permanent`);
}

/** Download a document as Blob (for Save As). */
export async function downloadDocumentBlob(documentId: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`/documents/${documentId}/file`, {
    responseType: 'blob',
  });
  return data;
}

/** Normalize any status format → frontend label */
export function normalizeStatus(raw: string): 'Terarsip' | 'Verifikasi' | 'Ditolak' {
  const upper = raw.toUpperCase();
  if (upper === 'TERARSIP' || upper === 'VERIFIED') return 'Terarsip';
  if (upper === 'DITOLAK' || upper === 'REJECTED') return 'Ditolak';
  return 'Verifikasi';
}

/** Aggregated service object for convenient imports */
export const documentService = {
  upload: uploadDocument,
  verify: verifyDocument,
  remove: deleteDocument,
  permanentDelete: permanentDeleteDocument,
  download: downloadDocumentBlob,
  getFileUrl: getDocumentFileUrl,
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Student Service — adapter layer between components and data source.
 *
 * Maps backend Prisma responses to the frontend Student / DocumentItem shapes.
 * Components and hooks remain unchanged — only this file handles the mapping.
 */

import { Student, DocumentItem, StudentStatus, DocumentType } from '../types';
import { api } from '../lib/api';

// ---------------------------------------------------------------------------
// Backend → Frontend mappers
// ---------------------------------------------------------------------------

/** Map DB enum status (AKTIF) → frontend label (Aktif) */
const DB_STATUS_MAP: Record<string, StudentStatus> = {
  AKTIF: 'Aktif',
  ALUMNI: 'Alumni',
  PINDAHAN: 'Pindahan',
  NON_AKTIF: 'Non-Aktif',
};

/** Map DB enum document type → frontend DocumentType label */
const DB_DOC_TYPE_MAP: Record<string, DocumentType> = {
  IJAZAH: 'Ijazah',
  KARTU_KELUARGA: 'Kartu Keluarga',
  AKTA_KELAHIRAN: 'Akta Kelahiran',
  PAS_FOTO: 'Pas Foto',
  RAPOR: 'Rapor',
  KTP_AYAH: 'KTP Ayah',
  KTP_IBU: 'KTP Ibu',
};

/** Map DB enum document status → frontend label */
const DB_DOC_STATUS_MAP: Record<string, DocumentItem['status']> = {
  TERARSIP: 'Terarsip',
  VERIFIKASI: 'Verifikasi',
  DITOLAK: 'Ditolak',
};

function mapBackendDoc(doc: any): DocumentItem {
  return {
    id: doc.id,
    type: DB_DOC_TYPE_MAP[doc.type] ?? (doc.type as DocumentType),
    name: doc.originalName ?? doc.storedName ?? '',
    url: doc.storagePath ?? '',
    uploadedAt: typeof doc.uploadedAt === 'string'
      ? doc.uploadedAt
      : new Date(doc.uploadedAt).toISOString().replace('T', ' ').substring(0, 16),
    status: DB_DOC_STATUS_MAP[doc.status] ?? 'Verifikasi',
    size: doc.sizeBytes
      ? doc.sizeBytes > 1_048_576
        ? `${(doc.sizeBytes / 1_048_576).toFixed(1)} MB`
        : `${Math.round(doc.sizeBytes / 1024)} KB`
      : '0 KB',
  };
}

function mapBackendStudent(raw: any): Student {
  const guardian = raw.Guardian ?? raw.guardian ?? null;
  const documents: DocumentItem[] = (raw.Document ?? raw.documents ?? []).map(mapBackendDoc);

  return {
    id: raw.id,
    nama: raw.nama,
    nisn: raw.nisn,
    kelas: raw.kelas,
    jurusan: raw.jurusan,
    email: raw.email,
    telepon: raw.telepon,
    alamat: raw.alamat,
    tanggalLahir: typeof raw.tanggalLahir === 'string'
      ? raw.tanggalLahir
      : new Date(raw.tanggalLahir).toISOString().split('T')[0],
    status: DB_STATUS_MAP[raw.status] ?? (raw.status as StudentStatus),
    documents,
    catatan: raw.catatan ?? undefined,
    createdAt: typeof raw.createdAt === 'string'
      ? raw.createdAt
      : new Date(raw.createdAt).toISOString(),
    // Flatten guardian fields onto student
    namaAyah: guardian?.namaAyah ?? undefined,
    pekerjaanAyah: guardian?.pekerjaanAyah ?? undefined,
    ktpAyah: guardian?.ktpAyah ?? undefined,
    teleponAyah: guardian?.teleponAyah ?? undefined,
    namaIbu: guardian?.namaIbu ?? undefined,
    pekerjaanIbu: guardian?.pekerjaanIbu ?? undefined,
    ktpIbu: guardian?.ktpIbu ?? undefined,
    teleponIbu: guardian?.teleponIbu ?? undefined,
    teleponOrangTua: guardian?.teleponOrangTua ?? undefined,
    alamatOrangTua: guardian?.alamatOrangTua ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// API-backed service
// ---------------------------------------------------------------------------

export const studentService = {
  /** GET /api/v1/students */
  getAll: async (): Promise<Student[]> => {
    const { data } = await api.get<any[]>('/students');
    return (data ?? []).map(mapBackendStudent);
  },

  /** GET /api/v1/students/:id */
  getById: async (id: string): Promise<Student | null> => {
    try {
      const { data } = await api.get<any>(`/students/${id}`);
      return mapBackendStudent(data);
    } catch {
      return null;
    }
  },

  /** POST /api/v1/students */
  create: async (student: Student): Promise<Student> => {
    const { data } = await api.post<any>('/students', student);
    return mapBackendStudent(data);
  },

  /** PUT /api/v1/students/:id */
  update: async (student: Student): Promise<Student> => {
    const { data } = await api.put<any>(`/students/${student.id}`, student);
    return mapBackendStudent(data);
  },

  /** DELETE /api/v1/students/:id */
  remove: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`);
  },

  /** Bulk replace — still in-memory for directory view UX until backend supports it */
  replaceAll: async (updated: Student[]): Promise<Student[]> => {
    // Phase 2+: replace with PATCH /students/batch endpoint
    return [...updated];
  },
};

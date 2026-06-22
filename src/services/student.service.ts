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
  PENDAFTAR: 'Pendaftar',
  AKTIF: 'Aktif',
  CUTI: 'Cuti',
  LULUS: 'Lulus',
  KELUAR: 'Keluar',
  ALUMNI: 'Alumni',
};

/** Map DB enum document type → frontend DocumentType label */
const DB_DOC_TYPE_MAP: Record<string, DocumentType> = {
  KK: 'Kartu Keluarga',
  AKTA: 'Akta Kelahiran',
  IJAZAH_TERAKHIR: 'Ijazah Terakhir',
  RAPORT: 'Rapor',
  PAS_FOTO: 'Pas Foto',
  KTP_AYAH: 'KTP Ayah',
  KTP_IBU: 'KTP Ibu',
  SURAT_PINDAH: 'Surat Pindah',
  SERTIFIKAT: 'Sertifikat Kompetensi',
  PRAKERIN: 'Laporan Prakerin',
  SKL: 'Surat Keterangan Lulus',
  PENDUKUNG: 'Dokumen Pendukung',
};

/** Map DB enum document status → frontend label */
const DB_DOC_STATUS_MAP: Record<string, DocumentItem['status']> = {
  UPLOADED: 'Verifikasi',
  VERIFIED: 'Terarsip',
  REJECTED: 'Ditolak',
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
    version: doc.version ?? 1,
    isLatest: doc.isLatest ?? true,
    previousId: doc.previousId ?? undefined,
    verificationNotes: doc.verificationNotes ?? undefined,
  };
}

export function mapBackendStudent(raw: any): Student {
  const guardian = raw.Guardian ?? raw.guardian ?? null;
  const documents: DocumentItem[] = (raw.Document ?? raw.documents ?? []).map(mapBackendDoc);

  return {
    id: raw.id,
    nama: raw.nama,
    nisn: raw.nisn ?? undefined,
    nisSekolah: raw.nisSekolah ?? undefined,
    registrationNumber: raw.registrationNumber ?? undefined,
    angkatan: raw.angkatan ?? undefined,
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
    academicYearId: raw.academicYearId ?? undefined,
    graduationYear: raw.graduationYear ?? undefined,
    certificateNumber: raw.certificateNumber ?? undefined,
    
    // Biodata Baru
    nik: raw.nik ?? undefined,
    nomorKK: raw.nomorKK ?? undefined,
    namaPanggilan: raw.namaPanggilan ?? undefined,
    jenisKelamin: raw.jenisKelamin ?? undefined,
    tempatLahir: raw.tempatLahir ?? undefined,
    asalSekolah: raw.asalSekolah ?? undefined,
    tahunLulusSebelumnya: raw.tahunLulusSebelumnya ?? undefined,
    anakKe: raw.anakKe ?? undefined,
    jumlahSaudara: raw.jumlahSaudara ?? undefined,
    photoUrl: raw.photoUrl ?? undefined,

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
    pendidikanAyah: guardian?.pendidikanAyah ?? undefined,
    statusAyah: guardian?.statusAyah ?? undefined,
    pendidikanIbu: guardian?.pendidikanIbu ?? undefined,
    statusIbu: guardian?.statusIbu ?? undefined,
    namaWali: guardian?.namaWali ?? undefined,
    hubunganWali: guardian?.hubunganWali ?? undefined,
    teleponWali: guardian?.teleponWali ?? undefined,
    alamatWali: guardian?.alamatWali ?? undefined,
    completenessPercent: raw.completenessPercent ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Frontend → Backend mappers (reverse of above)
// ---------------------------------------------------------------------------

/** Map frontend status label → DB enum */
const FRONTEND_STATUS_TO_DB: Record<string, string> = {
  'Pendaftar': 'PENDAFTAR',
  'Aktif': 'AKTIF',
  'Cuti': 'CUTI',
  'Lulus': 'LULUS',
  'Keluar': 'KELUAR',
  'Alumni': 'ALUMNI',
};

/**
 * Strip frontend-only fields and map values to backend DTO format.
 * This prevents 400 errors from NestJS forbidNonWhitelisted validation.
 */
function toCreatePayload(student: Student): Record<string, any> {
  return {
    // id is optional — backend generates UUID if omitted
    ...(student.id && !student.id.startsWith('S00') ? { id: student.id } : {}),
    nisn: student.nisn || undefined,
    nisSekolah: student.nisSekolah || undefined,
    registrationNumber: student.registrationNumber || undefined,
    academicYearId: student.academicYearId || undefined,
    angkatan: student.angkatan ? Number(student.angkatan) : undefined,
    nama: student.nama,
    kelas: student.kelas || undefined,
    jurusan: student.jurusan || undefined,
    email: student.email || undefined,
    telepon: student.telepon || undefined,
    alamat: student.alamat,
    tanggalLahir: student.tanggalLahir,
    catatan: student.catatan || undefined,
    status: student.status ? (FRONTEND_STATUS_TO_DB[student.status] || student.status) : undefined,
    graduationYear: student.graduationYear ? Number(student.graduationYear) : undefined,
    certificateNumber: student.certificateNumber || undefined,

    // Biodata Baru
    nik: student.nik || undefined,
    nomorKK: student.nomorKK || undefined,
    namaPanggilan: student.namaPanggilan || undefined,
    jenisKelamin: student.jenisKelamin || undefined,
    tempatLahir: student.tempatLahir || undefined,
    asalSekolah: student.asalSekolah || undefined,
    tahunLulusSebelumnya: student.tahunLulusSebelumnya ? Number(student.tahunLulusSebelumnya) : undefined,
    anakKe: student.anakKe ? Number(student.anakKe) : undefined,
    jumlahSaudara: student.jumlahSaudara ? Number(student.jumlahSaudara) : undefined,
    photoUrl: student.photoUrl || undefined,

    // Guardian fields (flat)
    namaAyah: student.namaAyah || undefined,
    pekerjaanAyah: student.pekerjaanAyah || undefined,
    ktpAyah: student.ktpAyah || undefined,
    teleponAyah: student.teleponAyah || undefined,
    namaIbu: student.namaIbu || undefined,
    pekerjaanIbu: student.pekerjaanIbu || undefined,
    ktpIbu: student.ktpIbu || undefined,
    teleponIbu: student.teleponIbu || undefined,
    teleponOrangTua: student.teleponOrangTua || undefined,
    alamatOrangTua: student.alamatOrangTua || undefined,

    // New Guardian fields
    pendidikanAyah: student.pendidikanAyah || undefined,
    pendidikanIbu: student.pendidikanIbu || undefined,
    statusAyah: student.statusAyah || undefined,
    statusIbu: student.statusIbu || undefined,
    namaWali: student.namaWali || undefined,
    hubunganWali: student.hubunganWali || undefined,
    teleponWali: student.teleponWali || undefined,
    alamatWali: student.alamatWali || undefined,
  };
}

function toUpdatePayload(student: Student): Record<string, any> {
  return {
    nisn: student.nisn || undefined,
    nisSekolah: student.nisSekolah || undefined,
    registrationNumber: student.registrationNumber || undefined,
    academicYearId: student.academicYearId || undefined,
    angkatan: student.angkatan ? Number(student.angkatan) : undefined,
    nama: student.nama,
    kelas: student.kelas || undefined,
    jurusan: student.jurusan || undefined,
    email: student.email || undefined,
    telepon: student.telepon || undefined,
    alamat: student.alamat || undefined,
    tanggalLahir: student.tanggalLahir || undefined,
    catatan: student.catatan || undefined,
    status: student.status ? (FRONTEND_STATUS_TO_DB[student.status] || student.status) : undefined,
    graduationYear: student.graduationYear ? Number(student.graduationYear) : undefined,
    certificateNumber: student.certificateNumber || undefined,

    // Biodata Baru
    nik: student.nik || undefined,
    nomorKK: student.nomorKK || undefined,
    namaPanggilan: student.namaPanggilan || undefined,
    jenisKelamin: student.jenisKelamin || undefined,
    tempatLahir: student.tempatLahir || undefined,
    asalSekolah: student.asalSekolah || undefined,
    tahunLulusSebelumnya: student.tahunLulusSebelumnya ? Number(student.tahunLulusSebelumnya) : undefined,
    anakKe: student.anakKe ? Number(student.anakKe) : undefined,
    jumlahSaudara: student.jumlahSaudara ? Number(student.jumlahSaudara) : undefined,
    photoUrl: student.photoUrl || undefined,

    // Guardian fields (flat)
    namaAyah: student.namaAyah || undefined,
    pekerjaanAyah: student.pekerjaanAyah || undefined,
    ktpAyah: student.ktpAyah || undefined,
    teleponAyah: student.teleponAyah || undefined,
    namaIbu: student.namaIbu || undefined,
    pekerjaanIbu: student.pekerjaanIbu || undefined,
    ktpIbu: student.ktpIbu || undefined,
    teleponIbu: student.teleponIbu || undefined,
    teleponOrangTua: student.teleponOrangTua || undefined,
    alamatOrangTua: student.alamatOrangTua || undefined,

    // New Guardian fields
    pendidikanAyah: student.pendidikanAyah || undefined,
    pendidikanIbu: student.pendidikanIbu || undefined,
    statusAyah: student.statusAyah || undefined,
    statusIbu: student.statusIbu || undefined,
    namaWali: student.namaWali || undefined,
    hubunganWali: student.hubunganWali || undefined,
    teleponWali: student.teleponWali || undefined,
    alamatWali: student.alamatWali || undefined,
  };
}

// ---------------------------------------------------------------------------
// API-backed service
// ---------------------------------------------------------------------------

/** Pagination response from backend */
export interface PaginatedStudents {
  data: Student[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StudentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  kelas?: string;
  status?: string;
  jurusan?: string;
  angkatan?: number;
}

export const studentService = {
  /** GET /api/v1/students — paginated */
  getAll: async (params?: StudentQueryParams): Promise<PaginatedStudents> => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    if (params?.kelas) query.set('kelas', params.kelas);
    if (params?.status) query.set('status', params.status);
    if (params?.jurusan) query.set('jurusan', params.jurusan);
    if (params?.angkatan) query.set('angkatan', String(params.angkatan));

    const qs = query.toString();
    const { data } = await api.get<any>(`/students${qs ? `?${qs}` : ''}`);

    // Handle both old (array) and new (paginated) response shapes for safety
    if (Array.isArray(data)) {
      const mapped = data.map(mapBackendStudent);
      return {
        data: mapped,
        meta: { total: mapped.length, page: 1, limit: mapped.length, totalPages: 1 },
      };
    }

    return {
      data: (data.data ?? []).map(mapBackendStudent),
      meta: data.meta,
    };
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

  /** POST /api/v1/students — sends only DTO-compatible fields */
  create: async (student: Student): Promise<Student> => {
    const payload = toCreatePayload(student);
    const { data } = await api.post<any>('/students', payload);
    return mapBackendStudent(data);
  },

  /** PUT /api/v1/students/:id — sends only DTO-compatible fields */
  update: async (student: Student): Promise<Student> => {
    const payload = toUpdatePayload(student);
    const { data } = await api.put<any>(`/students/${student.id}`, payload);
    return mapBackendStudent(data);
  },

  /** DELETE /api/v1/students/:id */
  remove: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`);
  },

  /**
   * Optimistic local update — used by DirectoryView for UI operations
   * (verify doc, delete doc, upload doc) that modify student data locally.
   * The actual API calls happen separately; this just signals React Query
   * to invalidate and refetch the latest server state.
   */
  replaceAll: async (updated: Student[]): Promise<Student[]> => {
    // No API call — this triggers React Query's onSuccess which
    // invalidates the students cache and refetches from backend.
    return updated;
  },

  getAcademicYears: async (): Promise<{ id: string; name: string; isActive: boolean }[]> => {
    const { data } = await api.get<any[]>('/students/academic-years');
    return data ?? [];
  },

  createAcademicYear: async (name: string): Promise<{ id: string; name: string; isActive: boolean }> => {
    const { data } = await api.post<any>('/students/academic-years', { name });
    return data;
  },

  getTimeline: async (id: string): Promise<any[]> => {
    const { data } = await api.get<any[]>(`/students/${id}/timeline`);
    return data ?? [];
  },
};

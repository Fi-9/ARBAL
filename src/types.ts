/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DocumentType = 'Ijazah' | 'Kartu Keluarga' | 'Akta Kelahiran' | 'Pas Foto' | 'Rapor' | 'KTP Ayah' | 'KTP Ibu';

export interface DocumentItem {
  id: string;
  type: DocumentType;
  name: string;
  url: string;
  uploadedAt: string;
  status: 'Terarsip' | 'Verifikasi' | 'Belum Lengkap' | 'Ditolak';
  size: string;
}

export type StudentStatus = 'Aktif' | 'Alumni' | 'Pindahan' | 'Non-Aktif';

export interface Student {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  jurusan: string;
  email: string;
  telepon: string;
  alamat: string;
  tanggalLahir: string;
  status: StudentStatus;
  documents: DocumentItem[];
  catatan?: string;
  createdAt: string;
  
  // Data Orang Tua / Wali
  namaAyah?: string;
  pekerjaanAyah?: string;
  ktpAyah?: string;
  teleponAyah?: string;
  namaIbu?: string;
  pekerjaanIbu?: string;
  ktpIbu?: string;
  teleponIbu?: string;
  teleponOrangTua?: string;
  alamatOrangTua?: string;
}

export type RoleType = 'Super Admin' | 'Staff TU' | 'Guru / Wali Kelas';

export interface AppRole {
  name: RoleType;
  description: string;
  permissions: {
    siswa_read: boolean;
    siswa_write: boolean;
    siswa_delete: boolean;
    doc_upload: boolean;
    doc_delete: boolean;
    doc_verify: boolean;
    access_manage: boolean;
    logs_view: boolean;
  };
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: RoleType;
  action: string;
  category: 'Siswa' | 'Dokumen' | 'Hak Akses' | 'Google Drive' | 'Google Sheets';
  details: string;
}

export interface SystemNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
}

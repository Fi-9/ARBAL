/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DocumentType = 
  | 'Kartu Keluarga' 
  | 'Akta Kelahiran' 
  | 'Ijazah Terakhir' 
  | 'Rapor' 
  | 'Pas Foto' 
  | 'KTP Ayah' 
  | 'KTP Ibu' 
  | 'Surat Pindah' 
  | 'Sertifikat Kompetensi' 
  | 'Laporan Prakerin' 
  | 'Dokumen Pendukung'
  | 'Surat Keterangan Lulus'; // SKL

export interface DocumentItem {
  id: string;
  type: DocumentType;
  name: string;
  url: string;
  uploadedAt: string;
  status: 'Terarsip' | 'Verifikasi' | 'Belum Lengkap' | 'Ditolak';
  size: string;
  version?: number;
  isLatest?: boolean;
  previousId?: string;
  verificationNotes?: string;
}

export type StudentStatus = 'Pendaftar' | 'Aktif' | 'Cuti' | 'Lulus' | 'Keluar' | 'Alumni';

export interface Student {
  id: string;
  nama: string;
  nisn?: string;
  nisSekolah?: string;
  registrationNumber?: string;
  angkatan?: number;
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
  academicYearId?: string;
  graduationYear?: number;
  certificateNumber?: string;
  
  // Biodata Baru
  nik?: string;
  nomorKK?: string;
  namaPanggilan?: string;
  jenisKelamin?: 'LAKI_LAKI' | 'PEREMPUAN';
  tempatLahir?: string;
  asalSekolah?: string;
  tahunLulusSebelumnya?: number;
  anakKe?: number;
  jumlahSaudara?: number;
  photoUrl?: string;

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
  pendidikanAyah?: string;
  statusAyah?: 'MASIH_HIDUP' | 'MENINGGAL';
  pendidikanIbu?: string;
  statusIbu?: 'MASIH_HIDUP' | 'MENINGGAL';
  namaWali?: string;
  hubunganWali?: string;
  teleponWali?: string;
  alamatWali?: string;
  completenessPercent?: number;
}

export type RoleType = 'Super Admin' | 'Guru / Wali Kelas' | 'Kepala Sekolah' | 'Tata Usaha';

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

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: 'SUPER_ADMIN' | 'GURU' | 'KEPALA_SEKOLAH' | 'TATA_USAHA';
}

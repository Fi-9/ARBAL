/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, AppRole, ActivityLog, SystemNotification } from './types';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'S001',
    nama: 'Muhammad Fikri Ihsan',
    nisn: '0085429185',
    kelas: 'XII RPL 1',
    jurusan: 'Rekayasa Perangkat Lunak',
    email: 'fikri.ihsan@siswa.sch.id',
    telepon: '081234567890',
    alamat: 'Jl. Ahmad Yani No. 45, Bandung',
    tanggalLahir: '2008-05-12',
    status: 'Aktif',
    createdAt: '2025-07-15 08:30',
    catatan: 'Aktif sebagai ketua OSIS. Memiliki ketertarikan tinggi pada cloud computing.',
    namaAyah: 'H. Abdulloh',
    pekerjaanAyah: 'Wiraswasta',
    ktpAyah: '3273181205690001',
    teleponAyah: '081223344556',
    namaIbu: 'Hj. Siti Aminah',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    ktpIbu: '3273181412720002',
    teleponIbu: '081334455667',
    teleponOrangTua: '081223344556',
    alamatOrangTua: 'Jl. Ahmad Yani No. 45, Coblong, Bandung',
    documents: [
      {
        id: 'D001_1',
        type: 'Ijazah',
        name: 'Ijazah_SMP_Fikri_Ihsan.pdf',
        url: '#',
        uploadedAt: '2025-07-15 09:12',
        status: 'Terarsip',
        size: '1.2 MB'
      },
      {
        id: 'D001_2',
        type: 'Kartu Keluarga',
        name: 'KK_Keluarga_Ihsan_Bandung.pdf',
        url: '#',
        uploadedAt: '2025-07-20 10:45',
        status: 'Terarsip',
        size: '850 KB'
      },
      {
        id: 'D001_3',
        type: 'Akta Kelahiran',
        name: 'Akta_Lahir_Fikri.pdf',
        url: '#',
        uploadedAt: '2025-07-15 09:15',
        status: 'Terarsip',
        size: '640 KB'
      },
      {
        id: 'D001_4',
        type: 'Pas Foto',
        name: 'Foto_3x4_Fikri_Ihsan.png',
        url: '#',
        uploadedAt: '2025-07-15 09:20',
        status: 'Terarsip',
        size: '420 KB'
      },
      {
        id: 'D001_5',
        type: 'Rapor',
        name: 'Rapor_Semester_1_5_Fikri.pdf',
        url: '#',
        uploadedAt: '2025-12-18 14:00',
        status: 'Verifikasi',
        size: '4.1 MB'
      }
    ]
  },
  {
    id: 'S002',
    nama: 'Amanda Putri Lestari',
    nisn: '0091248562',
    kelas: 'XI MIPA 2',
    jurusan: 'MIPA (Matematika dan IPA)',
    email: 'amanda.putri@siswa.sch.id',
    telepon: '082345678901',
    alamat: 'Perumahan Indah Regensi Blok C-12, Cimahi',
    tanggalLahir: '2009-10-22',
    status: 'Aktif',
    createdAt: '2025-07-16 10:15',
    catatan: 'Atlet lari di tingkat kota. Sangat berprestasi di bidang Biologi.',
    documents: [
      {
        id: 'D002_1',
        type: 'Ijazah',
        name: 'Ijazah_SMP_Amanda_Putri.pdf',
        url: '#',
        uploadedAt: '2025-07-16 10:30',
        status: 'Terarsip',
        size: '1.4 MB'
      },
      {
        id: 'D002_2',
        type: 'Kartu Keluarga',
        name: 'Kartu_Keluarga_Putri.pdf',
        url: '#',
        uploadedAt: '2025-07-16 10:32',
        status: 'Terarsip',
        size: '720 KB'
      },
      {
        id: 'D002_3',
        type: 'Akta Kelahiran',
        name: 'Akta_Lahir_Amanda.pdf',
        url: '#',
        uploadedAt: '2025-07-16 10:35',
        status: 'Ditolak',
        size: '590 KB'
      },
      {
        id: 'D002_4',
        type: 'Pas Foto',
        name: 'Foto_Seragam_Amanda.jpg',
        url: '#',
        uploadedAt: '2025-07-16 10:40',
        status: 'Terarsip',
        size: '512 KB'
      }
    ]
  },
  {
    id: 'S003',
    nama: 'Budi Hartono',
    nisn: '0081029384',
    kelas: 'XII IPS 3',
    jurusan: 'IPS (Ilmu Pengetahuan Sosial)',
    email: 'budi.hartono@siswa.sch.id',
    telepon: '083456789012',
    alamat: 'Kampung Sawah No. 89, Soreang',
    tanggalLahir: '2008-02-14',
    status: 'Aktif',
    createdAt: '2025-07-15 09:00',
    catatan: 'Anggota klub Teater dan jurnalisme sekolah.',
    documents: [
      {
        id: 'D003_1',
        type: 'Ijazah',
        name: 'Ijazah_SMP_Budi_Hartono.pdf',
        url: '#',
        uploadedAt: '2025-07-15 09:30',
        status: 'Terarsip',
        size: '1.1 MB'
      },
      {
        id: 'D003_2',
        type: 'Kartu Keluarga',
        name: 'KK_Budi_Hartono.pdf',
        url: '#',
        uploadedAt: '2025-07-18 11:15',
        status: 'Verifikasi',
        size: '610 KB'
      }
    ]
  },
  {
    id: 'S004',
    nama: 'Citra Kirana Pratama',
    nisn: '0097654321',
    kelas: 'X-C',
    jurusan: 'Umum',
    email: 'citra.kirana@siswa.sch.id',
    telepon: '084567890123',
    alamat: 'Gg. Masjid II No. 7, Coblong, Bandung',
    tanggalLahir: '2010-01-05',
    status: 'Aktif',
    createdAt: '2025-07-20 14:22',
    catatan: 'Siswa baru, butuh monitoring dokumen foto serta kelengkapan BPJS/Asuransi jika diperlukan.',
    documents: [
      {
        id: 'D004_1',
        type: 'Kartu Keluarga',
        name: 'KK_Citra_Bandung.pdf',
        url: '#',
        uploadedAt: '2025-07-20 14:30',
        status: 'Terarsip',
        size: '950 KB'
      },
      {
        id: 'D004_2',
        type: 'Akta Kelahiran',
        name: 'Akta_Kelahiran_Citra.pdf',
        url: '#',
        uploadedAt: '2025-07-20 14:32',
        status: 'Terarsip',
        size: '1.0 MB'
      },
      {
        id: 'D004_3',
        type: 'Pas Foto',
        name: 'Citra_Foto_3x4.png',
        url: '#',
        uploadedAt: '2025-07-22 09:00',
        status: 'Verifikasi',
        size: '390 KB'
      }
    ]
  },
  {
    id: 'S005',
    nama: 'Dimas Aditya Saputra',
    nisn: '0078123456',
    kelas: 'XII RPL 1',
    jurusan: 'Rekayasa Perangkat Lunak',
    email: 'dimas.aditya@siswa.sch.id',
    telepon: '085678901234',
    alamat: 'Kopo Permai Indah Blok G No. 5, Bandung',
    tanggalLahir: '2007-11-30',
    status: 'Alumni',
    createdAt: '2024-07-15 08:30',
    catatan: 'Lulusan tahun 2025. Melanjutkan studi di Universitas Padjadjaran.',
    documents: [
      {
        id: 'D005_1',
        type: 'Ijazah',
        name: 'Ijazah_SMP_Dimas.pdf',
        url: '#',
        uploadedAt: '2024-07-15 09:12',
        status: 'Terarsip',
        size: '1.3 MB'
      },
      {
        id: 'D005_2',
        type: 'Kartu Keluarga',
        name: 'KK_Dimas_Saputra.pdf',
        url: '#',
        uploadedAt: '2024-07-15 10:45',
        status: 'Terarsip',
        size: '910 KB'
      },
      {
        id: 'D005_3',
        type: 'Akta Kelahiran',
        name: 'Akta_Lahir_Dimas.pdf',
        url: '#',
        uploadedAt: '2024-07-15 09:15',
        status: 'Terarsip',
        size: '720 KB'
      },
      {
        id: 'D005_4',
        type: 'Pas Foto',
        name: 'Pasfoto_Dimas_Lulus.png',
        url: '#',
        uploadedAt: '2024-07-15 09:20',
        status: 'Terarsip',
        size: '410 KB'
      },
      {
        id: 'D005_5',
        type: 'Rapor',
        name: 'Rapor_Gabungan_RPL_Dimas.pdf',
        url: '#',
        uploadedAt: '2025-05-10 13:10',
        status: 'Terarsip',
        size: '5.2 MB'
      }
    ]
  },
  {
    id: 'S006',
    nama: 'Eliana Safitri',
    nisn: '0092345678',
    kelas: 'X-A',
    jurusan: 'Umum',
    email: 'eliana.safitri@siswa.sch.id',
    telepon: '086789012345',
    alamat: 'Sarijadi Blok VIII No. 12, Bandung',
    tanggalLahir: '2010-06-18',
    status: 'Aktif',
    createdAt: '2025-07-21 11:00',
    catatan: 'Siswa pindahan dari SMPN 1 Bogor.',
    documents: [
      {
        id: 'D006_1',
        type: 'Ijazah',
        name: 'Surat_Pindah_&_Ijazah_Eliana.pdf',
        url: '#',
        uploadedAt: '2025-07-21 11:30',
        status: 'Verifikasi',
        size: '2.5 MB'
      },
      {
        id: 'D006_2',
        type: 'Kartu Keluarga',
        name: 'KK_Sarijadi_Eliana.pdf',
        url: '#',
        uploadedAt: '2025-07-21 11:32',
        status: 'Terarsip',
        size: '810 KB'
      },
      {
        id: 'D006_3',
        type: 'Akta Kelahiran',
        name: 'Akta_Eliana_Safitri.pdf',
        url: '#',
        uploadedAt: '2025-07-21 11:35',
        status: 'Terarsip',
        size: '600 KB'
      }
    ]
  }
];

export const APP_ROLES: { [key: string]: AppRole } = {
  'Super Admin': {
    name: 'Super Admin',
    description: 'Akses penuh ke semua modul sistem termasuk konfigurasi database, kelola hak akses, arsip dokumen, log aktivitas, dan notifikasi.',
    permissions: {
      siswa_read: true,
      siswa_write: true,
      siswa_delete: true,
      doc_upload: true,
      doc_delete: true,
      doc_verify: true,
      access_manage: true,
      logs_view: true
    }
  },
  'Staff TU': {
    name: 'Staff TU',
    description: 'Mengelola entri data siswa, mengupload dokumen arsip siswa ke Google Drive, mengintegrasikan Google Sheets, serta meninjau log.',
    permissions: {
      siswa_read: true,
      siswa_write: true,
      siswa_delete: false,
      doc_upload: true,
      doc_delete: false,
      doc_verify: true,
      access_manage: false,
      logs_view: true
    }
  },
  'Guru / Wali Kelas': {
    name: 'Guru / Wali Kelas',
    description: 'Akses informasi baca data siswa, mendownload arsip digital untuk kebutuhan akademik, dan menulis catatan wali kelas.',
    permissions: {
      siswa_read: true,
      siswa_write: false,
      siswa_delete: false,
      doc_upload: false,
      doc_delete: false,
      doc_verify: false,
      access_manage: false,
      logs_view: false
    }
  }
};

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'L001',
    timestamp: '2026-06-13 09:22:15',
    actorName: 'Drs. H. Mulyono',
    actorRole: 'Super Admin',
    action: 'Konfigurasi Sistem',
    category: 'Hak Akses',
    details: 'Melakukan backup sistem arsip mingguan ke server cadangan.'
  },
  {
    id: 'L002',
    timestamp: '2026-06-13 14:35:42',
    actorName: 'Rina Herawati, S.Pd',
    actorRole: 'Staff TU',
    action: 'Daftar Siswa Baru',
    category: 'Siswa',
    details: 'Menambahkan data siswa baru atas nama Citra Kirana Pratama (X-C).'
  },
  {
    id: 'L003',
    timestamp: '2026-06-13 14:40:11',
    actorName: 'Rina Herawati, S.Pd',
    actorRole: 'Staff TU',
    action: 'Upload Dokumen',
    category: 'Dokumen',
    details: 'Mengunggah Akta Kelahiran dan Kartu Keluarga Citra Kirana Pratama ke Google Drive terpusat.'
  },
  {
    id: 'L004',
    timestamp: '2026-06-13 15:10:00',
    actorName: 'Rina Herawati, S.Pd',
    actorRole: 'Staff TU',
    action: 'Sinkronisasi Google Sheets',
    category: 'Google Sheets',
    details: 'Sinkronisasi 6 daftar siswa aktif ke spreadsheet Google Sheets Arsip Utama.'
  },
  {
    id: 'L005',
    timestamp: '2026-06-13 16:45:12',
    actorName: 'Asep Saepudin, M.Pd',
    actorRole: 'Guru / Wali Kelas',
    action: 'Akses Rapor',
    category: 'Siswa',
    details: 'Mengunduh transkrip nilai akademik Muhammad Fikri Ihsan (XII RPL 1).'
  },
  {
    id: 'L006',
    timestamp: '2026-06-13 18:20:05',
    actorName: 'Rina Herawati, S.Pd',
    actorRole: 'Staff TU',
    action: 'Verifikasi Dokumen',
    category: 'Dokumen',
    details: 'Verifikasi dokumen Rapor Semester 1-5 Muhammad Fikri Ihsan berstatus VERIFIKASI PENDING.'
  },
  {
    id: 'L007',
    timestamp: '2026-06-13 20:05:40',
    actorName: 'Drs. H. Mulyono',
    actorRole: 'Super Admin',
    action: 'Manajemen Hak Akses',
    category: 'Hak Akses',
    details: 'Memberikan hak verifikasi dokumen tambahan ke peran "Staff TU" agar operasional lebih fleksibel.'
  }
];

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'N001',
    timestamp: '2026-06-13 20:05:40',
    title: 'Perubahan Hak Akses',
    message: 'Hak verifikasi dokumen bagi peran Staff TU telah diaktifkan oleh Drs. H. Mulyono.',
    type: 'info',
    read: false
  },
  {
    id: 'N002',
    timestamp: '2026-06-13 18:20:05',
    title: 'Dokumen Membutuhkan Verifikasi',
    message: 'Rapor Semester 1-5 atas nama Muhammad Fikri Ihsan diunggah oleh Staff TU dan siap diverifikasi.',
    type: 'warning',
    read: false
  },
  {
    id: 'N003',
    timestamp: '2026-06-13 14:40:11',
    title: 'Arsip Dokumen Diunggah',
    message: 'Dokumen KK_Citra_Bandung.pdf berhasil dicadangkan eksternal ke Google Drive.',
    type: 'success',
    read: true
  }
];

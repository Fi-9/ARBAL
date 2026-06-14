/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mock data for activity logs and system notifications.
 * Swap for real API calls when backend is ready.
 */

import { ActivityLog, SystemNotification } from '../types';

export const MOCK_LOGS: ActivityLog[] = [
  {
    id: 'L001',
    timestamp: '2026-06-13 09:22:15',
    actorName: 'Drs. H. Mulyono',
    actorRole: 'Super Admin',
    action: 'Konfigurasi Sistem',
    category: 'Hak Akses',
    details: 'Melakukan backup sistem arsip mingguan ke server cadangan.',
  },
  {
    id: 'L002',
    timestamp: '2026-06-13 14:35:42',
    actorName: 'Rina Herawati, S.Pd',
    actorRole: 'Staff TU',
    action: 'Daftar Siswa Baru',
    category: 'Siswa',
    details: 'Menambahkan data siswa baru atas nama Citra Kirana Pratama (X-C).',
  },
  {
    id: 'L003',
    timestamp: '2026-06-13 14:40:11',
    actorName: 'Rina Herawati, S.Pd',
    actorRole: 'Staff TU',
    action: 'Upload Dokumen',
    category: 'Dokumen',
    details: 'Mengunggah Akta Kelahiran dan Kartu Keluarga Citra Kirana Pratama ke Google Drive terpusat.',
  },
  {
    id: 'L004',
    timestamp: '2026-06-13 15:10:00',
    actorName: 'Rina Herawati, S.Pd',
    actorRole: 'Staff TU',
    action: 'Sinkronisasi Google Sheets',
    category: 'Google Sheets',
    details: 'Sinkronisasi 6 daftar siswa aktif ke spreadsheet Google Sheets Arsip Utama.',
  },
  {
    id: 'L005',
    timestamp: '2026-06-13 16:45:12',
    actorName: 'Asep Saepudin, M.Pd',
    actorRole: 'Guru / Wali Kelas',
    action: 'Akses Rapor',
    category: 'Siswa',
    details: 'Mengunduh transkrip nilai akademik Muhammad Fikri Ihsan (XII RPL 1).',
  },
  {
    id: 'L006',
    timestamp: '2026-06-13 18:20:05',
    actorName: 'Rina Herawati, S.Pd',
    actorRole: 'Staff TU',
    action: 'Verifikasi Dokumen',
    category: 'Dokumen',
    details: 'Verifikasi dokumen Rapor Semester 1-5 Muhammad Fikri Ihsan berstatus VERIFIKASI PENDING.',
  },
  {
    id: 'L007',
    timestamp: '2026-06-13 20:05:40',
    actorName: 'Drs. H. Mulyono',
    actorRole: 'Super Admin',
    action: 'Manajemen Hak Akses',
    category: 'Hak Akses',
    details: 'Memberikan hak verifikasi dokumen tambahan ke peran "Staff TU" agar operasional lebih fleksibel.',
  },
];

export const MOCK_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'N001',
    timestamp: '2026-06-13 20:05:40',
    title: 'Perubahan Hak Akses',
    message: 'Hak verifikasi dokumen bagi peran Staff TU telah diaktifkan oleh Drs. H. Mulyono.',
    type: 'info',
    read: false,
  },
  {
    id: 'N002',
    timestamp: '2026-06-13 18:20:05',
    title: 'Dokumen Membutuhkan Verifikasi',
    message: 'Rapor Semester 1-5 atas nama Muhammad Fikri Ihsan diunggah oleh Staff TU dan siap diverifikasi.',
    type: 'warning',
    read: false,
  },
  {
    id: 'N003',
    timestamp: '2026-06-13 14:40:11',
    title: 'Arsip Dokumen Diunggah',
    message: 'Dokumen KK_Citra_Bandung.pdf berhasil dicadangkan eksternal ke Google Drive.',
    type: 'success',
    read: true,
  },
];

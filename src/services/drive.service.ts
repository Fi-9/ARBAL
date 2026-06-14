/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drive/Sheets Service — simulated Google Workspace operations.
 * Phase 1: still simulated (no dedicated backend endpoints yet).
 * Phase 3: replace with real API calls to POST /api/v1/sync/*.
 */

export type SyncResult = {
  success: boolean;
  count: number;
  message: string;
};

export const driveService = {
  /** POST /api/v1/sync/sheets (Phase 3) */
  syncToSheets: async (studentCount: number): Promise<SyncResult> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          count: studentCount,
          message: `Berhasil menyinkronkan ${studentCount} data biodata siswa aktif ke spreadsheet Kesiswaan Pusat.`,
        });
      }, 1800);
    });
  },

  /** POST /api/v1/sync/drive (Phase 3) */
  backupToDrive: async (totalFiles: number): Promise<SyncResult> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          count: totalFiles,
          message: `Seluruh berkas arsip digital (${totalFiles} dokumen) berhasil diamankan di penyimpanan cloud terpusat.`,
        });
      }, 1850);
    });
  },
};

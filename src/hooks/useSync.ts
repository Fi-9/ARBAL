/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSync — Google Sheets sync and Google Drive backup mutations.
 *
 * DESIGN DECISION:
 *   isSyncingSheets / isSyncingDrive have been REMOVED from sync.store (Zustand).
 *   These are now derived from mutation.isPending — the React Query source of truth.
 *
 *   The only remaining sync state in Zustand is driveStatus / sheetsStatus
 *   (connection indicator: 'connected' | 'error' | 'syncing') because that is
 *   persistent UI state shown in the Sidebar — not tied to a single mutation lifecycle.
 *
 *   HOW TO CONSUME:
 *     const syncSheets = useSyncGoogleSheetsMutation();
 *     syncSheets.isPending     ← replaces isSyncingSheets
 *     syncSheets.mutate(count) ← triggers sync
 */

import { useMutation } from '@tanstack/react-query';
import { driveService } from '../services/drive.service';
import { useSyncStore } from '../stores/sync.store';
import { useAddLogMutation } from './useActivity';
import { useAddNotificationMutation } from './useActivity';

export function useSyncGoogleSheetsMutation() {
  const { setSheetsStatus } = useSyncStore();
  const addLog = useAddLogMutation();
  const addNotification = useAddNotificationMutation();

  return useMutation({
    mutationFn: (studentCount: number) => driveService.syncToSheets(studentCount),
    onMutate: () => {
      setSheetsStatus('syncing');
    },
    onSuccess: (result) => {
      setSheetsStatus('connected');
      addLog.mutate({
        action: 'Sinkronisasi Manual',
        category: 'Google Sheets',
        details: result.message,
      });
      addNotification.mutate({
        title: 'Sinkronisasi Excel Sukses',
        message: `Koneksi lembar kesiswaan Google Sheets berhasil menyelaraskan ${result.count} baris data otomatis.`,
        type: 'success',
      });
    },
    onError: () => setSheetsStatus('error'),
  });
}

/** Backward-compat alias */
export const useSyncGoogleSheets = useSyncGoogleSheetsMutation;

export function useBackupGoogleDriveMutation() {
  const { setDriveStatus } = useSyncStore();
  const addLog = useAddLogMutation();
  const addNotification = useAddNotificationMutation();

  return useMutation({
    mutationFn: (totalFiles: number) => driveService.backupToDrive(totalFiles),
    onMutate: () => {
      setDriveStatus('syncing');
    },
    onSuccess: (result) => {
      setDriveStatus('connected');
      addLog.mutate({
        action: 'Pencadangan Arsip',
        category: 'Google Drive',
        details: `Berhasil menyinkronkan seluruh berkas draf siswa (${result.count} file) ke folder Google Drive Terenkripsi Sekolah.`,
      });
      addNotification.mutate({
        title: 'Pencadangan Berhasil',
        message: result.message,
        type: 'success',
      });
    },
    onError: () => setDriveStatus('error'),
  });
}

/** Backward-compat alias */
export const useBackupGoogleDrive = useBackupGoogleDriveMutation;

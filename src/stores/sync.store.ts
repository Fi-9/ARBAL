/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sync Store — Zustand slice for connection status indicators.
 *
 * WHAT'S HERE:
 *   driveStatus / sheetsStatus — persistent connection badge shown in Sidebar.
 *   notifCenterOpen            — notification drawer open/closed.
 *
 * WHAT'S NOT HERE (removed):
 *   isSyncingSheets / isSyncingDrive — these were redundant with
 *   useSyncGoogleSheetsMutation().isPending and useBackupGoogleDriveMutation().isPending.
 *   React Query's isPending is the single source of truth for mutation loading state.
 */

import { create } from 'zustand';

interface SyncState {
  driveStatus: 'connected' | 'error' | 'syncing';
  sheetsStatus: 'connected' | 'error' | 'syncing';
  notifCenterOpen: boolean;

  // Actions
  setDriveStatus: (status: 'connected' | 'error' | 'syncing') => void;
  setSheetsStatus: (status: 'connected' | 'error' | 'syncing') => void;
  toggleNotifCenter: () => void;
  setNotifCenterOpen: (open: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  driveStatus: 'connected',
  sheetsStatus: 'connected',
  notifCenterOpen: false,

  setDriveStatus: (status) => set({ driveStatus: status }),
  setSheetsStatus: (status) => set({ sheetsStatus: status }),
  toggleNotifCenter: () =>
    set((state) => ({ notifCenterOpen: !state.notifCenterOpen })),
  setNotifCenterOpen: (open) => set({ notifCenterOpen: open }),
}));

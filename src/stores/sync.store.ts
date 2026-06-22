/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sync Store — Zustand store for UI drawer states (Notification Center).
 * Google Sheets and Drive sync properties are removed in V1 Stable scope cleanup.
 */

import { create } from 'zustand';

interface SyncState {
  notifCenterOpen: boolean;
  toggleNotifCenter: () => void;
  setNotifCenterOpen: (open: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  notifCenterOpen: false,
  toggleNotifCenter: () =>
    set((state) => ({ notifCenterOpen: !state.notifCenterOpen })),
  setNotifCenterOpen: (open) => set({ notifCenterOpen: open }),
}));

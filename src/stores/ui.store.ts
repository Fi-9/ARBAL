/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';

export type AppView =
  | 'dashboard'
  | 'directory'
  | 'inputForm'
  | 'accessControl'
  | 'activityLog'
  | 'trash'
  | 'backup';

// UI-only state for navigation — NOT server state (that belongs in React Query)
interface UIState {
  currentView: AppView;
  editingStudentId: string | null;
  initialDirectoryFilter: {
    completeness?: string; // 'Lengkap' | 'Belum Lengkap'
    status?: string;
  } | null;

  // Actions
  setCurrentView: (view: AppView) => void;
  setEditingStudentId: (id: string | null) => void;
  navigateToEdit: (studentId: string) => void;
  navigateToDirectory: () => void;
  setInitialDirectoryFilter: (filter: UIState['initialDirectoryFilter']) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'dashboard',
  editingStudentId: null,
  initialDirectoryFilter: null,

  setCurrentView: (view) => set({ currentView: view }),
  setEditingStudentId: (id) => set({ editingStudentId: id }),

  navigateToEdit: (studentId) =>
    set({ editingStudentId: studentId, currentView: 'inputForm' }),

  navigateToDirectory: () =>
    set({ editingStudentId: null, currentView: 'directory' }),

  setInitialDirectoryFilter: (filter) => set({ initialDirectoryFilter: filter }),
  reset: () => set({ currentView: 'dashboard', editingStudentId: null, initialDirectoryFilter: null }),
}));

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';

// UI-only state for navigation — NOT server state (that belongs in React Query)
interface UIState {
  currentView: string;
  editingStudentId: string | null;

  // Actions
  setCurrentView: (view: string) => void;
  setEditingStudentId: (id: string | null) => void;
  navigateToEdit: (studentId: string) => void;
  navigateToDirectory: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'dashboard',
  editingStudentId: null,

  setCurrentView: (view) => set({ currentView: view }),
  setEditingStudentId: (id) => set({ editingStudentId: id }),

  navigateToEdit: (studentId) =>
    set({ editingStudentId: studentId, currentView: 'inputForm' }),

  navigateToDirectory: () =>
    set({ editingStudentId: null, currentView: 'directory' }),
}));

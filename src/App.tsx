/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App.tsx — Phase 0 refactored root component.
 *
 * Responsibilities (after refactor):
 *   - Compose the layout (Sidebar + Header + Main)
 *   - Read UI state from Zustand stores
 *   - Trigger actions via custom hooks (no raw setState for server data)
 *
 * What was removed from here:
 *   - students / logs / notifications state  → React Query (via hooks)
 *   - editingStudent object                  → UIStore (editingStudentId)
 *   - sync loading booleans                  → SyncStore (Zustand)
 *   - handleAddLog / handleAddNotification   → useAddLog / useAddNotification
 *   - handleSyncGoogleSheets                 → useSyncGoogleSheets
 *   - handleBackupGoogleDrive                → useBackupGoogleDrive
 */

import React from 'react';

// Zustand stores (UI state — not server data)
import { useAuthStore, getActiveUserLabel } from './stores/auth.store';
import { useUIStore } from './stores/ui.store';
import { useSyncStore } from './stores/sync.store';

// React Query hooks
import { useSessionQuery, useLogoutMutation } from './hooks/useAuth';
import { useStudents, useCreateStudent, useUpdateStudent, useReplaceStudents } from './hooks/useStudents';
import { useActivityLogs, useAddLog, useNotifications, useAddNotification, useMarkAllNotificationsRead, useClearNotification } from './hooks/useActivity';
import { useSyncGoogleSheets, useBackupGoogleDrive } from './hooks/useSync';

// Types
import { Student, RoleType } from './types';

// Components
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import StudentDirectoryView from './components/StudentDirectoryView';
import StudentFormView from './components/StudentFormView';
import SecurityAndAccessView from './components/SecurityAndAccessView';
import ActivityLogView from './components/ActivityLogView';
import NotificationCenter from './components/NotificationCenter';
import LoginView from './components/LoginView';
import { LogOut, Loader2 } from 'lucide-react';

export default function App() {
  // ══ ALL HOOKS MUST BE CALLED UNCONDITIONALLY (Rules of Hooks) ══════════
  // Auth: session check + logout
  useSessionQuery();
  const { accessToken, isLoading, selectedRole, user, setSimulatedRole } = useAuthStore();
  const logoutMutation = useLogoutMutation();

  // Zustand: UI state
  const { currentView, setCurrentView, editingStudentId, navigateToEdit, navigateToDirectory } = useUIStore();
  const { driveStatus, sheetsStatus, notifCenterOpen, toggleNotifCenter, setNotifCenterOpen } = useSyncStore();

  // React Query: server data
  const { data: students = [] } = useStudents();
  const { data: logs = [] } = useActivityLogs();
  const { data: notifications = [] } = useNotifications();

  // Mutation hooks
  const addLog = useAddLog();
  const addNotification = useAddNotification();
  const syncSheets = useSyncGoogleSheets();
  const backupDrive = useBackupGoogleDrive();
  const markAllRead = useMarkAllNotificationsRead();
  const clearNotif = useClearNotification();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const replaceStudents = useReplaceStudents();

  // ── Derived state ───────────────────────────────────────────────────────
  const isSyncingSheets = syncSheets.isPending;
  const isSyncingDrive = backupDrive.isPending;
  const editingStudent = editingStudentId
    ? students.find((s) => s.id === editingStudentId) ?? null
    : null;

  // ══ Auth gating (AFTER all hooks) ═══════════════════════════════════════
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }
  if (!accessToken) {
    return <LoginView />;
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  const handleRoleChange = (role: RoleType) => {
    setSimulatedRole(role);
    addLog.mutate({
      action: 'Peralihan Akun',
      category: 'Hak Akses',
      details: `Sesi portal berubah menjadi modus peran ${role}.`,
    });
    addNotification.mutate({
      title: 'Sesi Dirubah',
      message: `Sessi login browser berganti menjadi ${role}. Sistem menyelaraskan pembatasan enkripsi data.`,
      type: 'info',
    });
  };

  const handleSyncGoogleSheets = () => {
    if (selectedRole === 'Guru / Wali Kelas') {
      alert('Maaf, peran Guru / Wali Kelas tidak memiliki izin menyelaraskan data kementerian.');
      return;
    }
    syncSheets.mutate(students.length);
  };

  const handleBackupGoogleDrive = () => {
    if (selectedRole === 'Guru / Wali Kelas') {
      alert('Hanya Administrator atau Pengelola Tata Usaha yang diizinkan memicu pencadangan eksternal.');
      return;
    }
    const totalFiles = students.reduce((sum, s) => sum + s.documents.length, 0);
    backupDrive.mutate(totalFiles);
  };

  const handleSaveStudent = (savedStudent: Student) => {
    const isEdit = students.some((s) => s.id === savedStudent.id);
    if (isEdit) {
      updateStudent.mutate(savedStudent);
    } else {
      createStudent.mutate(savedStudent);
    }
    // Flush any pending file uploads for this student
    const flush = (window as any).__arbalFlushUploads;
    if (typeof flush === 'function') {
      flush(savedStudent.id);
    }
    navigateToDirectory();
  };

  const handleTriggerEdit = (student: Student) => {
    navigateToEdit(student.id);
  };

  // Backward-compat wrappers so child components keep the same prop API
  // Phase 1: replace these with direct hook calls inside each component
  const handleAddLog = (
    action: string,
    category: 'Siswa' | 'Dokumen' | 'Hak Akses' | 'Google Drive' | 'Google Sheets',
    details: string,
  ) => {
    addLog.mutate({ action, category, details });
  };

  const handleAddNotification = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning',
  ) => {
    addNotification.mutate({ title, message, type });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">

      {/* 1. Sidebar Panel */}
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          navigateToDirectory();
          setCurrentView(view);
        }}
        selectedRole={selectedRole}
        driveStatus={driveStatus}
        sheetsStatus={sheetsStatus}
      />

      {/* 2. Main Workstage Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">

        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 shrink-0 flex items-center justify-between px-6 z-10 shadow-xs">

          {/* View Title */}
          <div className="flex items-center space-x-3">
            <span className="p-1 px-2.5 bg-slate-100 text-[10px] font-mono text-slate-500 rounded-md font-bold uppercase tracking-wider hidden sm:block">
              Arsip Sekolah
            </span>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base tracking-tight capitalize">
              {currentView === 'dashboard' && 'Dashboard Analisis'}
              {currentView === 'directory' && 'Arsip Kependudukan Murid'}
              {currentView === 'inputForm' && (editingStudent ? `Sunting: ${editingStudent.nama}` : 'Input Data Murid Baru')}
              {currentView === 'accessControl' && 'Manajemen Hak Akses & Kebijakan'}
              {currentView === 'activityLog' && 'Log Audit Aktivitas'}
            </h2>
          </div>

          {/* User profile, role switcher, notifications */}
          <div className="flex items-center space-x-4">

            {/* Active profile */}
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">{getActiveUserLabel(selectedRole)}</span>
              <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">{selectedRole}</span>
            </div>

            {/* Role switcher — only SUPER_ADMIN can simulate other roles */}
            {user?.role === 'SUPER_ADMIN' && (
              <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
                <span className="text-[10px] font-semibold text-slate-400 uppercase hidden md:inline">Opsi Peran:</span>
                <select
                  id="header-role-switcher"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value as RoleType)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Super Admin">🛡️ Admin</option>
                  <option value="Staff TU">📝 Staff TU</option>
                  <option value="Guru / Wali Kelas">👨‍🏫 Guru</option>
                </select>
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition disabled:opacity-50 border-l border-slate-200 pl-4"
              title="Keluar"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
            <NotificationCenter
              notifications={notifications}
              isOpen={notifCenterOpen}
              onToggleOpen={toggleNotifCenter}
              onMarkAllAsRead={() => markAllRead.mutate()}
              onClearNotification={(id) => clearNotif.mutate(id)}
            />
          </div>
        </header>

        {/* Scrollable View Panel */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">

          {currentView === 'dashboard' && (
            <DashboardView
              students={students}
              logs={logs}
              selectedRole={selectedRole}
              onViewChange={setCurrentView}
              onSyncGoogleSheets={handleSyncGoogleSheets}
              onBackupGoogleDrive={handleBackupGoogleDrive}
              isSyncingSheets={isSyncingSheets}
              isSyncingDrive={isSyncingDrive}
            />
          )}

          {currentView === 'directory' && (
            <StudentDirectoryView
              students={students}
              selectedRole={selectedRole}
              onUpdateStudents={(updated) => replaceStudents.mutate(updated)}
              onAddLog={handleAddLog}
              onAddNotification={handleAddNotification}
              onEditStudent={handleTriggerEdit}
            />
          )}

          {currentView === 'inputForm' && (
            <StudentFormView
              editingStudent={editingStudent}
              onSaveStudent={handleSaveStudent}
              onCancel={navigateToDirectory}
              selectedRole={selectedRole}
              onAddLog={handleAddLog}
              onAddNotification={handleAddNotification}
            />
          )}

          {currentView === 'accessControl' && (
            <SecurityAndAccessView
              selectedRole={selectedRole}
              onChangeSimulatedRole={setSimulatedRole}
              onAddLog={handleAddLog}
              onAddNotification={handleAddNotification}
            />
          )}

          {currentView === 'activityLog' && (
            <ActivityLogView
              logs={logs}
              onSyncGoogleSheets={handleSyncGoogleSheets}
              isSyncing={isSyncingSheets}
            />
          )}
        </main>
      </div>
    </div>
  );
}

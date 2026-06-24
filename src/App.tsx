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

import React, { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './lib/queryKeys';
import { getFriendlyErrorMessage } from './lib/error';

// Zustand stores (UI state — not server data)
import { useAuthStore } from './stores/auth.store';
import { useToastStore } from './stores/toast.store';
import { ToastContainer } from './components/ToastContainer';
import { useUIStore } from './stores/ui.store';
import type { AppView } from './stores/ui.store';
import { useSyncStore } from './stores/sync.store';
import { useStudentFormStore } from './stores/studentForm.store';

// React Query hooks
import { useSessionQuery, useLogoutMutation } from './hooks/useAuth';
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent, useReplaceStudents } from './hooks/useStudents';
import { useActivityLogs, useNotifications, useAddNotification, useMarkAllNotificationsRead, useClearNotification } from './hooks/useActivity';


// Types
import { Student, RoleType } from './types';

// Components
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import StudentDirectoryView from './components/StudentDirectoryView';
import StudentFormView from './components/StudentFormView';
import SecurityAndAccessView from './components/SecurityAndAccessView';
import ActivityLogView from './components/ActivityLogView';
import TrashView from './components/TrashView';
import NotificationCenter from './components/NotificationCenter';
import LoginView from './components/LoginView';
import ViewErrorBoundary from './components/ViewErrorBoundary';
import BackupRestoreView from './components/BackupRestoreView';
import { LogOut, Loader2 } from 'lucide-react';
import { userService } from './services/user.service';

const VIEW_REQUIRED_PERMISSIONS: Record<AppView, string[]> = {
  dashboard: ['dashboard.view'],
  directory: ['student.read'],
  inputForm: ['student.write'],
  trash: ['student.delete'],
  accessControl: ['user.manage', 'role.manage'],
  activityLog: ['logs.view'],
  backup: ['backup.manage'],
};

const isViewAllowed = (view: AppView, permissions: string[]): boolean => {
  const req = VIEW_REQUIRED_PERMISSIONS[view];
  if (!req) return false;
  return req.some((p) => permissions.includes(p));
};

export default function App() {
  const qc = useQueryClient();

  // ══ ALL HOOKS MUST BE CALLED UNCONDITIONALLY (Rules of Hooks) ══════════
  // Auth: session check + logout
  useSessionQuery();
  const { accessToken, isLoading, selectedRole, user, setSimulatedRole, actorName, permissions } = useAuthStore();
  const logoutMutation = useLogoutMutation();
  const addToast = useToastStore((state) => state.addToast);

  // Zustand: UI state
  const { currentView, setCurrentView, editingStudentId, navigateToEdit, navigateToDirectory } = useUIStore();
  const { notifCenterOpen, toggleNotifCenter, setNotifCenterOpen } = useSyncStore();

  // Redirect to dashboard if the current view is not allowed for the active role (prevents leaks/unauthorized view requests)
  React.useEffect(() => {
    if (!isLoading && accessToken && !isViewAllowed(currentView, permissions)) {
      setCurrentView('dashboard');
    }
  }, [isLoading, accessToken, permissions, currentView, setCurrentView]);

  // Load role permissions map for Super Admin to enable dynamic simulation access
  React.useEffect(() => {
    if (accessToken && user?.role === 'SUPER_ADMIN') {
      userService.getPermissions()
        .then((map) => {
          useAuthStore.getState().setRolePermissionsMap(map);
        })
        .catch(() => {});
    }
  }, [accessToken, user]);

  // React Query: server data
  const studentsQuery = useStudents();
  const students = studentsQuery.data?.data ?? [];
  const { data: logs = [], refetch: refetchLogs, isFetching: isFetchingLogs } = useActivityLogs();
  const { data: notifications = [] } = useNotifications();

  // Mutation hooks (addLog removed — Phase 2 audit log integrity)
  const addNotification = useAddNotification();
  const markAllRead = useMarkAllNotificationsRead();
  const clearNotif = useClearNotification();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const replaceStudents = useReplaceStudents();

  // ── Derived state ───────────────────────────────────────────────────────
  const editingStudent = useMemo(
    () => editingStudentId ? students.find((s) => s.id === editingStudentId) ?? null : null,
    [editingStudentId, students],
  );

  // ── Event handlers (must be before early returns — Rules of Hooks) ─────

  const handleRoleChange = useCallback((role: RoleType) => {
    setSimulatedRole(role);
    addNotification.mutate({
      title: 'Sesi Dirubah',
      message: `Sessi login browser berganti menjadi ${role}. Sistem menyelaraskan pembatasan enkripsi data.`,
      type: 'info',
    });
  }, [setSimulatedRole, addNotification]);



  const handleTriggerEdit = useCallback((student: Student) => {
    navigateToEdit(student.id);
  }, [navigateToEdit]);

  // handleAddLog removed — Phase 2 audit log integrity.
  // All audit logs are now created by backend services.

  const handleAddNotification = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning',
  ) => {
    addNotification.mutate({ title, message, type });
  }, [addNotification]);

  const handleSaveStudent = useCallback(async (savedStudent: Student) => {
    const isEdit = students.some((s) => s.id === savedStudent.id);
    const flush = useStudentFormStore.getState().flushPendingUploads;

    if (isEdit) {
      updateStudent.mutate(savedStudent, {
        onSuccess: async (saved) => {
          const uploadResult = await flush(saved.id);
          qc.invalidateQueries({ queryKey: queryKeys.students.all() });
          
          if (!uploadResult.success) {
            handleAddNotification(
              'Penyimpanan Sebagian',
              `Profil ${saved.nama} berhasil diperbarui, tetapi ${uploadResult.failedCount} dokumen gagal diunggah. Silakan periksa kembali berkas yang ditandai merah.`,
              'warning'
            );
            return;
          }

          handleAddNotification(
            'Profil Diperbarui',
            `Data siswa ${saved.nama} berhasil disimpan ke sistem arsip pusat ARBAL.`,
            'success'
          );
          useStudentFormStore.getState().clearForm();
          navigateToDirectory();
        },
        onError: (err: any) => {
          handleAddNotification(
            'Gagal Menyimpan',
            `Perubahan siswa gagal disimpan: ${getFriendlyErrorMessage(err)}`,
            'warning'
          );
        },
      });
    } else {
      createStudent.mutate(savedStudent, {
        onSuccess: async (created) => {
          const uploadResult = await flush(created.id);
          qc.invalidateQueries({ queryKey: queryKeys.students.all() });

          if (!uploadResult.success) {
            // Transition form to edit mode for the newly created student
            useUIStore.getState().setEditingStudentId(created.id);
            // Refresh form fields in store so it knows it is loaded from editing student
            useStudentFormStore.getState().setField('loadedStudentId', created.id);
            handleAddNotification(
              'Penyimpanan Sebagian',
              `Siswa ${created.nama} berhasil terdaftar, tetapi ${uploadResult.failedCount} dokumen gagal diunggah. Silakan periksa kembali berkas yang ditandai merah.`,
              'warning'
            );
            return;
          }

          handleAddNotification(
            'Siswa Terdaftar',
            `Data siswa ${created.nama} berhasil disimpan ke sistem arsip pusat ARBAL.`,
            'success'
          );
          useStudentFormStore.getState().clearForm();
          navigateToDirectory();
        },
        onError: (err: any) => {
          handleAddNotification(
            'Gagal Menyimpan',
            `Pendaftaran siswa gagal: ${getFriendlyErrorMessage(err)}`,
            'warning'
          );
        },
      });
    }
  }, [students, updateStudent, createStudent, qc, handleAddNotification, navigateToDirectory]);

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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">

      {/* 1. Sidebar Panel */}
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          navigateToDirectory();
          setCurrentView(view);
        }}
        permissions={permissions}
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
              {currentView === 'backup' && 'Pusat Backup & Pencadangan Data'}
            </h2>
          </div>

          {/* User profile, role switcher, notifications */}
          <div className="flex items-center space-x-4">

            {/* Active profile */}
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">{actorName}</span>
              <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">{selectedRole}</span>
            </div>

            {/* Role switcher — only SUPER_ADMIN can simulate other roles */}
            {user?.role === 'SUPER_ADMIN' && (
              <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
                <span className="text-[10px] font-semibold text-slate-400 uppercase hidden md:inline">Simulasi Peran:</span>
                <select
                  id="header-role-switcher"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value as RoleType)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Super Admin">🛡️ Admin</option>
                  <option value="Guru / Wali Kelas">👨‍🏫 Guru</option>
                  <option value="Kepala Sekolah">💼 Kepsek</option>
                  <option value="Tata Usaha">📝 TU</option>
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
            <ViewErrorBoundary viewName="Dashboard">
              <DashboardView
                students={students}
                logs={logs}
                selectedRole={selectedRole}
                onViewChange={setCurrentView}
              />
            </ViewErrorBoundary>
          )}

          {currentView === 'directory' && (
            <ViewErrorBoundary viewName="Direktori Siswa">
              <StudentDirectoryView
                students={students}
                selectedRole={selectedRole}
                onUpdateStudents={(updated) => replaceStudents.mutate(updated)}
                onAddNotification={handleAddNotification}
                onEditStudent={handleTriggerEdit}
                onDeleteStudent={(id) => deleteStudent.mutate(id)}
              />
            </ViewErrorBoundary>
          )}

          {currentView === 'inputForm' && (
            <ViewErrorBoundary viewName="Form Siswa">
              <StudentFormView
                editingStudent={editingStudent}
                onSaveStudent={handleSaveStudent}
                onCancel={navigateToDirectory}
                selectedRole={selectedRole}
                onAddNotification={handleAddNotification}
                isSaving={createStudent.isPending || updateStudent.isPending}
              />
            </ViewErrorBoundary>
          )}

          {currentView === 'trash' && (
            <ViewErrorBoundary viewName="Tempat Sampah">
              <TrashView />
            </ViewErrorBoundary>
          )}

          {currentView === 'accessControl' && (
            <ViewErrorBoundary viewName="Manajemen Akses">
              <SecurityAndAccessView
                selectedRole={selectedRole}
                onAddNotification={handleAddNotification}
              />
            </ViewErrorBoundary>
          )}

          {currentView === 'activityLog' && (
            <ViewErrorBoundary viewName="Log Aktivitas">
              <ActivityLogView
                logs={logs}
                onRefresh={refetchLogs}
                isRefreshing={isFetchingLogs}
              />
            </ViewErrorBoundary>
          )}

          {currentView === 'backup' && (
            <ViewErrorBoundary viewName="Pusat Backup">
              <BackupRestoreView />
            </ViewErrorBoundary>
          )}
        </main>
        <ToastContainer />
      </div>
    </div>
  );
}

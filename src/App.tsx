/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Menu, 
  UserCircle2, 
  HelpCircle, 
  CloudCheck,
  Workflow,
  Sparkles,
  Database
} from 'lucide-react';

// Import Types
import { Student, RoleType, ActivityLog, SystemNotification } from './types';

// Import Mock Data
import { 
  INITIAL_STUDENTS, 
  INITIAL_LOGS, 
  INITIAL_NOTIFICATIONS 
} from './mockData';

// Import Components
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import StudentDirectoryView from './components/StudentDirectoryView';
import StudentFormView from './components/StudentFormView';
import SecurityAndAccessView from './components/SecurityAndAccessView';
import ActivityLogView from './components/ActivityLogView';
import NotificationCenter from './components/NotificationCenter';

export default function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<string>('dashboard');
  
  // Selected simulation role (defaults to Super Admin for immediate testing)
  const [selectedRole, setSelectedRole] = useState<RoleType>('Super Admin');

  // Core Application Lists maintained in state
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);

  // Focus/Editing Student reference
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Connections Sync States
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState<'connected' | 'error' | 'syncing'>('connected');
  const [sheetsStatus, setSheetsStatus] = useState<'connected' | 'error' | 'syncing'>('connected');

  // Notification center visible
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);

  // Helper: Append a new Activity Log
  const handleAddLog = (
    action: string, 
    category: 'Siswa' | 'Dokumen' | 'Hak Akses' | 'Google Drive' | 'Google Sheets', 
    details: string
  ) => {
    let actorName = 'Sistem';
    if (selectedRole === 'Super Admin') actorName = 'Drs. H. Mulyono';
    else if (selectedRole === 'Staff TU') actorName = 'Rina Herawati, S.Pd';
    else if (selectedRole === 'Guru / Wali Kelas') actorName = 'Asep Saepudin, M.Pd';

    const newLog: ActivityLog = {
      id: `L00${logs.length + 1}_${Date.now().toString().substring(10)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actorName,
      actorRole: selectedRole,
      action,
      category,
      details
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Helper: Append a new System Notification
  const handleAddNotification = (
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'warning'
  ) => {
    const newNotif: SystemNotification = {
      id: `NOTIF_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      title,
      message,
      type,
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    // Auto-open notification drawer for major warnings
    if (type === 'warning') {
      setNotifCenterOpen(true);
    }
  };

  // Trigger: Sync to Google Sheets
  const handleSyncGoogleSheets = () => {
    if (selectedRole === 'Guru / Wali Kelas') {
      alert('Maaf, peran Guru / Wali Kelas tidak memiliki izin menyelaraskan data kementerian.');
      return;
    }

    setIsSyncingSheets(true);
    setSheetsStatus('syncing');

    setTimeout(() => {
      setIsSyncingSheets(false);
      setSheetsStatus('connected');
      
      handleAddLog(
        'Sinkronisasi Manual',
        'Google Sheets',
        `Sinkronisasi ${students.length} data biodata siswa aktif ke spreadhseet Kesiswaan Pusat.`
      );

      handleAddNotification(
        'Sinkronisasi Excel Sukses',
        `Koneksi lembar kesiswaan Google Sheets berhasil menyelaraskan ${students.length} baris data otomatis.`,
        'success'
      );
    }, 1800);
  };

  // Trigger: Backup to Google Drive
  const handleBackupGoogleDrive = () => {
    if (selectedRole === 'Guru / Wali Kelas') {
      alert('Hanya Administrator atau Pengelola Tata Usaha yang diizinkan memicu pencadangan eksternal.');
      return;
    }

    setIsSyncingDrive(true);
    setDriveStatus('syncing');

    setTimeout(() => {
      setIsSyncingDrive(false);
      setDriveStatus('connected');

      let totalUploadedFiles = 0;
      students.forEach(s => totalUploadedFiles += s.documents.length);

      handleAddLog(
        'Pencadangan Arsip',
        'Google Drive',
        `Berhasil menyinkronkan seluruh berkas draf siswa (${totalUploadedFiles} file) ke folder Google Drive Terenkripsi Sekolah.`
      );

      handleAddNotification(
        'Pencadangan Berhasil',
        `Seluruh berkas arsip digital (${totalUploadedFiles} dokumen) berhasil diamankan di penyimpanan cloud terpusat.`,
        'success'
      );
    }, 1850);
  };

  // Notification Operations
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Form Saves (Add or Edit)
  const handleSaveStudent = (savedStudent: Student) => {
    const isEdit = students.some(s => s.id === savedStudent.id);
    let updatedList: Student[];

    if (isEdit) {
      updatedList = students.map(s => s.id === savedStudent.id ? savedStudent : s);
    } else {
      updatedList = [savedStudent, ...students];
    }

    setStudents(updatedList);
    setEditingStudent(null);
    setCurrentView('directory'); // switch to directory view to review changes
  };

  const handleTriggerEdit = (student: Student) => {
    setEditingStudent(student);
    setCurrentView('inputForm'); // switch layout to the edit/creation tab
  };

  // Get active user text label
  const getActiveUserLabel = () => {
    if (selectedRole === 'Super Admin') return 'Drs. H. Mulyono (Kepala Sekolah)';
    if (selectedRole === 'Staff TU') return 'Rina Herawati, S.Pd (Waka. Kesiswaan/TU)';
    return 'Asep Saepudin, M.Pd (Wali Kelas XII RPL)';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      
      {/* 1. Sidebar Panel */}
      <Sidebar 
        currentView={currentView}
        onViewChange={(view) => {
          setEditingStudent(null);
          setCurrentView(view);
        }}
        selectedRole={selectedRole}
        driveStatus={driveStatus}
        sheetsStatus={sheetsStatus}
      />

      {/* 2. Main Workstage Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        
        {/* Top Header / Branding Nav */}
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

          {/* User profile details, Role simulator & Notifications */}
          <div className="flex items-center space-x-4">
            
            {/* Active profile (displays simulated staff member name) */}
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">{getActiveUserLabel()}</span>
              <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">{selectedRole}</span>
            </div>

            {/* Quick switcher for easy testing of permissions */}
            <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
              <span className="text-[10px] font-semibold text-slate-400 uppercase hidden md:inline">Opsi Peran:</span>
              <select
                id="header-role-switcher"
                value={selectedRole}
                onChange={(e) => {
                  const roleValue = e.target.value as RoleType;
                  setSelectedRole(roleValue);
                  setEditingStudent(null);
                  
                  handleAddLog(
                    'Peralihan Akun', 
                    'Hak Akses', 
                    `Sesi portal berubah menjadi modus peran ${roleValue}.`
                  );
                  handleAddNotification(
                    'Sesi Dirubah', 
                    `Sessi login browser berganti menjadi ${roleValue}. Sistem menyelaraskan pembatasan enkripsi data.`, 
                    'info'
                  );
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold py-1.5 px-2.5 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Super Admin">🛡️ Admin</option>
                <option value="Staff TU">📝 Staff TU</option>
                <option value="Guru / Wali Kelas">👨‍🏫 Guru</option>
              </select>
            </div>

            {/* Notifications Bell Dropdown */}
            <NotificationCenter 
              notifications={notifications}
              isOpen={notifCenterOpen}
              onToggleOpen={() => setNotifCenterOpen(!notifCenterOpen)}
              onMarkAllAsRead={handleMarkAllAsRead}
              onClearNotification={handleClearNotification}
            />
          </div>
        </header>

        {/* Scrollable View Panel */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          
          {/* Enforce Single Screen Routing view */}
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
              onUpdateStudents={setStudents}
              onAddLog={handleAddLog}
              onAddNotification={handleAddNotification}
              onEditStudent={handleTriggerEdit}
            />
          )}

          {currentView === 'inputForm' && (
            <StudentFormView 
              editingStudent={editingStudent}
              onSaveStudent={handleSaveStudent}
              onCancel={() => {
                setEditingStudent(null);
                setCurrentView('directory');
              }}
              selectedRole={selectedRole}
              onAddLog={handleAddLog}
              onAddNotification={handleAddNotification}
            />
          )}

          {currentView === 'accessControl' && (
            <SecurityAndAccessView 
              selectedRole={selectedRole}
              onChangeSimulatedRole={setSelectedRole}
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

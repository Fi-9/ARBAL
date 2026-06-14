/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  ShieldAlert, 
  History, 
  Database,
  CloudLightning,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { RoleType } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  selectedRole: RoleType;
  driveStatus: 'connected' | 'error' | 'syncing';
  sheetsStatus: 'connected' | 'error' | 'syncing';
}

export default function Sidebar({ 
  currentView, 
  onViewChange, 
  selectedRole,
  driveStatus,
  sheetsStatus
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dasbor Utama', icon: LayoutDashboard, minRole: 'Guru / Wali Kelas' },
    { id: 'directory', label: 'Arsip Data Siswa', icon: Users, minRole: 'Guru / Wali Kelas' },
    { id: 'inputForm', label: 'Input Data Siswa', icon: UserPlus, minRole: 'Staff TU' },
    { id: 'accessControl', label: 'Manajemen Akses', icon: ShieldAlert, minRole: 'Super Admin' },
    { id: 'activityLog', label: 'Log Aktivitas', icon: History, minRole: 'Staff TU' },
  ];

  // Helper is role allowed to see this tab
  const getRoleLevel = (r: RoleType): number => {
    if (r === 'Super Admin') return 3;
    if (r === 'Staff TU') return 2;
    return 1;
  };

  const getMinRoleLevel = (roleName: string): number => {
    if (roleName === 'Super Admin') return 3;
    if (roleName === 'Staff TU') return 2;
    return 1;
  };

  const isAllowed = (minRole: string) => {
    return getRoleLevel(selectedRole) >= getMinRoleLevel(minRole);
  };

  return (
    <aside id="main-sidebar" className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-bold shadow-md shadow-emerald-500/10">
          <Database size={20} />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight tracking-tight text-white">ARBAL</h1>
          <p className="text-[11px] text-emerald-400 font-medium leading-none mt-0.5">Arsip Mustaqbal</p>
          <p className="text-[8px] text-slate-500 font-normal leading-none mt-1 uppercase tracking-wider">PKBM Teknologi Mustaqbal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-2">MENU UTAMA</p>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const allowed = isAllowed(item.minRole);
          const active = currentView === item.id;

          if (!allowed) {
            return (
              <div 
                key={item.id} 
                className="flex items-center space-x-3 px-3 py-2.5 text-xs text-slate-600 cursor-not-allowed select-none bg-slate-950/20 rounded-md"
                title={`Hanya untuk peran: ${item.minRole} ke atas`}
              >
                <IconComponent size={16} />
                <span>{item.label}</span>
                <span className="ml-auto text-[8px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase">Locked</span>
              </div>
            );
          }

          return (
            <button
              id={`sidebar-link-${item.id}`}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                active 
                  ? 'bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-600/15' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <IconComponent size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Connection Widgets for Google Drive & Google Sheets */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
        <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-3 flex items-center gap-1">
          <CloudLightning size={10} className="text-amber-400" />
          Koneksi Cloud Workspace
        </p>
        
        <div className="space-y-2.5">
          {/* Google Drive Connection */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Google Drive (Arsip)
            </span>
            <div className="flex items-center">
              {driveStatus === 'connected' && (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Terhubung
                </span>
              )}
              {driveStatus === 'syncing' && (
                <span className="text-[10px] text-amber-400 font-medium animate-pulse flex items-center gap-1">
                  Sinkron...
                </span>
              )}
              {driveStatus === 'error' && (
                <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> Gagal
                </span>
              )}
            </div>
          </div>

          {/* Google Sheets Connection */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Google Sheets (Database)
            </span>
            <div className="flex items-center">
              {sheetsStatus === 'connected' && (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Terhubung
                </span>
              )}
              {sheetsStatus === 'syncing' && (
                <span className="text-[10px] text-amber-400 font-medium animate-pulse flex items-center gap-1">
                  Sinkron...
                </span>
              )}
              {sheetsStatus === 'error' && (
                <span className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> Gagal
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Integration Note */}
        <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">
          Semua unggahan dokumen otomatis ter-arsip ke Drive utama sekolah, dan perubahan siswa otomatis ter-sinkronisasi ke Google Sheets terpilih.
        </div>
      </div>
    </aside>
  );
}

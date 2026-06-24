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
  Trash2
} from 'lucide-react';
import { RoleType } from '../types';

interface SidebarProps {
  currentView: import('../stores/ui.store').AppView;
  onViewChange: (view: import('../stores/ui.store').AppView) => void;
  permissions: string[];
}

export default function Sidebar({
  currentView,
  onViewChange,
  permissions = [],
}: SidebarProps) {

  const menuItems: Array<{ id: import('../stores/ui.store').AppView; label: string; icon: React.ComponentType<any>; requiredPermissions: string[] }> = [
    { id: 'dashboard', label: 'Dasbor Utama', icon: LayoutDashboard, requiredPermissions: ['dashboard.view'] },
    { id: 'directory', label: 'Arsip Data Siswa', icon: Users, requiredPermissions: ['student.read'] },
    { id: 'inputForm', label: 'Input Data Siswa', icon: UserPlus, requiredPermissions: ['student.write'] },
    { id: 'trash', label: 'Sampah (Trash Bin)', icon: Trash2, requiredPermissions: ['student.delete'] },
    { id: 'accessControl', label: 'Manajemen Akses', icon: ShieldAlert, requiredPermissions: ['user.manage', 'role.manage'] },
    { id: 'activityLog', label: 'Log Aktivitas', icon: History, requiredPermissions: ['logs.view'] },
    { id: 'backup', label: 'Pengaturan Backup', icon: Database, requiredPermissions: ['backup.manage'] },
  ];

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
          const allowed = item.requiredPermissions.some((p) => permissions.includes(p));
          const active = currentView === item.id;

          if (!allowed) {
            return null;
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

    </aside>
  );
}

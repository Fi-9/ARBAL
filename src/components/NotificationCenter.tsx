/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Bell, 
  Check, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  X
} from 'lucide-react';
import { SystemNotification } from '../types';

interface NotificationCenterProps {
  notifications: SystemNotification[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onMarkAllAsRead: () => void;
  onClearNotification: (id: string) => void;
}

export default function NotificationCenter({
  notifications,
  isOpen,
  onToggleOpen,
  onMarkAllAsRead,
  onClearNotification
}: NotificationCenterProps) {

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div id="notification-center" className="relative">
      {/* Bell Trigger button */}
      <button
        id="btn-bell-notification"
        onClick={onToggleOpen}
        className="relative bg-slate-100 hover:bg-slate-200 p-2 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center justify-center border border-slate-200"
        title="Pusat Notifikasi Aktivitas"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card panel */}
      {isOpen && (
        <div 
          id="notification-dropdown" 
          className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col"
          style={{ maxHeight: '420px' }}
        >
          {/* Dropdown Header */}
          <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell size={16} className="text-emerald-400" />
              <span className="font-extrabold text-xs tracking-wide uppercase">Notifikasi Sistem</span>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline transition"
              >
                Tandai Semua Dibaca
              </button>
            )}
          </div>

          {/* List panel */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                <Bell size={28} className="mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">Arsip Pemberitahuan Bersih</p>
                <p>Belum ada pengumuman sistem baru saat ini.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                return (
                  <div 
                    key={notif.id} 
                    className={`p-3.5 flex items-start space-x-3 text-xs leading-relaxed transition ${
                      notif.read ? 'bg-white opacity-85' : 'bg-slate-50/70 border-l-2 border-emerald-500'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="shrink-0 mt-0.5">
                      {notif.type === 'success' && <CheckCircle2 size={15} className="text-emerald-500" />}
                      {notif.type === 'warning' && <AlertTriangle size={15} className="text-amber-500" />}
                      {notif.type === 'info' && <Info size={15} className="text-blue-500" />}
                    </div>

                    {/* Content text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 tracking-tight">{notif.title}</span>
                        <span className="text-[9px] font-mono text-slate-400">{notif.timestamp.split(' ')[1]}</span>
                      </div>
                      <p className="text-slate-600 mt-1 font-normal text-[11px] leading-relaxed">{notif.message}</p>
                    </div>

                    {/* Clear action */}
                    <button
                      onClick={() => onClearNotification(notif.id)}
                      className="text-slate-300 hover:text-slate-500 transition shrink-0 p-0.5"
                      title="Bersihkan"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-slate-50 p-2.5 text-center text-[10px] text-slate-400 border-t border-slate-100">
            Notifikasi diperbarui otomatis setiap kali tindakan terjadi.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useToastStore, ToastItem } from '../stores/toast.store';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const Toast: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const removeToast = useToastStore((state) => state.removeToast);
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    // Trigger slide-in transition on mount
    const showTimeout = setTimeout(() => setIsShowing(true), 20);

    // Auto close timeout
    const autoCloseTimeout = setTimeout(() => {
      setIsShowing(false);
      // Wait for exit transition before removing from store
      setTimeout(() => {
        removeToast(toast.id);
      }, 300);
    }, toast.duration || 4000);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(autoCloseTimeout);
    };
  }, [toast, removeToast]);

  const handleClose = () => {
    setIsShowing(false);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300);
  };

  const config = {
    success: {
      bg: 'bg-emerald-50/95 border-emerald-500 text-emerald-900 shadow-emerald-100/50',
      icon: <CheckCircle className="text-emerald-500 flex-shrink-0" size={18} />,
    },
    error: {
      bg: 'bg-rose-50/95 border-rose-500 text-rose-900 shadow-rose-100/50',
      icon: <XCircle className="text-rose-500 flex-shrink-0" size={18} />,
    },
    warning: {
      bg: 'bg-amber-50/95 border-amber-500 text-amber-900 shadow-amber-100/50',
      icon: <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />,
    },
    info: {
      bg: 'bg-sky-50/95 border-sky-500 text-sky-900 shadow-sky-100/50',
      icon: <Info className="text-sky-500 flex-shrink-0" size={18} />,
    },
  }[toast.type];

  return (
    <div
      className={`flex items-start p-4 mb-3 border-l-4 rounded-xl shadow-lg transition-all duration-300 transform backdrop-blur-sm ${
        isShowing ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95'
      } ${config.bg} max-w-sm w-full`}
    >
      <div className="mr-3 mt-0.5">{config.icon}</div>
      <div className="flex-1 text-xs font-semibold pr-2 break-words leading-relaxed">
        {toast.message}
      </div>
      <button
        onClick={handleClose}
        className="text-slate-400 hover:text-slate-700 transition flex-shrink-0 ml-1 rounded-full hover:bg-black/5 p-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col items-end w-full max-w-sm pointer-events-none">
      <div className="pointer-events-auto w-full flex flex-col items-end">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
};

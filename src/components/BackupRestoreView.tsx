/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToastStore } from '../stores/toast.store';
import { getFriendlyErrorMessage } from '../lib/error';

// ... ( Lucide imports etc remain unchanged )
import { 
  Database, 
  Plus, 
  Download, 
  Trash2, 
  Loader2, 
  Calendar, 
  HardDrive, 
  Clock, 
  ShieldAlert, 
  FileArchive,
  RefreshCw,
  X,
  AlertTriangle
} from 'lucide-react';

interface BackupItem {
  fileName: string;
  sizeBytes: number;
  sizeMB: number;
  createdAt: string;
}

interface BackupResponse {
  backups: BackupItem[];
  lastBackupAt: string | null;
  totalSizeMB: number;
  uploadsSizeMB?: number;
  backupsSizeMB?: number;
  freeSpaceBytes?: number;
}

export default function BackupRestoreView() {
  const addToast = useToastStore((state) => state.addToast);
  const qc = useQueryClient();
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  
  // Custom confirmation modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null);

  // Fetch backups and metrics
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<BackupResponse>({
    queryKey: ['backups'],
    queryFn: async () => {
      const response = await api.get<BackupResponse>('/backup');
      return response.data;
    },
  });

  // Create manual backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/backup');
      return response.data;
    },
    onSuccess: () => {
      addToast('Backup berhasil dibuat dan disimpan di server.', 'success');
      qc.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (err: any) => {
      addToast(`Error: ${getFriendlyErrorMessage(err)}`, 'warning');
    }
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const response = await api.delete(`/backup/${fileName}`);
      return response.data;
    },
    onSuccess: () => {
      addToast('File backup berhasil dihapus dari server.', 'success');
      qc.invalidateQueries({ queryKey: ['backups'] });
    },
    onError: (err: any) => {
      addToast(`Error: ${getFriendlyErrorMessage(err)}`, 'warning');
    }
  });

  // Format bytes to human readable sizes
  const formatSize = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  // Format free space bytes
  const formatFreeSpace = (bytes: number) => {
    if (!bytes) return '-';
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  // Format date time helper
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      
      const pad = (n: number) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      const seconds = pad(d.getSeconds());

      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return '-';
    }
  };

  // Handle download file with friendly naming convention
  const handleDownload = async (fileName: string) => {
    setDownloadingFile(fileName);
    try {
      console.log('Downloading file:', fileName);
      const response = await api.get(`/backup/download/${fileName}`, { responseType: 'blob' });
      
      // Parse YYYY-MM-DD_HH-mm naming from original file name timestamp
      // Format is: arbal-backup-(daily|weekly|monthly|manual)-YYYY-MM-DDTHH-mm-ss-msZ.zip
      const match = fileName.match(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3}Z)/);
      let friendlyName = fileName;
      if (match) {
        const isoString = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}`;
        try {
          const date = new Date(isoString);
          const pad = (n: number) => String(n).padStart(2, '0');
          const year = date.getFullYear();
          const month = pad(date.getMonth() + 1);
          const day = pad(date.getDate());
          const hours = pad(date.getHours());
          const minutes = pad(date.getMinutes());
          friendlyName = `ARBAL_BACKUP_${year}-${month}-${day}_${hours}-${minutes}.zip`;
        } catch (e) {
          console.error('Error parsing date for friendlyName:', e);
        }
      }

      // Force application/zip type by wrapping response.data
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = friendlyName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      // Defer revocation by 60 seconds to ensure Chrome has time to stream and write the file
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);

      addToast(`File ${friendlyName} berhasil diunduh.`, 'success');
    } catch (err: any) {
      console.error('Download error:', err);
      addToast(`Gagal mengunduh file backup: ${getFriendlyErrorMessage(err)}`, 'warning');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDelete = (fileName: string) => {
    setBackupToDelete(fileName);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (backupToDelete) {
      deleteBackupMutation.mutate(backupToDelete);
    }
    setIsConfirmOpen(false);
    setBackupToDelete(null);
  };

  const backupsList = data?.backups || [];
  const lastBackupAt = data?.lastBackupAt || null;
  const backupsSizeMB = data?.backupsSizeMB || data?.totalSizeMB || 0;
  const uploadsSizeMB = data?.uploadsSizeMB || 0;
  const freeSpaceBytes = data?.freeSpaceBytes || 0;

  return (
    <div id="backup-restore-view" className="space-y-6">
      
      {/* Alert Warning for security */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-800 shadow-xs">
        <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="font-bold text-amber-950">Informasi Keamanan Penting</h4>
          <p className="mt-1 leading-relaxed text-slate-600 font-normal">
            Fitur **Restore** database sengaja dinonaktifkan dari panel UI ini untuk mencegah kegagalan data akibat salah klik oleh pengguna. Pemulihan database hanya diizinkan melalui baris perintah (**CLI**) or sistem administrasi server oleh personil IT yang berwenang.
          </p>
        </div>
      </div>

      {/* Metrics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        
        {/* Backups Storage Size */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Penyimpanan Backup</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{isLoading ? '-' : formatSize(backupsSizeMB)}</h3>
            <p className="text-xs text-slate-500 mt-1">Total: {backupsList.length} File ZIP</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg shrink-0">
            <HardDrive size={22} />
          </div>
        </div>

        {/* Uploads Directory Size */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direktori Unggahan</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{isLoading ? '-' : formatSize(uploadsSizeMB)}</h3>
            <p className="text-xs text-slate-500 mt-1">Berkas digital kesiswaan</p>
          </div>
          <div className="bg-blue-50 text-blue-500 p-3 rounded-lg shrink-0">
            <FileArchive size={22} />
          </div>
        </div>

        {/* Disk Free Space */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kapasitas Disk Sisa</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{isLoading ? '-' : formatFreeSpace(freeSpaceBytes)}</h3>
            <p className="text-xs text-slate-500 mt-1">Ruang kosong di server</p>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-lg shrink-0">
            <Database size={22} />
          </div>
        </div>

        {/* Last Backup Time */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Backup Terakhir</p>
            <h3 className="text-sm font-bold text-slate-800 mt-2.5 truncate max-w-[160px]">
              {isLoading ? '-' : formatDateTime(lastBackupAt)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Otomasi daily: 01.00 WIB</p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg shrink-0">
            <Clock size={22} />
          </div>
        </div>

      </div>

      {/* Main Operations Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Card Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Riwayat Berkas Cadangan</h3>
            <p className="text-xs text-slate-500">Daftar file arsip terkompresi ZIP yang dapat diunduh untuk disimpan secara offline.</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition disabled:opacity-50"
              title="Perbarui daftar"
            >
              <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
            </button>
            <button
              id="btn-create-backup"
              onClick={() => createBackupMutation.mutate()}
              disabled={createBackupMutation.isPending || isLoading}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-sm disabled:opacity-50"
            >
              {createBackupMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              <span>Buat Backup Baru</span>
            </button>
          </div>
        </div>

        {/* Content table */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Loader2 size={24} className="animate-spin mx-auto text-emerald-500" />
            <p>Memuat daftar file backup...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <ShieldAlert size={36} className="mx-auto text-rose-300" />
            <p className="font-bold text-rose-600">Gagal Memuat Data</p>
            <p>Silakan hubungi administrator jaringan jika masalah berlanjut.</p>
          </div>
        ) : backupsList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Database size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">Belum ada file backup tersedia</p>
            <p>Klik tombol di atas untuk membuat backup database manual pertama Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Nama Berkas Cadangan</th>
                  <th className="p-4">Tanggal Pembuatan</th>
                  <th className="p-4 text-center">Ukuran File</th>
                  <th className="p-4 text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {backupsList.map((item) => (
                  <tr key={item.fileName} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6 font-mono font-bold text-slate-700">
                      {item.fileName}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center space-x-2">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center text-slate-700 font-medium">
                      {formatSize(item.sizeMB)}
                    </td>
                    <td className="p-4 text-right pr-6 whitespace-nowrap">
                      <div className="inline-flex items-center space-x-2">
                        <button
                          onClick={() => handleDownload(item.fileName)}
                          disabled={downloadingFile !== null}
                          className="bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 p-2 rounded-lg border border-slate-200 hover:border-emerald-200 transition disabled:opacity-50 flex items-center space-x-1"
                          title="Unduh Berkas ZIP"
                        >
                          {downloadingFile === item.fileName ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          <span className="text-[10px] font-bold">Unduh</span>
                        </button>
                        
                        <button
                          onClick={() => handleDelete(item.fileName)}
                          disabled={deleteBackupMutation.isPending}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-2 rounded-lg border border-rose-100 transition disabled:opacity-50"
                          title="Hapus Backup dari Disk"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Premium Custom Delete Confirmation Modal */}
      {isConfirmOpen && (
        <div id="delete-backup-confirm-modal" className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden text-slate-800 border border-slate-200 shadow-2xl flex flex-col">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-650 font-bold text-sm">
                <AlertTriangle size={18} className="text-rose-500 shrink-0" />
                <span>Konfirmasi Hapus Cadangan</span>
              </div>
              <button 
                onClick={() => { setIsConfirmOpen(false); setBackupToDelete(null); }} 
                className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                Apakah Anda yakin ingin menghapus berkas cadangan berikut secara permanen dari server? Tindakan ini <strong className="text-rose-600 font-semibold">tidak dapat dibatalkan</strong>.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 font-mono text-[11px] font-bold text-slate-700 break-all select-all flex items-center space-x-2">
                <Database size={14} className="text-slate-400 shrink-0" />
                <span>{backupToDelete}</span>
              </div>
            </div>
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2.5 text-xs font-bold">
              <button
                onClick={() => { setIsConfirmOpen(false); setBackupToDelete(null); }}
                className="px-4.5 py-2.5 bg-slate-200 hover:bg-slate-350 text-slate-750 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteBackupMutation.isPending}
                className="px-4.5 py-2.5 bg-rose-650 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl transition shadow-sm hover:shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                {deleteBackupMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                <span>Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

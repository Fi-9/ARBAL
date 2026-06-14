/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  DownloadCloud, 
  RefreshCw, 
  CheckCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityLogViewProps {
  logs: ActivityLog[];
  onSyncGoogleSheets: () => void;
  isSyncing: boolean;
}

export default function ActivityLogView({
  logs,
  onSyncGoogleSheets,
  isSyncing
}: ActivityLogViewProps) {

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Filter logs list
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || log.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="activity-log-view" className="space-y-6">
      {/* Search and Filters panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Log Aktivitas Sistem</h3>
            <p className="text-xs text-slate-500">
              Audit log rincian mencatat seluruh perubahan data siswa, dokumen digital, atau sinkronisasi eksternal demi akuntabilitas pengarsipan.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Sync Sheets button */}
            <button
              id="btn-sync-logs-sheets"
              onClick={onSyncGoogleSheets}
              disabled={isSyncing}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 transition"
              title="Cadangkan seluruh aktivitas ini ke Spreadsheet Google"
            >
              <FileSpreadsheet size={14} className={isSyncing ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
              <span>{isSyncing ? 'Penyelarasan...' : 'Sinkron Excel (Sheets)'}</span>
            </button>

            {/* Export local file */}
            <button
              onClick={() => alert('Mengunduh Laporan Log Aktivitas Terenkripsi (Format CSV) ke komputer Anda.')}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-md hover:shadow-emerald-600/10"
              title="Ekspor sebagai laporan resmi sekolah"
            >
              <DownloadCloud size={14} />
              <span>Ekspor PDF/CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="search-logs"
              type="text"
              placeholder="Cari Operator, Aksi, Kronologis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Category Selector */}
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              id="filter-logs-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 appearance-none transition-colors"
            >
              <option value="Semua">Semua Kategori Aktivitas</option>
              <option value="Siswa">Kategori: Siswa (Profil/Data)</option>
              <option value="Dokumen">Kategori: Dokumen (Unggah/Verifikasi)</option>
              <option value="Hak Akses">Kategori: Hak Akses (Izin Portal)</option>
              <option value="Google Drive">Kategori: Google Drive (Pemberkasan Cloud)</option>
              <option value="Google Sheets">Kategori: Google Sheets (Spreadsheets)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Logs Listing */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">Tidak ada audit log aktivitas yang dicatat</p>
            <p className="mt-1">Coba kurangi saringan kata pencarian Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-4 w-48">Waktu & Tanggal</th>
                  <th className="p-4">Bidang/Modul</th>
                  <th className="p-4">Operasional / Tindakan</th>
                  <th className="p-4">Rincian Perubahan</th>
                  <th className="p-4 text-right">Oleh Pelaku</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40 transition">
                    <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.category === 'Siswa' ? 'bg-indigo-50 text-indigo-700' :
                        log.category === 'Dokumen' ? 'bg-amber-50 text-amber-700' :
                        log.category === 'Hak Akses' ? 'bg-purple-50 text-purple-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="p-4 text-slate-600 leading-relaxed max-w-sm">
                      {log.details}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <p className="font-bold text-slate-800">{log.actorName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{log.actorRole}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Filter,
  DownloadCloud,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight
} from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityLogViewProps {
  logs: ActivityLog[];
}

/** Parse before/after JSON from log details if present.
 *  Supports format: "Some text. Changes: {\"before\":{...},\"after\":{...}}"
 *  Also tries to parse the entire details string as JSON as a fallback.
 */
function parseAuditDetails(details: string): { before?: Record<string, any>; after?: Record<string, any> } | null {
  try {
    // Primary: extract JSON after "Changes:" marker
    const match = details.match(/Changes:\s*(\{.*\})$/s);
    if (match) {
      const parsed = JSON.parse(match[1]);
      if (parsed.before || parsed.after) return parsed;
    }
    // Fallback: try parsing entire details as JSON (for future formats)
    if (details.startsWith('{')) {
      const parsed = JSON.parse(details);
      if (parsed.before || parsed.after) return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Human-readable field labels for audit diff display */
const FIELD_LABELS: Record<string, string> = {
  nama: 'Nama',
  nisSekolah: 'NIS Sekolah',
  registrationNumber: 'No. Registrasi',
  kelas: 'Kelas',
  jurusan: 'Jurusan',
  status: 'Status',
  graduationYear: 'Tahun Lulus',
  certificateNumber: 'No. Ijazah',
  namaAyah: 'Nama Ayah',
  namaIbu: 'Nama Ibu',
  originalName: 'Nama File',
  type: 'Tipe Dokumen',
  deletedAt: 'Dihapus Pada',
  mimeType: 'Tipe MIME',
  sizeBytes: 'Ukuran',
};

/** Map backend enum values to human-readable labels */
const ENUM_LABELS: Record<string, string> = {
  VERIFIKASI: 'Menunggu Verifikasi',
  TERARSIP: 'Terarsip',
  DITOLAK: 'Ditolak',
  AKTIF: 'Aktif',
  ALUMNI: 'Alumni',
  PINDAHAN: 'Pindahan',
  NON_AKTIF: 'Non-Aktif',
  IJAZAH: 'Ijazah',
  KARTU_KELUARGA: 'Kartu Keluarga',
  AKTA_KELAHIRAN: 'Akta Kelahiran',
  PAS_FOTO: 'Pas Foto',
  RAPOR: 'Rapor',
  KTP_AYAH: 'KTP Ayah',
  KTP_IBU: 'KTP Ibu',
};

/** Format a value for display */
function fmt(val: any): string {
  if (val === null || val === undefined) return '(kosong)';
  if (val === 'now') return '(sekarang)';
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
  if (Array.isArray(val)) return `[${val.length} item]`;
  // Format ISO date strings (must check before object since Date is object)
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val).toLocaleString('id-ID');
  }
  if (val instanceof Date) {
    return val.toLocaleString('id-ID');
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  // Map known enum values to labels
  const enumLabel = ENUM_LABELS[String(val)];
  if (enumLabel) return enumLabel;
  return String(val);
}

/** Highlight changed fields */
function DiffRow({ field, before, after }: { field: string; before: any; after: any }) {
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  if (!changed) return null;
  const label = FIELD_LABELS[field] ?? field;
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-1.5 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-36">{label}</td>
      <td className={`py-1.5 px-3 text-[10px] ${before == null ? 'text-rose-600 italic' : 'text-slate-600 line-through opacity-70'}`}>
        {fmt(before)}
      </td>
      <td className={`py-1.5 px-3 text-[10px] ${after == null ? 'text-rose-600 italic' : 'text-emerald-700 font-semibold'}`}>
        {fmt(after)}
      </td>
    </tr>
  );
}

export default function ActivityLogView({
  logs,
}: ActivityLogViewProps) {

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filter logs list
  const filteredLogs = logs.filter(log => {
    const matchesSearch = (log.actorName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || log.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToggleExpand = (id: string) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  /** Export filtered logs as CSV file download */
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Waktu', 'Kategori', 'Aksi', 'Rincian', 'Pelaku', 'Peran'];
    const rows = filteredLogs.map(log => [
      log.timestamp,
      log.category,
      log.action,
      log.details.replace(/\.?\s*Changes:\s*\{.*\}$/s, '').trim(),
      log.actorName,
      log.actorRole,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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
            {/* Export audit log as local CSV */}
            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition shadow-md hover:shadow-emerald-600/10"
              title="Ekspor log aktivitas yang ditampilkan sebagai file CSV"
            >
              <DownloadCloud size={14} />
              <span>Ekspor Log Audit</span>
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
              <option value="Siswa">Kategori: Siswa (Profil/Data / Cadangan)</option>
              <option value="Dokumen">Kategori: Dokumen (Unggah/Verifikasi)</option>
              <option value="Hak Akses">Kategori: Hak Akses (Autentikasi / Izin Portal)</option>
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
                {filteredLogs.map((log) => {
                  const auditDiff = parseAuditDetails(log.details);
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/40 transition">
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
                          {auditDiff ? (
                            <button
                              onClick={() => handleToggleExpand(log.id)}
                              className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 transition"
                              title="Lihat detail perubahan"
                            >
                              {log.action}
                              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          ) : (
                            log.action
                          )}
                        </td>
                        <td className="p-4 text-slate-600 leading-relaxed max-w-sm">
                          {auditDiff
                            ? log.details.replace(/\.?\s*Changes:\s*\{.*\}$/s, '').trim() || log.action
                            : log.details}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <p className="font-bold text-slate-800">{log.actorName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{log.actorRole}</p>
                        </td>
                      </tr>
                      {isExpanded && auditDiff && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="p-0">
                            <div className="px-4 py-3 border-b border-slate-200">
                              <div className="flex items-center gap-2 mb-2.5">
                                <ArrowLeftRight size={14} className="text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Detail Perubahan Data
                                </span>
                              </div>
                              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200">
                                      <th className="py-1.5 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-36">Field</th>
                                      <th className="py-1.5 px-3 text-[10px] font-bold text-rose-600 uppercase tracking-wider w-48">Sebelum</th>
                                      <th className="py-1.5 px-3 text-[10px] font-bold text-emerald-700 uppercase tracking-wider w-48">Sesudah</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.keys(auditDiff.before ?? auditDiff.after ?? {}).map((field) => (
                                      <DiffRow
                                        key={field}
                                        field={field}
                                        before={auditDiff.before?.[field]}
                                        after={auditDiff.after?.[field]}
                                      />
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

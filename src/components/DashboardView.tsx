/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Users, 
  FileText, 
  ShieldCheck, 
  Activity, 
  CloudRain, 
  CloudLightning, 
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Student, ActivityLog, RoleType } from '../types';

interface DashboardViewProps {
  students: Student[];
  logs: ActivityLog[];
  selectedRole: RoleType;
  onViewChange: (view: string) => void;
  onSyncGoogleSheets: () => void;
  onBackupGoogleDrive: () => void;
  isSyncingSheets: boolean;
  isSyncingDrive: boolean;
}

export default function DashboardView({
  students,
  logs,
  selectedRole,
  onViewChange,
  onSyncGoogleSheets,
  onBackupGoogleDrive,
  isSyncingSheets,
  isSyncingDrive
}: DashboardViewProps) {

  // Statistics
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'Aktif').length;
  const alumniStudents = students.filter(s => s.status === 'Alumni').length;
  const otherStudents = totalStudents - activeStudents - alumniStudents;

  // Documents
  let totalDocs = 0;
  let verifiedDocs = 0;
  let pendingDocs = 0;
  let rejectedDocs = 0;

  students.forEach(student => {
    student.documents.forEach(doc => {
      totalDocs++;
      if (doc.status === 'Terarsip') verifiedDocs++;
      if (doc.status === 'Verifikasi') pendingDocs++;
      if (doc.status === 'Ditolak') rejectedDocs++;
    });
  });

  // Calculate completeness score per student (of 5 required documents)
  // Required: Ijazah, KK, Akta, Pas Foto, Rapor
  const completeCount = students.filter(s => s.documents.length >= 5).length;
  const partiallyCompleteCount = students.filter(s => s.documents.length > 0 && s.documents.length < 5).length;
  const incompleteCount = students.filter(s => s.documents.length === 0).length;

  // Chart Data 1: Kelas & Pasukan
  const classesMap: { [key: string]: number } = {};
  students.forEach(s => {
    if (s.status === 'Aktif') {
      classesMap[s.kelas] = (classesMap[s.kelas] || 0) + 1;
    }
  });
  const classChartData = Object.keys(classesMap).map(className => ({
    name: className,
    Siswa: classesMap[className]
  }));

  // Chart Data 2: Student status
  const statusChartData = [
    { name: 'Aktif', value: activeStudents, color: '#10b981' },
    { name: 'Alumni', value: alumniStudents, color: '#3b82f6' },
    { name: 'Pindahan/Lain', value: otherStudents, color: '#f59e0b' }
  ].filter(status => status.value > 0);

  // Chart Data 3: Kelengkapan Dokumen Arsip (Ijazah, KK, Akta, Foto, Rapor)
  const docTypeCounts = {
    'Ijazah': 0,
    'Kartu Keluarga': 0,
    'Akta Kelahiran': 0,
    'Pas Foto': 0,
    'Rapor': 0
  };

  students.forEach(s => {
    s.documents.forEach(d => {
      if (d.type in docTypeCounts) {
        docTypeCounts[d.type]++;
      }
    });
  });

  const docCompletenessChartData = Object.keys(docTypeCounts).map(type => ({
    name: type,
    Tercatat: docTypeCounts[type as keyof typeof docTypeCounts],
    TotalSiswa: totalStudents
  }));

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl border border-slate-700/60 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide inline-flex items-center gap-1 mb-2 border border-emerald-500/20">
            <Sparkles size={12} />
            Edisi Uji Coba Frontend
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Selamat Datang di Portal Arsip Siswa</h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Anda login sebagai <strong className="text-emerald-400 font-semibold">{selectedRole}</strong>. Seluruh fungsionalitas di bawah ini mensimulasikan penyimpanan digital terpusat dengan sinkronisasi Google Workspace dan analisis dokumen AI.
          </p>
        </div>
        
        {/* Quick Sync trigger buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-sync-sheets"
            onClick={onSyncGoogleSheets}
            disabled={isSyncingSheets || selectedRole === 'Guru / Wali Kelas'}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw size={14} className={isSyncingSheets ? 'animate-spin text-emerald-400' : 'text-slate-400'} />
            <span>{isSyncingSheets ? 'Sinkron Sheets...' : 'Sinkron Google Sheets'}</span>
          </button>
          
          <button
            id="btn-backup-drive"
            onClick={onBackupGoogleDrive}
            disabled={isSyncingDrive || selectedRole === 'Guru / Wali Kelas'}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-slate-100 disabled:opacity-50 font-medium text-xs px-4 py-2.5 rounded-lg shadow-md hover:shadow-emerald-600/10 transition"
          >
            <FolderOpen size={14} className={isSyncingDrive ? 'animate-spin text-white' : 'text-emerald-100'} />
            <span>{isSyncingDrive ? 'Mencadangkan...' : 'Cadangkan Dokumen ke Drive'}</span>
          </button>
        </div>
      </div>

      {/* Info Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Students */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Data Siswa</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{totalStudents}</h3>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{activeStudents} aktif</span> | {alumniStudents} alumni
            </p>
          </div>
          <div className="bg-blue-50 text-blue-500 p-3 rounded-lg">
            <Users size={22} />
          </div>
        </div>

        {/* Card 2: Total Documents */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dokumen Terunggah</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{totalDocs}</h3>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-sky-600 font-semibold">{verifiedDocs} terarsip</span> | {pendingDocs} verifikasi
            </p>
          </div>
          <div className="bg-sky-50 text-sky-500 p-3 rounded-lg">
            <FileText size={22} />
          </div>
        </div>

        {/* Card 3: Completeness Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Arsip Lengkap (5/5)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">
              {totalStudents > 0 ? Math.round((completeCount / totalStudents) * 100) : 0}%
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{completeCount} siswa</span> tuntas arsip lengkap
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-500 p-3 rounded-lg">
            <ShieldCheck size={22} />
          </div>
        </div>

        {/* Card 4: Action Status / Active Role */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Keamanan & Peran</p>
            <h3 className="text-lg font-bold text-slate-800 mt-1.5 truncate max-w-[150px]">{selectedRole}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Log aktivitas berjalan otomatis
            </p>
          </div>
          <div className="bg-purple-50 text-purple-500 p-3 rounded-lg">
            <Activity size={22} />
          </div>
        </div>
      </div>

      {/* Main Grid for charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Left: Pasukan Siswa Per Kelas & Dokumen */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-1">Rasio Pengarsipan per Jenis Dokumen</h4>
            <p className="text-xs text-slate-500 mb-4">Jumlah murid yang mengumpulkan dokumen dasar dari total {totalStudents} murid.</p>
          </div>
          <div className="h-64">
            {totalStudents === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Belum ada data murid dimasukkan</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={docCompletenessChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Tercatat" name="Dokumen Terkumpul" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="TotalSiswa" name="Target Siswa" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart Right: Student Status Pie */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-1">Status Keaktifan Siswa</h4>
            <p className="text-xs text-slate-500 mb-4">Proporsi siswa yang terdaftar dalam sistem akademik.</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            {totalStudents === 0 ? (
              <div className="text-slate-400 text-xs">Belum ada data status</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => [`${value} Siswa`, 'Jumlah']} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Center label */}
            <div className="absolute text-center">
              <p className="text-2xl font-extrabold text-slate-800">{totalStudents}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Siswa</p>
            </div>
          </div>

          {/* Pie Legends */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
            {statusChartData.map((data, i) => (
              <div key={i}>
                <div className="flex items-center justify-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: data.color }} />
                  <span className="text-slate-600 font-medium">{data.name}</span>
                </div>
                <p className="font-bold text-slate-800 mt-0.5">{data.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row of Table & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent logs - Col-span-2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Aktivitas Sistem Terakhir</h4>
              <p className="text-xs text-slate-500">Log operasional real-time arsip dan dokumen siswa.</p>
            </div>
            
            {(selectedRole === 'Super Admin' || selectedRole === 'Staff TU') && (
              <button
                onClick={() => onViewChange('activityLog')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center space-x-1 hover:underline"
              >
                <span>Lihat Semua Log</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {logs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition duration-150">
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                  log.category === 'Siswa' ? 'bg-indigo-500' :
                  log.category === 'Dokumen' ? 'bg-amber-500' :
                  log.category === 'Hak Akses' ? 'bg-purple-500' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 truncate">{log.action}</p>
                    <span className="text-[10px] font-mono text-slate-400">{log.timestamp.split(' ')[1]}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1">{log.details}</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Oleh: {log.actorName} ({log.actorRole})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links & Tips */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-3">Panduan Operasional & Aksi Cepat</h4>
            
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-50/60 text-indigo-950 rounded-lg border border-indigo-100">
                <p className="font-bold mb-1">🚀 Simulasi Multi-Akses</p>
                <p className="leading-relaxed text-slate-600 font-normal">
                  Gunakan dropdown peran di bagian atas layar untuk mensimulasikan login guru, TU, atau super admin untuk mengetes pembatasan enkripsi data dan aksi edit/delete.
                </p>
              </div>

              <div className="p-3 bg-amber-50/60 text-amber-950 rounded-lg border border-amber-100">
                <p className="font-bold mb-1">🤖 AI Scanner Dokumen</p>
                <p className="leading-relaxed text-slate-600 font-normal">
                  Masuk ke menu <strong>Input Data Siswa</strong>, lalu klik tombol AI Scanner untuk mencoba mengekstraksi data siswa otomatis dari foto KK/KTP yang di-upload.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            {selectedRole !== 'Guru / Wali Kelas' ? (
              <button
                onClick={() => onViewChange('inputForm')}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-slate-100 hover:bg-slate-800 py-2.5 rounded-lg text-xs font-bold transition shadow-sm"
              >
                <span>Daftarkan Siswa Baru</span>
                <ArrowRight size={12} />
              </button>
            ) : (
              <button
                onClick={() => onViewChange('directory')}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-slate-100 hover:bg-slate-800 py-2.5 rounded-lg text-xs font-bold transition shadow-sm"
              >
                <span>Lihat Direktori Siswa</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

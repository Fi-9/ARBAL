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
  Sparkles,
  UploadCloud,
  AlertTriangle,
  XCircle,
  CheckCircle2
} from 'lucide-react';
import { Student, ActivityLog, RoleType } from '../types';
import { useUIStore } from '../stores/ui.store';

interface DashboardViewProps {
  students: Student[];
  logs: ActivityLog[];
  selectedRole: RoleType;
  onViewChange: (view: string) => void;
}

export default function DashboardView({
  students,
  logs,
  selectedRole,
  onViewChange,
}: DashboardViewProps) {
  const setInitialDirectoryFilter = useUIStore((state) => state.setInitialDirectoryFilter);

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

  // Calculate completeness score per student
  const completeCount = students.filter(s => s.completenessPercent !== undefined ? s.completenessPercent === 100 : s.documents.length >= 5).length;
  const incompleteCount = students.filter(s => s.completenessPercent !== undefined ? s.completenessPercent < 100 : s.documents.length < 5).length;

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

  // Chart Data 3: Kelengkapan Dokumen Arsip (Ijazah Terakhir, KK, Akta, Foto, Rapor, SKL)
  const docTypeCounts = {
    'Ijazah Terakhir': 0,
    'Kartu Keluarga': 0,
    'Akta Kelahiran': 0,
    'Pas Foto': 0,
    'Rapor': 0,
    'Surat Keterangan Lulus': 0
  };

  students.forEach(s => {
    s.documents.forEach(d => {
      if (d.type in docTypeCounts) {
        docTypeCounts[d.type as keyof typeof docTypeCounts]++;
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
            Portal Manajemen Arsip Siswa
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Selamat Datang di Portal Arsip Siswa</h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Anda login sebagai <strong className="text-emerald-400 font-semibold">{selectedRole}</strong>. Seluruh fungsionalitas di bawah ini mensimulasikan penyimpanan digital terpusat dengan pengarsipan lokal yang aman.
          </p>
        </div>
        
        {/* Quick action buttons — role-aware */}
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedRole === 'Super Admin' ? (
            <>
              <button
                id="btn-quick-add-student"
                onClick={() => onViewChange('inputForm')}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-md hover:shadow-emerald-600/10 transition"
              >
                <Users size={14} className="text-emerald-100" />
                <span>Tambah Siswa</span>
              </button>

              <button
                id="btn-quick-upload-doc"
                onClick={() => onViewChange('directory')}
                className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs px-3.5 py-2.5 rounded-lg border border-slate-600 transition"
              >
                <UploadCloud size={14} className="text-slate-300" />
                <span>Upload Dokumen</span>
              </button>
            </>
          ) : (
            <button
              id="btn-goto-directory-guru"
              onClick={() => onViewChange('directory')}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-md hover:shadow-emerald-600/10 transition"
            >
              <FolderOpen size={14} className="text-emerald-100" />
              <span>Lihat Direktori Siswa</span>
            </button>
          )}
        </div>
      </div>

      {/* Info Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Total Siswa */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Siswa</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{totalStudents}</h3>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{activeStudents} aktif</span> | {alumniStudents} alumni
            </p>
          </div>
          <div className="bg-blue-50 text-blue-500 p-3 rounded-lg shrink-0">
            <Users size={22} />
          </div>
        </div>

        {/* Card 2: Arsip Lengkap */}
        <div 
          id="card-completeness-lengkap"
          onClick={() => {
            setInitialDirectoryFilter({ completeness: 'Lengkap' });
            onViewChange('directory');
          }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-500 hover:shadow-md transition group animate-fade-in"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-emerald-600 transition">Arsip Lengkap</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{completeCount}</h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Klik untuk filter direktori
            </p>
          </div>
          <div className="bg-emerald-50 text-emerald-500 p-3 rounded-lg shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition">
            <FolderOpen size={22} />
          </div>
        </div>

        {/* Card 3: Belum Lengkap */}
        <div 
          id="card-completeness-belum-lengkap"
          onClick={() => {
            setInitialDirectoryFilter({ completeness: 'Belum Lengkap' });
            onViewChange('directory');
          }}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-500 hover:shadow-md transition group animate-fade-in"
        >
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-amber-600 transition">Belum Lengkap</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{incompleteCount}</h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Klik untuk filter direktori
            </p>
          </div>
          <div className="bg-amber-50 text-amber-500 p-3 rounded-lg shrink-0 group-hover:bg-amber-500 group-hover:text-white transition">
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Card 4: Menunggu Verifikasi */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Menunggu Verifikasi</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{pendingDocs}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Dokumen perlu diperiksa
            </p>
          </div>
          <div className="bg-indigo-50 text-indigo-500 p-3 rounded-lg shrink-0">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Card 5: Dokumen Ditolak */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dokumen Ditolak</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{rejectedDocs}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Membutuhkan unggah ulang
            </p>
          </div>
          <div className="bg-rose-50 text-rose-500 p-3 rounded-lg shrink-0">
            <XCircle size={22} />
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
            
            <button
              onClick={() => onViewChange('activityLog')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center space-x-1 hover:underline"
            >
              <span>Lihat Semua Log</span>
              <ArrowRight size={12} />
            </button>
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
              <div className="p-3 bg-emerald-50/60 text-emerald-950 rounded-lg border border-emerald-100">
                <p className="font-bold mb-1">📋 Cara Kerja Sistem</p>
                <p className="leading-relaxed text-slate-600 font-normal">
                  Input data siswa lewat menu <strong>Input Data Siswa</strong> dan unggah dokumen fisik ke <strong>Direktori</strong>.
                </p>
              </div>

              {selectedRole === 'Super Admin' && (
                <div className="p-3 bg-indigo-50/60 text-indigo-950 rounded-lg border border-indigo-100">
                  <p className="font-bold mb-1">🛡️ Simulasi Akses Guru</p>
                  <p className="leading-relaxed text-slate-600 font-normal">
                    Gunakan dropdown peran di bagian atas layar untuk mensimulasikan login Guru dan memeriksa pembatasan data PII dan aksi edit/delete.
                  </p>
                </div>
              )}
            </div>
          </div>

          {selectedRole === 'Super Admin' && (
            <div className="pt-4 border-t border-slate-100">
              <button
                id="btn-dashboard-add-student"
                onClick={() => onViewChange('inputForm')}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-slate-100 hover:bg-slate-800 py-2.5 rounded-lg text-xs font-bold transition shadow-sm"
              >
                <span>Daftarkan Siswa Baru</span>
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

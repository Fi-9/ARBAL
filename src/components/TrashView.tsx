/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TrashView — displays soft-deleted students with restore & permanent delete actions.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RotateCcw, AlertTriangle, RefreshCw, UserX, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { Student, StudentStatus } from '../types';
import { mapBackendStudent } from '../services/student.service';
import { queryKeys } from '../lib/queryKeys';
import { useAuthStore } from '../stores/auth.store';

interface TrashStudent {
  id: string;
  nama: string;
  nisSekolah?: string;
  nisn?: string;
  kelas: string;
  jurusan: string;
  status: string;
  deletedAt: string;
  deletedBy?: string;
}

const DB_STATUS_TO_FRONTEND: Record<string, StudentStatus> = {
  PENDAFTAR: 'Pendaftar',
  AKTIF: 'Aktif',
  CUTI: 'Cuti',
  LULUS: 'Lulus',
  KELUAR: 'Keluar',
  ALUMNI: 'Alumni',
};

function mapTrashStudent(raw: any): TrashStudent {
  return {
    id: raw.id,
    nama: raw.nama,
    nisSekolah: raw.nisSekolah ?? undefined,
    nisn: raw.nisn ?? undefined,
    kelas: raw.kelas,
    jurusan: raw.jurusan,
    status: DB_STATUS_TO_FRONTEND[raw.status] ?? raw.status,
    deletedAt: typeof raw.deletedAt === 'string'
      ? raw.deletedAt
      : new Date(raw.deletedAt).toISOString(),
    deletedBy: raw.deletedBy ?? undefined,
  };
}

export default function TrashView() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [restoringStudentId, setRestoringStudentId] = useState<string | null>(null);
  const [permanentlyDeletingStudentId, setPermanentlyDeletingStudentId] = useState<string | null>(null);

  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: trashedStudents = [], isLoading, refetch } = useQuery({
    queryKey: ['students', 'trash'],
    queryFn: async (): Promise<TrashStudent[]> => {
      const { data } = await api.get<any[]>('/students/trash');
      return (data ?? []).map(mapTrashStudent);
    },
    enabled: !!accessToken,
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/students/${id}/restore`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all() });
      qc.invalidateQueries({ queryKey: ['students', 'trash'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      qc.invalidateQueries({ queryKey: queryKeys.activity.logs() });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/students/${id}/permanent`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', 'trash'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      qc.invalidateQueries({ queryKey: queryKeys.activity.logs() });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });

  const filtered = trashedStudents.filter(s =>
    !searchTerm ||
    s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nisSekolah && s.nisSekolah.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.nisn && s.nisn.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleRestoreClick = (id: string) => {
    setRestoringStudentId(id);
    setPermanentlyDeletingStudentId(null);
  };

  const handlePermanentDeleteClick = (id: string) => {
    setPermanentlyDeletingStudentId(id);
    setRestoringStudentId(null);
  };

  const cancelAction = () => {
    setRestoringStudentId(null);
    setPermanentlyDeletingStudentId(null);
  };

  /** Returns days remaining before auto-purge (30-day policy) */
  const daysUntilPermanentDelete = (deletedAtIso: string): number => {
    const deletedAt = new Date(deletedAtIso).getTime();
    const purgeAt = deletedAt + 30 * 24 * 60 * 60 * 1000;
    const remaining = Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, remaining);
  };

  return (
    <div id="trash-view" className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <p className="font-bold">Sampah (Trash Bin) — Kebijakan Penghapusan Otomatis 30 Hari</p>
          <p className="mt-1">
            Siswa yang dihapus sementara masih bisa dipulihkan. Data di sampah akan <strong>dihapus permanen otomatis setelah 30 hari</strong>.
            Penghapusan permanen akan menghapus seluruh data dan file dokumen terkait secara <strong>total dan tidak dapat dibatalkan</strong>.
          </p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Siswa Terhapus</h3>
            <p className="text-xs text-slate-500">{trashedStudents.length} siswa di sampah</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <input
          type="text"
          placeholder="Cari nama atau NIS di sampah..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {isLoading ? (
        <div className="bg-white p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
          Memuat data sampah...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 text-xs space-y-2">
          <Trash2 size={36} className="mx-auto text-slate-300" />
          <p className="font-bold text-slate-600">Sampah kosong</p>
          <p>Tidak ada siswa yang dihapus.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Nama / NIS</th>
                <th className="p-4">Kelas & Jurusan</th>
                <th className="p-4">Dihapus</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{s.nama}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.nisSekolah || s.nisn || s.id}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-700">{s.kelas}</p>
                    <p className="text-[10px] text-slate-400">{s.jurusan}</p>
                  </td>
                  <td className="p-4 text-slate-500">
                    <div>
                      <div className="flex items-center gap-1">
                        <Calendar size={10} />
                        <span className="text-[10px]">
                          {new Date(s.deletedAt).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      {(() => {
                        const days = daysUntilPermanentDelete(s.deletedAt);
                        const urgency = days <= 3 ? 'text-rose-600 font-bold' : days <= 7 ? 'text-amber-600 font-semibold' : 'text-slate-400';
                        return (
                          <p className={`text-[9px] mt-0.5 ${urgency}`}>
                            {days === 0 ? '⚠️ Dihapus hari ini' : `⏱ ${days} hari lagi dihapus permanen`}
                          </p>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap text-slate-400">
                    {restoringStudentId === s.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-semibold">Pulihkan?</span>
                        <button
                          onClick={() => {
                            restoreMutation.mutate(s.id);
                            setRestoringStudentId(null);
                          }}
                          disabled={restoreMutation.isPending}
                          className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition disabled:opacity-50"
                        >
                          Ya
                        </button>
                        <button
                          onClick={cancelAction}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition"
                        >
                          Batal
                        </button>
                      </div>
                    ) : permanentlyDeletingStudentId === s.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[10px] text-rose-500 font-bold">Hapus permanen?</span>
                        <button
                          onClick={() => {
                            permanentDeleteMutation.mutate(s.id);
                            setPermanentlyDeletingStudentId(null);
                          }}
                          disabled={permanentDeleteMutation.isPending}
                          className="px-2 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded transition disabled:opacity-50"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          onClick={cancelAction}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleRestoreClick(s.id)}
                          disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded transition disabled:opacity-50"
                          title="Pulihkan siswa"
                        >
                          <RotateCcw size={11} />
                          Pulihkan
                        </button>
                        <button
                          onClick={() => handlePermanentDeleteClick(s.id)}
                          disabled={restoreMutation.isPending || permanentDeleteMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded transition disabled:opacity-50"
                          title="Hapus permanen"
                        >
                          <UserX size={11} />
                          Hapus Permanen
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

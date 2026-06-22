import React from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Info,
  KeyRound,
  UserRound,
} from 'lucide-react';
import { RoleType } from '../types';
import { useAuthStore } from '../stores/auth.store';
import UserManagementPanel from './UserManagementPanel';

interface SecurityAndAccessViewProps {
  selectedRole: RoleType;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

const ROLE_PERMISSION_MATRIX: Array<{
  label: string;
  values: Record<RoleType, boolean>;
}> = [
  {
    label: 'Lihat biodata siswa',
    values: { 'Super Admin': true, 'Guru / Wali Kelas': true },
  },
  {
    label: 'Registrasi dan edit siswa',
    values: { 'Super Admin': true, 'Guru / Wali Kelas': false },
  },
  {
    label: 'Hapus data siswa',
    values: { 'Super Admin': true, 'Guru / Wali Kelas': false },
  },
  {
    label: 'Unggah dokumen',
    values: { 'Super Admin': true, 'Guru / Wali Kelas': false },
  },
  {
    label: 'Hapus dokumen',
    values: { 'Super Admin': true, 'Guru / Wali Kelas': false },
  },
  {
    label: 'Verifikasi dokumen',
    values: { 'Super Admin': true, 'Guru / Wali Kelas': false },
  },
  {
    label: 'Kelola akun dan peran',
    values: { 'Super Admin': true, 'Guru / Wali Kelas': false },
  },
  {
    label: 'Lihat audit log penuh',
    values: { 'Super Admin': true, 'Guru / Wali Kelas': false },
  },
];




export default function SecurityAndAccessView({
  selectedRole,
}: SecurityAndAccessViewProps) {
  const { user } = useAuthStore();
  const canManageUsers = selectedRole === 'Super Admin';

  return (
    <div id="security-access-view" className="space-y-6">
      <div className="bg-gradient-to-r from-teal-950 to-slate-900 text-white p-5 rounded-xl border border-teal-800 shadow-lg flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="bg-teal-500/10 text-teal-300 text-[10px] px-2 py-0.5 rounded border border-teal-500/20 font-bold uppercase tracking-wider">
            Kontrol Akses Nyata
          </span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Ringkasan sesi dan matriks RBAC</h3>
          <p className="text-xs text-slate-300">
            Halaman ini sekarang menampilkan role akun aktif dan daftar akun backend, tanpa data staf simulasi.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-64">
          <div className="flex items-center gap-2 text-xs text-slate-300 mb-2">
            <UserRound size={14} />
            <span>Sesi aktif</span>
          </div>
          <p className="text-sm font-bold text-white">{user?.name ?? 'Tidak diketahui'}</p>
          <p className="text-xs text-slate-300">{user?.email ?? '-'}</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
            <KeyRound size={12} />
            {selectedRole}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Matriks izin aplikasi</h4>
            <p className="text-xs text-slate-500">
              Diselaraskan dengan permission map backend, supaya tampilan akses tidak lagi bergantung pada akun contoh.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-3">Operasi</th>
                  <th className="p-3 text-center">Super Admin</th>
                  <th className="p-3 text-center">Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ROLE_PERMISSION_MATRIX.map((row) => (
                  <tr key={row.label}>
                    <td className="p-3 text-slate-700">{row.label}</td>
                    {(['Super Admin', 'Guru / Wali Kelas'] as RoleType[]).map((role) => (
                      <td
                        key={role}
                        className={`p-3 text-center ${row.values[role] ? 'text-emerald-600' : 'text-rose-500'}`}
                      >
                        {row.values[role] ? <Check className="mx-auto" size={16} /> : <X className="mx-auto" size={16} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-blue-50 text-blue-900 border border-blue-100 rounded-lg flex items-start space-x-2 text-[11px] leading-relaxed">
            <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
            <div>
              <p className="font-bold">Catatan audit</p>
              <p className="text-slate-600">
                Beberapa kontrol sebelumnya hanya simulasi frontend. Matriks ini sekarang diposisikan sebagai dokumentasi izin, sedangkan sumber kebenaran tetap ada di backend guard JWT.
              </p>
            </div>
          </div>
        </div>

        {/* ── Kolom Kanan: User Management Panel (SUPER_ADMIN) atau pesan terkunci ── */}
        {canManageUsers ? (
          <UserManagementPanel />
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Akun backend</h4>
              <p className="text-xs text-slate-500">
                Hanya Super Admin yang bisa melihat daftar akun backend lengkap.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              Akun Anda tidak memiliki izin <code className="bg-amber-100 px-1 rounded">user.manage</code>, jadi panel ini tidak menampilkan data staf.
            </div>
            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Panel ini memakai data backend saat tersedia, bukan daftar staf hardcoded.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

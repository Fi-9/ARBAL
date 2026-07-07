import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Info,
  KeyRound,
  UserRound,
  RefreshCw,
} from 'lucide-react';
import { RoleType } from '../types';
import { useAuthStore } from '../stores/auth.store';
import { userService } from '../services/user.service';
import { useToastStore } from '../stores/toast.store';
import UserManagementPanel from './UserManagementPanel';

interface SecurityAndAccessViewProps {
  selectedRole: RoleType;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

const ROLE_PERMISSION_MATRIX = [
  { label: 'Lihat biodata siswa' },
  { label: 'Registrasi dan edit siswa' },
  { label: 'Hapus data siswa' },
  { label: 'Unggah dokumen' },
  { label: 'Hapus dokumen' },
  { label: 'Verifikasi dokumen' },
  { label: 'Kelola akun dan peran' },
  { label: 'Lihat audit log penuh' },
];

const PERMISSION_ROW_KEYS: Record<string, string[]> = {
  'Lihat biodata siswa': ['student.read'],
  'Registrasi dan edit siswa': ['student.write'],
  'Hapus data siswa': ['student.delete'],
  'Unggah dokumen': ['document.upload'],
  'Hapus dokumen': ['document.delete'],
  'Verifikasi dokumen': ['document.verify'],
  'Kelola akun dan peran': ['user.manage', 'role.manage'],
  'Lihat audit log penuh': ['logs.view'],
  'Pulihkan backup dan data': ['restore.manage'],
};

export default function SecurityAndAccessView({
  selectedRole,
  onAddNotification,
}: SecurityAndAccessViewProps) {
  const { user } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);
  const canManageUsers = selectedRole === 'Super Admin';

  const [permissions, setPermissions] = useState<Record<string, string[]>>({
    SUPER_ADMIN: [],
    GURU: [],
    KEPALA_SEKOLAH: [],
    TATA_USAHA: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userService.getPermissions()
      .then((data) => {
        setPermissions(data);
        setLoading(false);
      })
      .catch((err) => {
        addToast('Gagal memuat matriks izin dari server.', 'error');
        setLoading(false);
      });
  }, []);

  const handleTogglePermission = (role: string, keys: string[], currentChecked: boolean) => {
    setPermissions((prev) => {
      const currentList = prev[role] || [];
      let newList: string[];
      if (currentChecked) {
        newList = currentList.filter((k) => !keys.includes(k));
      } else {
        newList = [...currentList, ...keys.filter((k) => !currentList.includes(k))];
      }
      return {
        ...prev,
        [role]: newList,
      };
    });
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await userService.savePermissions(permissions);
      useAuthStore.getState().setRolePermissionsMap(permissions);
      addToast('Perubahan hak akses berhasil disimpan ke database!', 'success');
      onAddNotification(
        'Hak Akses Diperbarui',
        'Kebijakan hak akses peran telah diperbarui di database backend.',
        'success'
      );
    } catch (err: any) {
      addToast(`Gagal menyimpan izin: ${err.message || 'Error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Matriks izin aplikasi</h4>
              <p className="text-xs text-slate-500">
                Diselaraskan dengan permission map backend. Centang izin untuk mengubah akses secara real-time.
              </p>
            </div>
            {loading && <RefreshCw className="animate-spin text-slate-400" size={16} />}
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-3">Operasi</th>
                  <th className="p-3 text-center">Super Admin</th>
                  <th className="p-3 text-center">Guru</th>
                  <th className="p-3 text-center">Kepala Sekolah</th>
                  <th className="p-3 text-center">Tata Usaha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ROLE_PERMISSION_MATRIX.map((row) => {
                  const keys = PERMISSION_ROW_KEYS[row.label] || [];
                  return (
                    <tr key={row.label} className="hover:bg-slate-50/30 transition">
                      <td className="p-3 text-slate-700 font-semibold">{row.label}</td>
                      {(['Super Admin', 'Guru / Wali Kelas', 'Kepala Sekolah', 'Tata Usaha'] as RoleType[]).map((role) => {
                        const backendRole = role === 'Super Admin' ? 'SUPER_ADMIN' :
                                            role === 'Guru / Wali Kelas' ? 'GURU' :
                                            role === 'Kepala Sekolah' ? 'KEPALA_SEKOLAH' : 'TATA_USAHA';
                        const isChecked = keys.every((k) => permissions[backendRole]?.includes(k));
                        return (
                          <td key={role} className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={backendRole === 'SUPER_ADMIN' || !canManageUsers || loading || saving}
                              onChange={() => handleTogglePermission(backendRole, keys, isChecked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canManageUsers && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={saving || loading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg transition text-xs shadow-md flex items-center gap-1.5 cursor-pointer hover:shadow-emerald-600/10"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan Izin'}
              </button>
            </div>
          )}

          <div className="p-3 bg-blue-50 text-blue-900 border border-blue-100 rounded-lg flex items-start space-x-2 text-[11px] leading-relaxed">
            <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
            <div>
              <p className="font-bold">Informasi Kebijakan Akses</p>
              <p className="text-slate-600">
                Pembaruan izin ini disimpan langsung ke basis data backend. Setelah disimpan, akun dengan peran terkait akan langsung mendapatkan penyesuaian izin akses menu secara real-time pada pemanggilan API berikutnya.
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

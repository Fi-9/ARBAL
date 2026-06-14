/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserSquare2, 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  UserCog, 
  KeyRound, 
  FileLock2, 
  RefreshCw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { AppRole, RoleType } from '../types';
import { APP_ROLES } from '../mockData';

interface SecurityAndAccessViewProps {
  selectedRole: RoleType;
  onChangeSimulatedRole: (role: RoleType) => void;
  onAddLog: (action: string, category: 'Siswa' | 'Dokumen' | 'Hak Akses' | 'Google Drive' | 'Google Sheets', details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

interface MockStaff {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  status: 'Online' | 'Offline';
  lastActive: string;
}

export default function SecurityAndAccessView({
  selectedRole,
  onChangeSimulatedRole,
  onAddLog,
  onAddNotification
}: SecurityAndAccessViewProps) {

  // Current roles defined in system
  const rolesList = Object.keys(APP_ROLES).map(k => APP_ROLES[k]);

  // Mock staff list
  const [staffList, setStaffList] = useState<MockStaff[]>([
    { id: 'STF001', name: 'Drs. H. Mulyono', email: 'mulyono.admin@sekolah.sch.id', role: 'Super Admin', status: 'Online', lastActive: 'Aktif saat ini' },
    { id: 'STF002', name: 'Rina Herawati, S.Pd', email: 'rina.tu@sekolah.sch.id', role: 'Staff TU', status: 'Offline', lastActive: '12 menit lalu' },
    { id: 'STF003', name: 'Asep Saepudin, M.Pd', email: 'asep.guru@sekolah.sch.id', role: 'Guru / Wali Kelas', status: 'Offline', lastActive: '1 jam lalu' },
    { id: 'STF004', name: 'Zainal Arifin, S.Kom', email: 'zainal.rpl@sekolah.sch.id', role: 'Guru / Wali Kelas', status: 'Online', lastActive: 'Aktif saat ini' }
  ]);

  // State to simulate editing a staff role
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [tempRoleSelect, setTempRoleSelect] = useState<RoleType>('Guru / Wali Kelas');

  const handleRoleChangeForStaff = (staffId: string, staffName: string) => {
    if (selectedRole !== 'Super Admin') {
      alert('Hanya Super Admin yang diizinkan merubah hak akses staf sekolah!');
      return;
    }

    setStaffList(prev => prev.map(s => {
      if (s.id === staffId) {
        return { ...s, role: tempRoleSelect };
      }
      return s;
    }));

    onAddLog(
      'Ubah Hak Akses',
      'Hak Akses',
      `Merubah peran hak akses akun staf ${staffName} (${staffId}) menjadi ${tempRoleSelect}.`
    );

    onAddNotification(
      'Akses Akun Diperbarui',
      `Peran akses akun ${staffName} berhasil dirubah menjadi ${tempRoleSelect} oleh Administrator.`,
      'info'
    );

    // If the changed staff matches current simulated role, switch session too
    const isEditingSelf = (staffId === 'STF001');
    
    if (isEditingSelf) {
      onChangeSimulatedRole(tempRoleSelect);
    }

    setEditingStaffId(null);
  };

  return (
    <div id="security-access-view" className="space-y-6">
      {/* Simulation Selector Bar */}
      <div className="bg-gradient-to-r from-teal-950 to-slate-900 text-white p-5 rounded-xl border border-teal-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="bg-teal-500/10 text-teal-300 text-[10px] px-2 py-0.5 rounded border border-teal-500/20 font-bold uppercase tracking-wider">
            Alat Simulasi Keamanan
          </span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Pindah Sesi Hak Akses (RBAC)</h3>
          <p className="text-xs text-slate-300">Ganti peran Anda saat ini untuk langsung merasakan pembatasan fungsionalitas enkripsi data siswa.</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <label className="text-xs font-semibold text-slate-300 hidden md:inline">Simulasi Sebagai:</label>
          <select
            id="simulated-role-select"
            value={selectedRole}
            onChange={(e) => {
              const r = e.target.value as RoleType;
              onChangeSimulatedRole(r);
              onAddLog(
                'Sesi Simulasi',
                'Hak Akses',
                `Berhasil masuk sesi simulasi baru sebagai peran: ${r}.`
              );
              onAddNotification(
                'Perubahan Sesi Akun',
                `Sekarang Anda beroperasi menggunakan rangkaian izin hak akses: ${r}.`,
                'success'
              );
            }}
            className="bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-lg font-bold focus:outline-none focus:border-emerald-500 appearance-none pr-8 cursor-pointer"
          >
            <option value="Super Admin">🛡️ Super Admin (Mulyono)</option>
            <option value="Staff TU">📝 Staff TU (Rina Herawati)</option>
            <option value="Guru / Wali Kelas">👨‍🏫 Guru / Wali Kelas (Asep/Zainal)</option>
          </select>
        </div>
      </div>

      {/* Main Matrix and User control grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Permission matrix Table (Col-span-2) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Matriks Hak Akses Terenkripsi</h4>
            <p className="text-xs text-slate-500">Izin detail yang dialokasikan otomatis sesuai dengan Keputusan Kebijakan Keamanan Sekolah.</p>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="p-3">Operasi Sistem</th>
                  <th className="p-3 text-center">Super Admin</th>
                  <th className="p-3 text-center">Staff TU</th>
                  <th className="p-3 text-center">Guru / Wali Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {/* 1. Siswa Read */}
                <tr>
                  <td className="p-3 text-slate-700">Lihat Biodata Siswa (Read)</td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                </tr>
                {/* 2. Siswa Write */}
                <tr>
                  <td className="p-3 text-slate-700">Registrasi & Edit Siswa (Write)</td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                </tr>
                {/* 3. Siswa Delete */}
                <tr>
                  <td className="p-3 text-slate-700">Hapus Permanen Siswa (Delete)</td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                </tr>
                {/* 4. Doc Upload */}
                <tr>
                  <td className="p-3 text-slate-700">Unggah Berkas ke Drive (Upload)</td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                </tr>
                {/* 5. Doc Delete */}
                <tr>
                  <td className="p-3 text-slate-700">Hapus Dokumen Arsip Terpilih</td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                </tr>
                {/* 6. Doc Verify */}
                <tr>
                  <td className="p-3 text-slate-700">Verifikasi Kelengkapan Dokumen</td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                </tr>
                {/* 7. Access control */}
                <tr>
                  <td className="p-3 text-slate-700">Kelola Mutasi Peran Staf</td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                </tr>
                {/* 8. Log View */}
                <tr>
                  <td className="p-3 text-slate-700">Lihat Audit Log Aktivitas Penuh</td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-emerald-600"><Check className="mx-auto" size={16} /></td>
                  <td className="p-3 text-center text-rose-500"><X className="mx-auto" size={16} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-blue-50 text-blue-900 border border-blue-100 rounded-lg flex items-start space-x-2 text-[11px] leading-relaxed">
            <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
            <div>
              <p className="font-bold">Informasi Privasi:</p>
              <p className="text-slate-600">Sistem ini mengimplementasikan Enkripsi Enclave. Dokumen sensitif seperti Ijazah dan Kartu Keluarga hanya bisa dibaca oleh wali kelas atau staf TU guna mencegah pemaparan ke publik, sesuai standar perlinsos data anak.</p>
            </div>
          </div>
        </div>

        {/* Staff Directory Management panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Arsip Staf Pengelola</h4>
              <p className="text-xs text-slate-500 mb-3">Akun aktif staf yang memiliki akses masuk portal SIAKAD.</p>
            </div>

            <div className="space-y-3">
              {staffList.map((stf) => (
                <div key={stf.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50/50 transition flex flex-col space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{stf.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{stf.email}</p>
                    </div>

                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      stf.status === 'Online' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {stf.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/60">
                    <span className="text-[10.5px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700 flex items-center gap-1">
                      <KeyRound size={10} className="text-slate-400" />
                      {stf.role}
                    </span>

                    {/* Change Role Simulation Trigger for admin */}
                    {selectedRole === 'Super Admin' && editingStaffId !== stf.id && (
                      <button
                        onClick={() => {
                          setEditingStaffId(stf.id);
                          setTempRoleSelect(stf.role);
                        }}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        <UserCog size={11} /> Mutasikan
                      </button>
                    )}
                  </div>

                  {editingStaffId === stf.id && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Pilih Peran Baru:</label>
                      <div className="flex gap-1.5">
                        <select
                          value={tempRoleSelect}
                          onChange={(e) => setTempRoleSelect(e.target.value as RoleType)}
                          className="flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                        >
                          <option value="Super Admin">Super Admin</option>
                          <option value="Staff TU">Staff TU</option>
                          <option value="Guru / Wali Kelas">Guru / Wali Kelas</option>
                        </select>
                        
                        <button
                          onClick={() => handleRoleChangeForStaff(stf.id, stf.name)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded transition text-xs font-bold"
                          title="Simpan Mutasi"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingStaffId(null)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-1 rounded transition text-xs font-bold"
                          title="Batal"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>Kepatuhan PDN & UU PDP No.27 Terjamin</span>
          </div>
        </div>
      </div>
    </div>
  );
}

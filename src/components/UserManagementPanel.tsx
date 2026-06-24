/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UserManagementPanel — Tabbed CRUD panel untuk akun backend.
 *
 * Desain: 3 Tab dalam 1 Card:
 *   Tab 1 — Daftar Akun (user list + selection)
 *   Tab 2 — Tambah User (create form)
 *   Tab 3 — Detail (edit + reset password + hapus) — aktif saat user dipilih
 *
 * Fitur:
 *   - Password strength indicator
 *   - Avatar inisial berwarna sesuai role
 *   - Self-protection: mencegah Super Admin menonaktifkan/menghapus diri sendiri
 *   - Toast notification untuk semua aksi CRUD
 */

import React, { useState, useMemo, useCallback } from 'react';
import { getFriendlyErrorMessage } from '../lib/error';
import {
  UserPlus,
  Users,
  Pencil,
  KeyRound,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useToastStore } from '../stores/toast.store';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useResetPassword,
  useDeleteUser,
} from '../hooks/useUsers';
import type { UserAccount } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DbRole = 'SUPER_ADMIN' | 'GURU' | 'KEPALA_SEKOLAH' | 'TATA_USAHA';
type TabId = 'list' | 'create' | 'detail';

const ROLE_OPTIONS: Array<{ value: DbRole; label: string }> = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'GURU', label: 'Guru / Wali Kelas' },
  { value: 'KEPALA_SEKOLAH', label: 'Kepala Sekolah' },
  { value: 'TATA_USAHA', label: 'Tata Usaha' },
];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-500',
  GURU: 'bg-amber-500',
  KEPALA_SEKOLAH: 'bg-emerald-500',
  TATA_USAHA: 'bg-blue-500',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-700 border-violet-200',
  GURU: 'bg-amber-100 text-amber-700 border-amber-200',
  KEPALA_SEKOLAH: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  TATA_USAHA: 'bg-blue-100 text-blue-700 border-blue-200',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatRoleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

/** Password strength: 0 = weak, 1 = fair, 2 = strong */
function getPasswordStrength(pw: string): number {
  if (pw.length >= 12) return 2;
  if (pw.length >= 8) return 1;
  return 0;
}

const PW_STRENGTH_CONFIG = [
  { label: 'Lemah', color: 'bg-rose-500', textColor: 'text-rose-600', width: 'w-1/3' },
  { label: 'Cukup', color: 'bg-amber-500', textColor: 'text-amber-600', width: 'w-2/3' },
  { label: 'Kuat', color: 'bg-emerald-500', textColor: 'text-emerald-600', width: 'w-full' },
];

// ─── Sub-Components ──────────────────────────────────────────────────────────

const PasswordStrengthBar: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const strength = getPasswordStrength(password);
  const cfg = PW_STRENGTH_CONFIG[strength];
  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${cfg.color} ${cfg.width}`}
        />
      </div>
      <p className={`text-[10px] font-semibold ${cfg.textColor}`}>{cfg.label}</p>
    </div>
  );
};

const UserAvatar: React.FC<{ name: string; role: string; size?: 'sm' | 'md' }> = ({
  name,
  role,
  size = 'sm',
}) => {
  const bg = ROLE_COLORS[role] ?? 'bg-slate-400';
  const sz = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-[11px]';
  return (
    <div
      className={`${sz} ${bg} rounded-full flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0`}
    >
      {getInitials(name || '?')}
    </div>
  );
};

const RoleSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  id: string;
}> = ({ value, onChange, disabled, id }) => (
  <div className="relative">
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full text-xs border rounded-lg px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition ${
        disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'border-slate-200'
      }`}
    >
      {ROLE_OPTIONS.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
    <ChevronDown
      size={14}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
    />
  </div>
);

// ─── Tab Button ──────────────────────────────────────────────────────────────

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  disabled?: boolean;
  disabledTooltip?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════

export default function UserManagementPanel() {
  const currentUser = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const usersQuery = useUsers(true);
  const users = usersQuery.data ?? [];

  // Mutations
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const resetPassword = useResetPassword();
  const deleteUser = useDeleteUser();

  // ── Tab State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('list');

  // ── Create Form State ──────────────────────────────────────────────────────
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPw, setCreateConfirmPw] = useState('');
  const [createRole, setCreateRole] = useState<string>('GURU');
  const [showCreatePw, setShowCreatePw] = useState(false);

  // ── Selection State ────────────────────────────────────────────────────────
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // ── Edit Form State ────────────────────────────────────────────────────────
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState(true);

  // ── Reset Password Form State ──────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);

  // ── Delete Confirmation ────────────────────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const isSelf = selectedUser?.id === currentUser?.id;

  // ── Tab definitions ────────────────────────────────────────────────────────
  const tabs: TabDef[] = useMemo(
    () => [
      {
        id: 'list',
        label: 'Daftar',
        icon: <Users size={14} />,
        badge: `${users.length}`,
      },
      {
        id: 'create',
        label: 'Tambah',
        icon: <UserPlus size={14} />,
      },
      {
        id: 'detail',
        label: 'Detail',
        icon: <Settings size={14} />,
        disabled: !selectedUser,
        disabledTooltip: 'Pilih akun dari tab Daftar terlebih dahulu',
      },
    ],
    [users.length, selectedUser],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectUser = useCallback(
    (user: UserAccount) => {
      setSelectedUserId(user.id);
      setEditName(user.name);
      setEditEmail(user.email);
      setEditRole(user.role);
      setEditIsActive(user.isActive);
      setNewPassword('');
      setConfirmDeleteId(null);
      setActiveTab('detail');
    },
    [],
  );

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (createPassword !== createConfirmPw) {
        addToast('Password dan konfirmasi tidak cocok.', 'error');
        return;
      }
      if (createPassword.length < 8) {
        addToast('Password minimal 8 karakter.', 'error');
        return;
      }
      try {
        await createUser.mutateAsync({
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          roleName: createRole,
        });
        addToast(`Akun "${createName.trim()}" berhasil dibuat.`, 'success');
        setCreateName('');
        setCreateEmail('');
        setCreatePassword('');
        setCreateConfirmPw('');
        setCreateRole('GURU');
        setActiveTab('list');
      } catch (err: any) {
        addToast(getFriendlyErrorMessage(err), 'error');
      }
    },
    [createName, createEmail, createPassword, createConfirmPw, createRole, createUser, addToast],
  );

  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser) return;
      try {
        await updateUser.mutateAsync({
          id: selectedUser.id,
          name: editName.trim(),
          email: editEmail.trim(),
          roleName: isSelf ? undefined : editRole,
          isActive: isSelf ? undefined : editIsActive,
        });
        addToast(`Akun "${editName.trim()}" berhasil diperbarui.`, 'success');
      } catch (err: any) {
        addToast(getFriendlyErrorMessage(err), 'error');
      }
    },
    [selectedUser, editName, editEmail, editRole, editIsActive, isSelf, updateUser, addToast],
  );

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser) return;
      if (newPassword.length < 8) {
        addToast('Password baru minimal 8 karakter.', 'error');
        return;
      }
      try {
        await resetPassword.mutateAsync({
          id: selectedUser.id,
          newPassword,
        });
        addToast(
          `Password akun "${selectedUser.name}" berhasil direset.${isSelf ? ' Silakan login ulang.' : ''}`,
          'success',
        );
        setNewPassword('');
      } catch (err: any) {
        addToast(getFriendlyErrorMessage(err), 'error');
      }
    },
    [selectedUser, newPassword, isSelf, resetPassword, addToast],
  );

  const handleDelete = useCallback(
    async (userId: string) => {
      try {
        const target = users.find((u) => u.id === userId);
        await deleteUser.mutateAsync(userId);
        addToast(`Akun "${target?.name ?? userId}" berhasil dihapus.`, 'success');
        if (selectedUserId === userId) {
          setSelectedUserId(null);
          setActiveTab('list');
        }
        setConfirmDeleteId(null);
      } catch (err: any) {
        addToast(getFriendlyErrorMessage(err), 'error');
      }
    },
    [users, selectedUserId, deleteUser, addToast],
  );

  const canSubmitCreate = useMemo(
    () =>
      createName.trim().length > 0 &&
      createEmail.trim().length > 0 &&
      createPassword.length >= 8 &&
      createPassword === createConfirmPw,
    [createName, createEmail, createPassword, createConfirmPw],
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div id="user-management-panel" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3">
        <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
          <ShieldCheck size={16} className="text-teal-400" />
          Manajemen User
        </h4>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Kelola akun, peran, dan kredensial pengguna sistem
        </p>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 bg-slate-50/50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              title={tab.disabled ? tab.disabledTooltip : undefined}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all relative ${
                isActive
                  ? 'text-teal-700 bg-white'
                  : tab.disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    isActive
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-teal-500 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────────── */}
      <div className="p-4">
        {/* ── TAB: DAFTAR AKUN ─────────────────────────────────────────────── */}
        {activeTab === 'list' && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {usersQuery.isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-8 justify-center">
                <Loader2 size={14} className="animate-spin" />
                Memuat akun...
              </div>
            )}

            {usersQuery.isError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                Gagal memuat akun. Periksa koneksi.
              </div>
            )}

            {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-500 text-center">
                <Users size={28} className="mx-auto mb-2 text-slate-300" />
                <p>Belum ada akun aktif.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="mt-2 text-teal-600 font-bold hover:underline"
                >
                  + Tambah user pertama
                </button>
              </div>
            )}

            {users.map((account) => {
              const isSelected = selectedUserId === account.id;
              const isCurrentUser = account.id === currentUser?.id;
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleSelectUser(account)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/60 shadow-sm ring-1 ring-teal-500/20'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={account.name} role={account.role} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {account.name}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[8px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                            ANDA
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                        {account.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                          account.isActive
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {account.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                          ROLE_BADGE_COLORS[account.role] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {formatRoleLabel(account.role)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Quick add button at bottom of list */}
            {users.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-1 rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-teal-600 hover:border-teal-400 hover:bg-teal-50/30 text-[11px] font-bold transition-all"
              >
                <UserPlus size={13} />
                Tambah User Baru
              </button>
            )}
          </div>
        )}

        {/* ── TAB: TAMBAH USER ─────────────────────────────────────────────── */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-3.5">
            {/* Nama */}
            <div>
              <label htmlFor="create-name" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Nama Lengkap
              </label>
              <input
                id="create-name"
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Contoh: Rina Herawati"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition placeholder:text-slate-300"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="create-email" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Email
              </label>
              <input
                id="create-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="email@sekolah.sch.id"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition placeholder:text-slate-300"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="create-password" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="create-password"
                  type={showCreatePw ? 'text' : 'password'}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition placeholder:text-slate-300"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePw(!showCreatePw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showCreatePw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <PasswordStrengthBar password={createPassword} />
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label htmlFor="create-confirm-pw" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Konfirmasi Password
              </label>
              <input
                id="create-confirm-pw"
                type="password"
                value={createConfirmPw}
                onChange={(e) => setCreateConfirmPw(e.target.value)}
                placeholder="Ulangi password di atas"
                className={`w-full text-xs border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition placeholder:text-slate-300 ${
                  createConfirmPw && createConfirmPw !== createPassword
                    ? 'border-rose-300 focus:border-rose-500'
                    : 'border-slate-200 focus:border-teal-500'
                }`}
                required
              />
              {createConfirmPw && createConfirmPw !== createPassword && (
                <p className="text-[10px] text-rose-500 mt-1 font-semibold">
                  Password tidak cocok
                </p>
              )}
            </div>

            {/* Peran */}
            <div>
              <label htmlFor="create-role" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Peran
              </label>
              <RoleSelect id="create-role" value={createRole} onChange={setCreateRole} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmitCreate || createUser.isPending}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {createUser.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Membuat akun...
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Tambah User
                </>
              )}
            </button>
          </form>
        )}

        {/* ── TAB: DETAIL USER ─────────────────────────────────────────────── */}
        {activeTab === 'detail' && selectedUser && (
          <div className="space-y-5">
            {/* User header */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <UserAvatar name={selectedUser.name} role={selectedUser.role} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{selectedUser.name}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{selectedUser.email}</p>
              </div>
              {isSelf && (
                <span className="flex items-center gap-1 bg-teal-100 text-teal-700 text-[9px] font-bold px-2 py-1 rounded-lg flex-shrink-0">
                  <ShieldCheck size={11} />
                  Anda
                </span>
              )}
            </div>

            {/* Self-protection notice */}
            {isSelf && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <ShieldAlert size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-amber-800 leading-relaxed">
                  <strong>Proteksi diri sendiri aktif.</strong> Peran, status aktif, dan hapus akun
                  dinonaktifkan untuk mencegah lockout.
                </p>
              </div>
            )}

            {/* ─── Form Ubah Akun ──────────────────────────────────────── */}
            <form onSubmit={handleUpdate} className="space-y-3">
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Pencil size={12} />
                Ubah Akun
              </h5>

              <div>
                <label htmlFor="edit-name" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Nama
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-email" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-role" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Peran
                </label>
                <RoleSelect
                  id="edit-role"
                  value={editRole}
                  onChange={setEditRole}
                  disabled={isSelf}
                />
                {isSelf && (
                  <p className="text-[9px] text-slate-400 mt-0.5">Tidak dapat mengubah peran diri sendiri.</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    disabled={isSelf}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40 w-4 h-4"
                  />
                  <span className={`text-xs font-semibold ${isSelf ? 'text-slate-400' : 'text-slate-700'}`}>
                    Akun Aktif
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={updateUser.isPending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-40"
              >
                {updateUser.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Pencil size={14} />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <hr className="border-slate-100" />

            {/* ─── Form Reset Password ────────────────────────────────── */}
            <form onSubmit={handleResetPassword} className="space-y-3">
              <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <KeyRound size={12} />
                Reset Password
              </h5>

              <div>
                <label htmlFor="new-password" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 karakter"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition placeholder:text-slate-300"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <PasswordStrengthBar password={newPassword} />
              </div>

              <button
                type="submit"
                disabled={newPassword.length < 8 || resetPassword.isPending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-40"
              >
                {resetPassword.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Mereset...
                  </>
                ) : (
                  <>
                    <KeyRound size={14} />
                    Reset Password
                  </>
                )}
              </button>
            </form>

            {/* ─── Hapus Akun ──────────────────────────────────────────── */}
            {!isSelf && (
              <>
                <hr className="border-slate-100" />
                <div>
                  <h5 className="text-[11px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <Trash2 size={12} />
                    Zona Berbahaya
                  </h5>

                  {confirmDeleteId === selectedUser.id ? (
                    <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                      <p className="text-xs text-rose-800 font-semibold flex-1">
                        Hapus akun <strong>{selectedUser.name}</strong>?
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedUser.id)}
                        disabled={deleteUser.isPending}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {deleteUser.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : null}
                        Ya
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold rounded-lg transition"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selectedUser.id)}
                      className="w-full flex items-center justify-center gap-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs py-2.5 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                      Hapus Akun
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Fallback when detail tab is active but no user selected */}
        {activeTab === 'detail' && !selectedUser && (
          <div className="text-center py-8">
            <Settings size={32} className="mx-auto mb-2 text-slate-200" />
            <p className="text-xs text-slate-400">
              Pilih akun dari tab <strong>Daftar</strong> untuk melihat detail.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

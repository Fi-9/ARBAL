import { api } from '../lib/api';
import { UserAccount } from '../types';

function mapBackendUser(raw: any): UserAccount {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    isActive: Boolean(raw.isActive),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(raw.createdAt).toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(raw.updatedAt).toISOString(),
    role: raw.Role?.name ?? raw.roleId,
  };
}

export const userService = {
  getAll: async (): Promise<UserAccount[]> => {
    const { data } = await api.get<any[]>('/users');
    if (!Array.isArray(data)) return [];
    return data.map(mapBackendUser);
  },

  create: async (payload: { name: string; email: string; password: string; roleName: string }): Promise<UserAccount> => {
    const { data } = await api.post('/users', payload);
    return mapBackendUser(data);
  },

  updateProfile: async (id: string, payload: { name?: string; email?: string; roleName?: string; isActive?: boolean }): Promise<UserAccount> => {
    const { data } = await api.patch(`/users/${id}`, payload);
    return mapBackendUser(data);
  },

  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    await api.post(`/users/${id}/reset-password`, { newPassword });
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  getPermissions: async (): Promise<Record<string, string[]>> => {
    const { data } = await api.get<Record<string, string[]>>('/users/permissions');
    return data;
  },

  savePermissions: async (permissions: Record<string, string[]>): Promise<void> => {
    await api.post('/users/permissions', permissions);
  },
};

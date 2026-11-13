import { apiClient } from './apiClient';
import { BackendUser } from '../utils/mappers';

export const userService = {
  getUsers: async (): Promise<BackendUser[]> => {
    const response = await apiClient.get<BackendUser[]>('/users/');
    return response.data;
  },

  createUser: async (payload: {
    full_name: string;
    email: string;
    password?: string;
    role: 'ADMIN' | 'AGENT' | 'CUSTOMER';
  }): Promise<BackendUser> => {
    const response = await apiClient.post<BackendUser>('/users/', payload);
    return response.data;
  },

  updateUser: async (
    id: number | string,
    payload: {
      full_name?: string;
      role?: 'ADMIN' | 'AGENT' | 'CUSTOMER';
      is_active?: boolean;
    }
  ): Promise<BackendUser> => {
    const response = await apiClient.put<BackendUser>(`/users/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};


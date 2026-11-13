import { apiClient } from './apiClient';
import { BackendUser } from '../utils/mappers';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: BackendUser;
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      full_name: name,
      email,
      password,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<BackendUser> => {
    const response = await apiClient.get<BackendUser>('/auth/me');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },
};


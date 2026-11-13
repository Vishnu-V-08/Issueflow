import { apiClient } from './apiClient';

export interface BackendTeam {
  id: number;
  team_name: string;
  description?: string | null;
  created_at: string;
}

export const teamService = {
  getTeams: async (): Promise<BackendTeam[]> => {
    const response = await apiClient.get<BackendTeam[]>('/teams/');
    return response.data;
  },

  createTeam: async (payload: { team_name: string; description?: string }): Promise<BackendTeam> => {
    const response = await apiClient.post<BackendTeam>('/teams/', payload);
    return response.data;
  },

  updateTeam: async (id: number | string, payload: { team_name: string; description?: string }): Promise<BackendTeam> => {
    const response = await apiClient.put<BackendTeam>(`/teams/${id}`, payload);
    return response.data;
  },

  deleteTeam: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/teams/${id}`);
  },
};


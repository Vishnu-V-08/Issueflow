import { apiClient } from './apiClient';
import { BackendUser } from '../utils/mappers';

export interface BackendComment {
  id: number;
  ticket_id: number;
  user_id: number;
  content: string;
  created_at: string;
  author?: BackendUser | null;
}

export const commentService = {
  getTicketComments: async (ticketId: number | string): Promise<BackendComment[]> => {
    const response = await apiClient.get<BackendComment[]>(`/tickets/${ticketId}/comments`);
    return response.data;
  },

  addComment: async (ticketId: number | string, content: string): Promise<BackendComment> => {
    const response = await apiClient.post<BackendComment>(`/tickets/${ticketId}/comments`, {
      content,
    });
    return response.data;
  },

  deleteComment: async (commentId: number | string): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`);
  },
};


import { apiClient } from './apiClient';
import { BackendTicket } from '../utils/mappers';

export interface TicketListResponse {
  total: number;
  page: number;
  limit: number;
  items: BackendTicket[];
}

export interface TicketFilterParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: number;
}

export const ticketService = {
  getTickets: async (params?: TicketFilterParams): Promise<TicketListResponse> => {
    const response = await apiClient.get<TicketListResponse>('/tickets/', { params });
    return response.data;
  },

  getTicketById: async (id: number | string): Promise<BackendTicket> => {
    const response = await apiClient.get<BackendTicket>(`/tickets/${id}`);
    return response.data;
  },

  createTicket: async (payload: {
    title: string;
    description: string;
    category: string;
    priority: string;
    assigned_to?: number | null;
  }): Promise<BackendTicket> => {
    const response = await apiClient.post<BackendTicket>('/tickets/', payload);
    return response.data;
  },

  updateTicket: async (
    id: number | string,
    payload: {
      title?: string;
      description?: string;
      category?: string;
      priority?: string;
      status?: string;
      assigned_to?: number | null;
    }
  ): Promise<BackendTicket> => {
    const response = await apiClient.put<BackendTicket>(`/tickets/${id}`, payload);
    return response.data;
  },

  updateStatus: async (id: number | string, status: string): Promise<BackendTicket> => {
    const response = await apiClient.patch<BackendTicket>(`/tickets/${id}/status`, { status });
    return response.data;
  },

  assignTicket: async (id: number | string, assignedToId: number | null): Promise<BackendTicket> => {
    const response = await apiClient.post<BackendTicket>(`/tickets/${id}/assign`, {
      assigned_to: assignedToId,
    });
    return response.data;
  },

  deleteTicket: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/tickets/${id}`);
  },
};


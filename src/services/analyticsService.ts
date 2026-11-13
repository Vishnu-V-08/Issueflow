import { apiClient } from './apiClient';

export interface AnalyticsOverview {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  pending_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  resolution_rate: number;
}

export interface StatusDistributionItem {
  status: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PriorityDistributionItem {
  priority: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TicketTrendItem {
  date: string;
  label: string;
  created_count: number;
  resolved_count: number;
}

export interface AgentPerformanceItem {
  agent_id: number;
  agent_name: string;
  email: string;
  assigned_tickets: number;
  resolved_tickets: number;
  pending_tickets: number;
  resolution_rate: number;
}

export interface TeamPerformanceItem {
  team_id: number | null;
  team_name: string;
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  resolution_rate: number;
}

export interface AnalyticsFilterParams {
  period?: 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';
  start_date?: string;
  end_date?: string;
  assigned_to?: number;
}

export const analyticsService = {
  getOverview: async (params?: AnalyticsFilterParams): Promise<AnalyticsOverview> => {
    const response = await apiClient.get<AnalyticsOverview>('/analytics/overview', { params });
    return response.data;
  },

  getTicketsByStatus: async (params?: AnalyticsFilterParams): Promise<StatusDistributionItem[]> => {
    const response = await apiClient.get<StatusDistributionItem[]>('/analytics/tickets-by-status', { params });
    return response.data;
  },

  getTicketsByPriority: async (params?: AnalyticsFilterParams): Promise<PriorityDistributionItem[]> => {
    const response = await apiClient.get<PriorityDistributionItem[]>('/analytics/tickets-by-priority', { params });
    return response.data;
  },

  getTicketTrends: async (params?: AnalyticsFilterParams): Promise<TicketTrendItem[]> => {
    const response = await apiClient.get<TicketTrendItem[]>('/analytics/ticket-trends', { params });
    return response.data;
  },

  getAgentPerformance: async (params?: AnalyticsFilterParams): Promise<AgentPerformanceItem[]> => {
    const response = await apiClient.get<AgentPerformanceItem[]>('/analytics/agent-performance', { params });
    return response.data;
  },

  getTeamPerformance: async (params?: AnalyticsFilterParams): Promise<TeamPerformanceItem[]> => {
    const response = await apiClient.get<TeamPerformanceItem[]>('/analytics/team-performance', { params });
    return response.data;
  },
};

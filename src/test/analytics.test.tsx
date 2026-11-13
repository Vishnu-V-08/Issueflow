import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../services/analyticsService';
import { apiClient } from '../services/apiClient';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('Analytics Service Frontend Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls /analytics/overview with query parameters', async () => {
    const mockOverview = {
      total_tickets: 10,
      open_tickets: 3,
      in_progress_tickets: 2,
      pending_tickets: 1,
      resolved_tickets: 3,
      closed_tickets: 1,
      resolution_rate: 40.0,
    };
    (apiClient.get as any).mockResolvedValue({ data: mockOverview });

    const result = await analyticsService.getOverview({ period: '7d' });
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/overview', {
      params: { period: '7d' },
    });
    expect(result.total_tickets).toBe(10);
    expect(result.resolution_rate).toBe(40.0);
  });

  it('calls /analytics/tickets-by-status', async () => {
    const mockStatuses = [
      { status: 'OPEN', label: 'Open', count: 5, percentage: 50.0, color: '#f59e0b' },
      { status: 'RESOLVED', label: 'Resolved', count: 5, percentage: 50.0, color: '#10b981' },
    ];
    (apiClient.get as any).mockResolvedValue({ data: mockStatuses });

    const result = await analyticsService.getTicketsByStatus();
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/tickets-by-status', { params: undefined });
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('Open');
  });

  it('calls /analytics/agent-performance', async () => {
    const mockAgents = [
      {
        agent_id: 2,
        agent_name: 'Agent Bob',
        email: 'bob@example.com',
        assigned_tickets: 5,
        resolved_tickets: 4,
        pending_tickets: 1,
        resolution_rate: 80.0,
      },
    ];
    (apiClient.get as any).mockResolvedValue({ data: mockAgents });

    const result = await analyticsService.getAgentPerformance();
    expect(apiClient.get).toHaveBeenCalledWith('/analytics/agent-performance', { params: undefined });
    expect(result[0].agent_name).toBe('Agent Bob');
    expect(result[0].resolution_rate).toBe(80.0);
  });
});


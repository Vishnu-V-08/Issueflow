import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../services/aiService';
import { apiClient } from '../services/apiClient';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('AI Service Frontend Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls /ai/classify with title and description', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: {
        suggested_category: 'BILLING',
        confidence: 0.95,
        explanation: 'Payment signature failure keywords',
      },
    });

    const res = await aiService.classify({
      title: 'Stripe webhook failure',
      description: 'Signature invalid on checkout',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/ai/classify', {
      title: 'Stripe webhook failure',
      description: 'Signature invalid on checkout',
    });
    expect(res.suggested_category).toBe('BILLING');
    expect(res.confidence).toBe(0.95);
  });

  it('calls /ai/priority with title and description', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: {
        suggested_priority: 'CRITICAL',
        explanation: 'Production outage impacting revenue',
        urgency_factors: ['Payment failure', 'Production environment'],
        disclaimer: 'AI recommendation',
      },
    });

    const res = await aiService.priority({
      title: 'Checkout crashing',
      description: 'Customers unable to pay',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/ai/priority', {
      title: 'Checkout crashing',
      description: 'Customers unable to pay',
    });
    expect(res.suggested_priority).toBe('CRITICAL');
  });

  it('calls /ai/suggest-resolution', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: {
        possible_root_cause: 'Expired API secret',
        troubleshooting_steps: ['Check webhook secret in dashboard', 'Verify timestamps in headers'],
        recommended_resolution: 'Rotate webhook key in Stripe',
        disclaimer: 'AI recommendation',
      },
    });

    const res = await aiService.suggestResolution({
      ticket_id: 1042,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/ai/suggest-resolution', {
      ticket_id: 1042,
    });
    expect(res.troubleshooting_steps).toHaveLength(2);
  });
});

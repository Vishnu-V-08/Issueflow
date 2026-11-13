import { apiClient } from './apiClient';

export interface AIClassificationResult {
  suggested_category: string;
  confidence: number;
  explanation: string;
  alternative_category?: string | null;
}

export interface AIPriorityResult {
  suggested_priority: string;
  explanation: string;
  urgency_factors: string[];
  disclaimer: string;
}

export interface AISummaryResult {
  summary: string;
  key_points: string[];
  original_length: number;
  summary_length: number;
}

export interface AIResolutionResult {
  possible_root_cause: string;
  troubleshooting_steps: string[];
  recommended_resolution: string;
  disclaimer: string;
}

export interface AISentimentResult {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'FRUSTRATED';
  score: number;
  explanation: string;
  detected_emotions: string[];
}

export const aiService = {
  classify: async (payload: {
    title?: string;
    description?: string;
    ticket_id?: number;
  }): Promise<AIClassificationResult> => {
    const response = await apiClient.post<AIClassificationResult>('/ai/classify', payload);
    return response.data;
  },

  priority: async (payload: {
    title?: string;
    description?: string;
    ticket_id?: number;
  }): Promise<AIPriorityResult> => {
    const response = await apiClient.post<AIPriorityResult>('/ai/priority', payload);
    return response.data;
  },

  summarize: async (payload: {
    content?: string;
    max_words?: number;
    ticket_id?: number;
  }): Promise<AISummaryResult> => {
    const response = await apiClient.post<AISummaryResult>('/ai/summarize', payload);
    return response.data;
  },

  suggestResolution: async (payload: {
    title?: string;
    description?: string;
    ticket_id?: number;
  }): Promise<AIResolutionResult> => {
    const response = await apiClient.post<AIResolutionResult>('/ai/suggest-resolution', payload);
    return response.data;
  },

  sentiment: async (payload: {
    text?: string;
    ticket_id?: number;
  }): Promise<AISentimentResult> => {
    const response = await apiClient.post<AISentimentResult>('/ai/sentiment', payload);
    return response.data;
  },
};


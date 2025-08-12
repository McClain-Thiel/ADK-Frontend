import { AgentRunRequest, Event, Session, Content } from '../types';
import { appConfig } from '../config/app.config';

const API_BASE_URL = appConfig.api.baseUrl;

class ADKApiService {
  async listApps(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/list-apps`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to list apps: ${response.statusText}`);
    }
    return response.json();
  }

  async createSession(appName: string, userId: string, sessionId: string, state?: Record<string, any>): Promise<Session> {
    const response = await fetch(`${API_BASE_URL}/apps/${appName}/users/${userId}/sessions/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state || {}),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }
    return response.json();
  }

  async getSession(appName: string, userId: string, sessionId: string): Promise<Session> {
    const response = await fetch(`${API_BASE_URL}/apps/${appName}/users/${userId}/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }
    return response.json();
  }

  async runAgent(request: AgentRunRequest): Promise<Event[]> {
    const response = await fetch(`${API_BASE_URL}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to run agent: ${response.statusText}`);
    }
    return response.json();
  }

  async *runAgentStreaming(request: AgentRunRequest): AsyncGenerator<Event, void, unknown> {
    const response = await fetch(`${API_BASE_URL}/run_sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, streaming: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to run agent streaming: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body reader available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              yield eventData;
            } catch (e) {
              console.warn('Failed to parse SSE event:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  createContent(text: string): Content {
    return {
      parts: [{ text }],
      role: 'user'
    };
  }

  /**
   * Extracts only the final text output from ADK response parts,
   * filtering out thinking/reasoning content and taking only the last text part
   */
  extractFinalText(parts: any[]): string {
    const textParts = parts.filter(part => part.text);
    
    if (textParts.length === 0) {
      return '';
    }
    
    // Return only the last text part (final output), skip thinking/reasoning
    return textParts[textParts.length - 1].text;
  }
}

export const adkApi = new ADKApiService();
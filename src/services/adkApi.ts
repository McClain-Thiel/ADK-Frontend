import { v4 as uuidv4 } from 'uuid';
import { AgentRunRequest, Event, Session, Content, StreamEvent } from '../types';
import { appConfig } from '../config/app.config';

const API_BASE_URL = appConfig.api.baseUrl;

class ADKApiService {
  private sessions = new Map<string, Session>();

  /**
   * Extract detailed error information from response
   */
  private async extractErrorDetails(response: Response): Promise<string> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        return errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      } else {
        const errorText = await response.text();
        return errorText || `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }

  /**
   * Retry mechanism with exponential backoff and detailed error reporting
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  async listApps(): Promise<string[]> {
    return this.retryWithBackoff(async () => {
      const response = await fetch(`${API_BASE_URL}/list-apps`, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorDetail = await this.extractErrorDetails(response);
        throw new Error(`Failed to list apps: ${errorDetail}`);
      }
      
      return response.json();
    });
  }

  /**
   * Creates a session with proper UUID generation and retry logic
   */
  async createSession(appName: string, userId?: string, sessionId?: string): Promise<Session> {
    const finalUserId = userId || `u_${Date.now()}`;
    const finalSessionId = sessionId || uuidv4();
    
    return this.retryWithBackoff(async () => {
      const response = await fetch(`${API_BASE_URL}/apps/${appName}/users/${finalUserId}/sessions/${finalSessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const errorDetail = await this.extractErrorDetails(response);
        throw new Error(`Failed to create session: ${errorDetail}`);
      }
      
      const session = await response.json();
      session.appName = appName;
      session.userId = finalUserId;
      session.sessionId = finalSessionId;
      
      // Cache the session
      this.sessions.set(finalSessionId, session);
      
      return session;
    });
  }

  async getSession(appName: string, userId: string, sessionId: string): Promise<Session> {
    // Return cached session if available
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }
    
    return this.retryWithBackoff(async () => {
      const response = await fetch(`${API_BASE_URL}/apps/${appName}/users/${userId}/sessions/${sessionId}`);
      if (!response.ok) {
        const errorDetail = await this.extractErrorDetails(response);
        throw new Error(`Failed to get session: ${errorDetail}`);
      }
      
      const session = await response.json();
      this.sessions.set(sessionId, session);
      return session;
    });
  }

  /**
   * Stream chat messages using proper Server-Sent Events parsing
   * Based on Google's ADK samples implementation
   */
  async *streamChatMessages(
    appName: string,
    userId: string,
    sessionId: string,
    message: string
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const content = {
      parts: [{ text: message }],
      role: 'user'
    };

    const requestBody = {
      appName,
      userId,
      sessionId,
      newMessage: content,
      streaming: true
    };

    const response = await fetch(`${API_BASE_URL}/run_sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorDetail = await this.extractErrorDetails(response);
      throw new Error(`Failed to stream chat: ${errorDetail}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body reader available');
    }

    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                yield {
                  type: 'error',
                  error: parsed.error,
                  id: uuidv4(),
                  timestamp: Date.now(),
                  isComplete: true,
                } as StreamEvent;
                return;
              }
              yield this.processStreamEvent(parsed);
            } catch (e) {
              console.warn('Failed to parse SSE data:', data, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Process and normalize stream events
   */
  private processStreamEvent(eventData: any): StreamEvent {
    return {
      id: eventData.id || uuidv4(),
      timestamp: eventData.timestamp || Date.now(),
      type: this.determineEventType(eventData),
      content: eventData.content,
      agent: eventData.author,
      functionCall: eventData.content?.parts?.find((p: any) => p.functionCall)?.functionCall,
      functionResponse: eventData.content?.parts?.find((p: any) => p.functionResponse)?.functionResponse,
      text: this.extractFinalText(eventData.content?.parts || []),
      isComplete: !eventData.partial && (eventData.isComplete || false)
    };
  }

  /**
   * Determine event type based on content
   */
  private determineEventType(eventData: any): string {
    if (eventData.error) {
      return 'error';
    }
    if (eventData.content?.parts?.some((p: any) => p.thought)) {
      return 'thought';
    }
    if (eventData.content?.parts?.some((p: any) => p.functionCall)) {
      return 'function_call';
    }
    if (eventData.content?.parts?.some((p: any) => p.functionResponse)) {
      return 'function_response';
    }
    if (eventData.content?.parts?.some((p: any) => p.text)) {
      return 'text';
    }
    return 'unknown';
  }

  /**
   * Fallback non-streaming method
   */
  async runAgent(request: AgentRunRequest): Promise<Event[]> {
    return this.retryWithBackoff(async () => {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorDetail = await this.extractErrorDetails(response);
        throw new Error(`Failed to run agent: ${errorDetail}`);
      }
      
      return response.json();
    });
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
    if (!parts || parts.length === 0) {
      return '';
    }
    
    return parts
      .filter(part => !part.hasOwnProperty('thought') && part.text)
      .map(part => part.text)
      .join('');
  }

  /**
   * Check if backend is ready
   */
  async isBackendReady(): Promise<boolean> {
    try {
      const apps = await this.listApps();
      return apps.length > 0;
    } catch {
      return false;
    }
  }
}

export const adkApi = new ADKApiService();
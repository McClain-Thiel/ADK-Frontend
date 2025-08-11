export interface AgentRunRequest {
  appName: string;
  userId: string;
  sessionId: string;
  newMessage: Content;
  streaming?: boolean;
  stateDelta?: Record<string, any>;
}

export interface Content {
  parts: Part[];
  role?: string;
}

export interface Part {
  text?: string;
  thoughtSignature?: string;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface FunctionResponse {
  name: string;
  response: Record<string, any>;
}

export interface Event {
  id: string;
  timestamp: number;
  content?: Content;
  usageMetadata?: any;
  invocationId?: string;
  author?: string;
  actions?: any;
}

export interface Session {
  sessionId: string;
  userId: string;
  appName: string;
  createdAt: string;
  updatedAt: string;
  state?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
}

export interface AppInfo {
  name: string;
  description?: string;
}
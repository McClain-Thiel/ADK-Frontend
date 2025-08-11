export interface AppConfig {
  api: {
    baseUrl: string;
    port: number;
  };
  agent: {
    name: string;
  };
  ui: {
    appTitle: string;
    headerTitle: string;
    welcomeMessage: {
      title: string;
      subtitle: string;
    };
  };
  user: {
    idPrefix: string;
  };
}

// Determine if we're in development or production
const isDevelopment = import.meta.env.DEV;

export const appConfig: AppConfig = {
  api: {
    // In development: use proxy to local backend
    // In production: use deployed Google Cloud Run backend
    baseUrl: isDevelopment ? '/api' : 'https://adk-default-service-name-987669306571.us-central1.run.app',
    port: isDevelopment ? 8002 : 443,
  },
  agent: {
    name: 'dealer_agent',
  },
  ui: {
    appTitle: 'Google ADK Demo',
    headerTitle: 'Google ADK Demo',
    welcomeMessage: {
      title: 'Car Dealership Demo',
      subtitle: 'This is a demonstration of Google\'s Agent Development Kit (ADK) showcasing an AI-powered car dealership assistant.',
    },
  },
  user: {
    idPrefix: 'user',
  },
};

export default appConfig;
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

// Force use production backend for local testing
const USE_PRODUCTION_BACKEND = import.meta.env.VITE_USE_PRODUCTION_BACKEND === 'true';

export const appConfig: AppConfig = {
  api: {
    // Use production backend if flag is set, otherwise use normal dev/prod logic
    baseUrl: (isDevelopment && !USE_PRODUCTION_BACKEND) 
      ? '/api' 
      : 'https://adk-default-service-name-987669306571.us-central1.run.app',
    port: (isDevelopment && !USE_PRODUCTION_BACKEND) ? 8002 : 443,
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
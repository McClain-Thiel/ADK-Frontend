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

export const appConfig: AppConfig = {
  api: {
    baseUrl: '/api',
    port: 8002,
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
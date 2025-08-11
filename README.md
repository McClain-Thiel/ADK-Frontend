# Google ADK Demo - Car Dealership Assistant

A React frontend for Google's Agent Development Kit (ADK) demonstrating an AI-powered car dealership assistant.

## Features

- 🤖 **AI-Powered Chat**: Integrated with Google ADK backend
- 📝 **Markdown Support**: Rich text formatting in agent responses  
- 💫 **Smooth Animations**: Loading bubbles and hover effects
- 🎨 **Modern UI**: Clean, professional design with gradients
- ⚙️ **Configurable**: Easy customization through config file

## Configuration

All hardcoded values are centralized in `src/config/app.config.ts`:

```typescript
export const appConfig = {
  api: {
    baseUrl: '/api',           // API endpoint base URL
    port: 8002,               // Backend port (documented, actual proxy in vite.config.ts)
  },
  agent: {
    name: 'dealer_agent',     // ADK agent name to use
  },
  ui: {
    appTitle: 'Google ADK Demo',               // Browser title
    headerTitle: 'Google ADK Demo',            // Header text
    welcomeMessage: {
      title: 'Car Dealership Demo',           // Welcome title
      subtitle: 'This is a demonstration...',  // Welcome subtitle
    },
  },
  user: {
    idPrefix: 'user',         // User ID prefix
  },
};
```

## Customization

To customize the app:

1. **Change the agent**: Update `agent.name` to use a different ADK agent
2. **Update branding**: Modify `ui.appTitle`, `ui.headerTitle` for your brand
3. **Change welcome message**: Edit `ui.welcomeMessage` for different intro text
4. **Backend URL**: Update `api.baseUrl` if using different proxy setup

## Development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173` and proxies API requests to `http://127.0.0.1:8002`.

## Backend Requirements

Requires a running ADK backend with:
- Agent named as configured in `agent.name` (default: `dealer_agent`)
- Running on port 8002 (configurable via Vite proxy)
- Standard ADK API endpoints (`/list-apps`, `/run`, etc.)

## Architecture

- **React 18** with TypeScript
- **Vite** for development and building  
- **react-markdown** for rich message formatting
- **CSS** with custom animations and modern styling
- **Proxy setup** to handle CORS with ADK backend
# ADK-Frontend

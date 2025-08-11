import { useState } from 'react'
import { ChatInterface } from './components/ChatInterface'
import { appConfig } from './config/app.config'
import './App.css'

function App() {
  const [userId] = useState(() => `${appConfig.user.idPrefix}-${Date.now()}`);

  return (
    <div className="app">
      <div className="app-header">
        <h1>{appConfig.ui.headerTitle}</h1>
        <div className="user-info">User: {userId}</div>
      </div>
      <ChatInterface appName={appConfig.agent.name} userId={userId} />
    </div>
  );
}

export default App

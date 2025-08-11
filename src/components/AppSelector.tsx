import React, { useState, useEffect } from 'react';
import { adkApi } from '../services/adkApi';
import './AppSelector.css';

interface AppSelectorProps {
  onAppSelected: (appName: string) => void;
}

export const AppSelector: React.FC<AppSelectorProps> = ({ onAppSelected }) => {
  const [apps, setApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<string>('');

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      setError(null);
      const appList = await adkApi.listApps();
      setApps(appList);
      if (appList.length === 1) {
        setSelectedApp(appList[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apps');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedApp) {
      onAppSelected(selectedApp);
    }
  };

  if (loading) {
    return (
      <div className="app-selector">
        <div className="loading">Loading available apps...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-selector">
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={loadApps} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="app-selector">
        <div className="no-apps">
          <h3>No Apps Available</h3>
          <p>No ADK apps are currently running on the backend.</p>
          <button onClick={loadApps} className="retry-button">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-selector">
      <div className="selector-content">
        <h2>Select an ADK App</h2>
        <p>Choose which agent application you want to chat with:</p>
        
        <form onSubmit={handleSubmit}>
          <div className="app-list">
            {apps.map((app) => (
              <label key={app} className="app-option">
                <input
                  type="radio"
                  name="selectedApp"
                  value={app}
                  checked={selectedApp === app}
                  onChange={(e) => setSelectedApp(e.target.value)}
                />
                <span className="app-name">{app}</span>
              </label>
            ))}
          </div>
          
          <button 
            type="submit" 
            disabled={!selectedApp}
            className="start-chat-button"
          >
            Start Chat
          </button>
        </form>
      </div>
    </div>
  );
};
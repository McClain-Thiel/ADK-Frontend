import React from 'react';
import './ErrorDisplay.css';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, onDismiss }) => {
  return (
    <div className="error-display">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <div className="error-message">
          <h4>Backend Error</h4>
          <p>{error}</p>
        </div>
        <div className="error-actions">
          {onRetry && (
            <button onClick={onRetry} className="retry-button">
              Retry
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="dismiss-button">
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
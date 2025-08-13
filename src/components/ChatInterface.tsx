import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { adkApi } from '../services/adkApi';
import { LoadingBubbles } from './LoadingBubbles';
import { ErrorDisplay } from './ErrorDisplay';

import { appConfig } from '../config/app.config';
import './ChatInterface.css';

interface ChatInterfaceProps {
  appName: string;
  userId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ appName, userId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [, setSession] = useState<any>(null);
  const [backendReady, setBackendReady] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeApp();
  }, [appName, userId]);

  const initializeApp = async () => {
    try {
      setBackendError(null);
      
      // Check if backend is ready
      const ready = await adkApi.isBackendReady();
      setBackendReady(ready);
      
      if (ready) {
        // Create session with proper retry logic
        const newSession = await adkApi.createSession(appName, userId);
        setSession(newSession);
        setSessionId(newSession.sessionId);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setBackendReady(false);
      setBackendError(error instanceof Error ? error.message : 'Unknown initialization error');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !sessionId) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');
    setIsLoading(true);

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      let accumulatedText = '';
      let lastSeenText = '';

      // Use the new streaming API
      for await (const event of adkApi.streamChatMessages(appName, userId, sessionId, messageText)) {
        if (event.type === 'text' && event.text) {
          // Skip if we've already seen this exact text (prevents duplicates)
          if (event.text === lastSeenText) {
            continue;
          }
          
          // If this is a complete message (not partial), use it directly
          // Otherwise, accumulate partial chunks
          if (event.isComplete) {
            accumulatedText = event.text;
          } else {
            accumulatedText += event.text;
          }
          
          lastSeenText = event.text;
          
          // Update the message with streaming text
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: accumulatedText, isLoading: !event.isComplete }
                : msg
            )
          );
        } else if (event.type === 'function_call') {
          // Handle function calls if needed
          console.log('Function call:', event.functionCall);
        } else if (event.type === 'function_response') {
          // Handle function responses if needed
          console.log('Function response:', event.functionResponse);
        }

        // If this is marked as complete, we're done
        if (event.isComplete) {
          break;
        }
      }

      // Final update to mark as complete
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { 
                ...msg, 
                content: accumulatedText || 'No response received', 
                isLoading: false 
              }
            : msg
        )
      );

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Fallback to non-streaming API
      try {
        const request = {
          appName,
          userId,
          sessionId,
          newMessage: adkApi.createContent(messageText),
        };
        
        const events = await adkApi.runAgent(request);
        if (events && events.length > 0) {
          const lastEvent = events[events.length - 1];
          if (lastEvent.content?.parts) {
            const responseContent = adkApi.extractFinalText(lastEvent.content.parts);
            
            setMessages(prev => 
              prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: responseContent || 'No response received', isLoading: false }
                  : msg
              )
            );
          }
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: `❌ **Backend Error:**\n\n\`${errorMessage}\``, isLoading: false }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show loading state while backend is not ready
  if (!backendReady || !sessionId) {
    return (
      <div className="chat-interface">
        <div className="chat-header">
          <div className="welcome-message">
            <h3>Connecting to Agent...</h3>
            <p>Please wait while we establish a connection to the backend service.</p>
          </div>
        </div>
        <div className="messages-container">
          {backendError ? (
            <ErrorDisplay error={backendError} onRetry={initializeApp} />
          ) : (
            <div className="loading-state">
              <LoadingBubbles />
              <p>Initializing session...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="welcome-message">
          <h3>{appConfig.ui.welcomeMessage.title}</h3>
          <p>{appConfig.ui.welcomeMessage.subtitle}</p>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.role}`}
          >
            <div className="message-content">
              {message.isLoading ? (
                <LoadingBubbles />
              ) : message.role === 'assistant' ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
          rows={3}
        />
        <button 
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          className="send-button"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};
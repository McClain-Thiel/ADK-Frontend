import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { adkApi } from '../services/adkApi';
import { LoadingBubbles } from './LoadingBubbles';
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
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeSession();
  }, [appName, userId, sessionId]);

  const initializeSession = async () => {
    try {
      await adkApi.createSession(appName, userId, sessionId);
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
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
      const request = {
        appName,
        userId,
        sessionId,
        newMessage: adkApi.createContent(inputValue),
        streaming: true,
      };

      let responseContent = '';
      
      // For now, use non-streaming to get the response working
      try {
        const events = await adkApi.runAgent(request);
        if (events && events.length > 0) {
          const lastEvent = events[events.length - 1];
          if (lastEvent.content?.parts) {
            for (const part of lastEvent.content.parts) {
              if (part.text) {
                responseContent += part.text;
              }
            }
          }
        }
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: responseContent || 'No response received', isLoading: false }
              : msg
          )
        );
      } catch (streamError) {
        // Fallback to non-streaming if streaming fails
        console.warn('Streaming failed, falling back to regular request:', streamError);
        const events = await adkApi.runAgent({ ...request, streaming: false });
        if (events && events.length > 0) {
          const lastEvent = events[events.length - 1];
          if (lastEvent.content?.parts) {
            for (const part of lastEvent.content.parts) {
              if (part.text) {
                responseContent += part.text;
              }
            }
          }
        }
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: responseContent || 'No response received', isLoading: false }
              : msg
          )
        );
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, isLoading: false }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: 'Error: Failed to get response from agent', isLoading: false }
            : msg
        )
      );
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
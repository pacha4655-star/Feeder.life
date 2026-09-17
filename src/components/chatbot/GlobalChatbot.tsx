'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface GlobalChatbotProps {
  user?: UserSession | null;
}

export default function GlobalChatbot({ user }: GlobalChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quickPrompts = [
    '🐶 Safe feeding for street dogs',
    '💬 En dog saapdala enna panna?',
    '🚨 How to report an SOS emergency',
    '📝 Write an animal adoption post',
    '🐾 First aid for an injured animal',
    '🥗 Toxic foods pets should never eat',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (textareaRef.current) {
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  }, [isOpen, messages, isThinking]);

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setErrorMessage(null);
    setInputQuery('');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isThinking) return;

    // 1. Immediate local render (0ms delay)
    const userMessage: ChatMessage = {
      id: `usr_msg_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setErrorMessage(null);
    setIsThinking(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          conversationId,
          stream: true,
        }),
      });

      if (res.status === 401) {
        setErrorMessage('Please sign in to chat with Feeder AI.');
        setIsThinking(false);
        return;
      }
      if (res.status === 429) {
        setErrorMessage("You're sending messages too quickly. Please try again in a moment.");
        setIsThinking(false);
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.error || "Sorry, I couldn't process that right now. Please try again.");
        setIsThinking(false);
        return;
      }

      const returnedConvId = res.headers.get('X-Conversation-Id');
      if (returnedConvId) {
        setConversationId(returnedConvId);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/plain') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        const aiMsgId = `ai_msg_${Date.now()}`;

        // Initialize empty assistant bubble immediately on first stream chunk
        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
          },
        ]);
        setIsThinking(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, content: accumulated } : m))
          );
        }
      } else {
        const data = await res.json();
        if (data.success) {
          if (data.conversationId) setConversationId(data.conversationId);
          setMessages((prev) => [
            ...prev,
            {
              id: data.messageId || `ai_msg_${Date.now()}`,
              role: 'assistant',
              content: data.content,
              createdAt: data.createdAt || new Date().toISOString(),
            },
          ]);
        } else {
          setErrorMessage(data.error || "Sorry, I couldn't process that right now. Please try again.");
        }
      }
    } catch {
      setErrorMessage('Network connection error. Please check your internet connection.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* 1. Floating Feeder AI Trigger Button */}
      {!isOpen && (
        <div className="global-chatbot-fab-wrap">
          <button
            onClick={() => setIsOpen(true)}
            className="global-chatbot-fab"
            aria-label="Open Feeder AI"
            title="Feeder AI"
          >
            <div className="global-chatbot-fab-inner">
              <img
                src="/images/feeder-icon.svg"
                alt="Feeder AI"
                className="global-chatbot-fab-icon"
              />
            </div>
            <span className="global-chatbot-fab-pulse" />
          </button>
        </div>
      )}

      {/* 2. Floating Chatbot Panel */}
      {isOpen && (
        <div className="global-chatbot-panel card">
          {/* Header */}
          <div className="global-chatbot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div className="global-chatbot-header-avatar">
                <img src="/images/feeder-icon.svg" alt="Feeder" style={{ width: '22px', height: '22px' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Feeder AI</span>
                  <span className="global-chatbot-status-dot" title="Gemini-Powered AI Companion" />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                  Fast Multilingual AI
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {messages.length > 0 && (
                <button
                  onClick={handleNewChat}
                  className="global-chatbot-btn-icon"
                  title="Start New Chat"
                  aria-label="New Chat"
                >
                  <RefreshCw size={15} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="global-chatbot-btn-icon"
                title="Minimize Chat"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="global-chatbot-body">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="global-chatbot-welcome">
                <div className="global-chatbot-welcome-icon">
                  <img src="/images/feeder-icon.svg" alt="Feeder" style={{ width: '36px', height: '36px' }} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Hi, {user?.fullName?.split(' ')[0] || 'there'}! 🐾
                </h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
                  I&apos;m Feeder AI, powered by Google Gemini. Ask me anything in English, Tamil, Tanglish, Hindi, or any language!
                </p>

                <div className="global-chatbot-quick-list">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt.replace(/^[^\s]+\s/, ''))}
                      className="global-chatbot-quick-btn"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`global-chatbot-msg-row ${msg.role === 'user' ? 'msg-user' : 'msg-assistant'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="global-chatbot-msg-avatar">
                    <img src="/images/feeder-icon.svg" alt="Feeder" style={{ width: '16px', height: '16px' }} />
                  </div>
                )}
                <div className={`global-chatbot-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45, fontSize: '13px' }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking Indicator */}
            {isThinking && (
              <div className="global-chatbot-msg-row msg-assistant">
                <div className="global-chatbot-msg-avatar">
                  <img src="/images/feeder-icon.svg" alt="Feeder" style={{ width: '16px', height: '16px' }} />
                </div>
                <div className="global-chatbot-bubble bubble-assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                  <Loader2 className="animate-spin" size={15} color="var(--brand-primary)" />
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Thinking...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="global-chatbot-error">
                <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', flex: 1 }}>{errorMessage}</span>
                <button
                  onClick={() => handleSendMessage()}
                  className="btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="global-chatbot-footer">
            <div className="global-chatbot-input-wrap">
              <textarea
                ref={textareaRef}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Feeder AI in any language..."
                rows={1}
                disabled={isThinking}
                className="global-chatbot-input"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isThinking}
                className="global-chatbot-send-btn"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
            <div className="global-chatbot-disclaimer">
              Educational guide. Consult a licensed veterinarian for medical emergencies.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import SOSModal from '@/components/sos/SOSModal';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ConversationItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AskFeederClientProps {
  user: UserSession | null;
}

export default function AskFeederClient({ user }: AskFeederClientProps) {
  const router = useRouter();

  // State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-collapse sidebar on mobile
  const isMobileWidth = () => typeof window !== 'undefined' && window.innerWidth < 768;

  const starterPrompts = [
    'My dog is not eating since yesterday. What should I check?',
    'I found an injured street dog. What should I do first?',
    'How can I create a community in Feeder?',
    'How do I upload a story from my phone?',
    'Can I change my profile picture?',
    'What should I consider before adopting a dog?',
  ];

  // Auto-scroll on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Load user conversations
  const loadConversations = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/ai/conversations');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
        }
      }
    } catch {
      // Background load notice
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user]);

  // Select conversation and load messages
  const handleSelectConversation = async (convId: string) => {
    setCurrentConversationId(convId);
    setErrorMessage(null);
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/ai/conversations/${convId}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setErrorMessage(data.error || 'Unable to load conversation history.');
      }
    } catch {
      setErrorMessage('Network error loading conversation history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Start a fresh conversation
  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setErrorMessage(null);
    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (currentConversationId === convId) {
          handleNewConversation();
        }
      }
    } catch {
      alert('Could not delete conversation. Please try again.');
    }
  };

  // Send message with progressive streaming support
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend ?? inputQuery;
    const text = rawText.trim();
    if (!text || isThinking) return;

    if (!user) {
      setErrorMessage('Please sign in to chat with Ask Feeder AI.');
      return;
    }

    setErrorMessage(null);

    // Optimistic user message
    const tempUserMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempUserMsgId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: currentConversationId,
          stream: true,
        }),
      });

      if (res.status === 429) {
        setErrorMessage("You've reached the current usage limit. Please try again later.");
        setIsThinking(false);
        return;
      }

      if (res.status === 401) {
        setErrorMessage('Unauthorized. Please sign in to continue.');
        setIsThinking(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.error || 'Ask Feeder is temporarily unavailable. Please try again.');
        setIsThinking(false);
        return;
      }

      const returnedConvId = res.headers.get('X-Conversation-Id');
      if (returnedConvId && !currentConversationId) {
        setCurrentConversationId(returnedConvId);
        loadConversations();
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
          if (!currentConversationId && data.conversationId) {
            setCurrentConversationId(data.conversationId);
            loadConversations();
          }
          const assistantMsg: ChatMessage = {
            id: data.messageId || `ai_msg_${Date.now()}`,
            role: 'assistant',
            content: data.content,
            createdAt: data.createdAt || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          setErrorMessage(data.error || 'Ask Feeder is temporarily unavailable. Please try again.');
        }
      }
    } catch {
      setErrorMessage('Something went wrong. Please check your network connection.');
    } finally {
      setIsThinking(false);
    }
  };

  // Keyboard handler: Enter = send, Shift+Enter = new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuery(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div
      className="ask-feeder-chat-container"
      style={{
        display: 'flex',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        position: 'relative',
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      {/* 1. Conversations Sidebar */}
      <aside
        style={{
          width: showSidebar ? '280px' : '0px',
          minWidth: showSidebar ? '260px' : '0px',
          borderRight: showSidebar ? '1px solid var(--border-subtle)' : 'none',
          background: 'var(--bg-secondary)',
          display: showSidebar ? 'flex' : 'none',
          flexDirection: 'column',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleNewConversation}
            className="btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              fontSize: '13.5px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <Plus size={16} />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              padding: '6px 8px',
            }}
          >
            Recent Chats
          </div>

          {conversations.length === 0 ? (
            <div
              style={{
                padding: '24px 12px',
                textAlign: 'center',
                fontSize: '12.5px',
                color: 'var(--text-muted)',
              }}
            >
              No conversations yet. Ask a question to begin!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {conversations.map((conv) => {
                const isActive = conv.id === currentConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isActive ? 'var(--brand-primary-light)' : 'transparent',
                      color: isActive ? 'var(--brand-primary)' : 'var(--text-main)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'background 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <MessageSquare size={15} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.title}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      title="Delete chat"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        padding: '4px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Safety Footer */}
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldCheck size={16} color="var(--brand-primary)" />
          <span>Educational AI • For urgent trauma call a vet or trigger SOS</span>
        </div>
      </aside>

      {/* 2. Main Chat Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              title={showSidebar ? 'Hide chat history' : 'Show chat history'}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showSidebar ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 8px rgba(139, 92, 246, 0.3)',
              }}
            >
              <Sparkles size={18} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h1 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Ask Feeder
                </h1>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 6px',
                    background: 'var(--brand-primary-light)',
                    color: 'var(--brand-primary)',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  AI Welfare Companion
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Animal welfare, pet care, street feeding, triage guidance & Feeder navigation
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsSosModalOpen(true)}
              className="btn-danger"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              🚨 Report SOS
            </button>
          </div>
        </div>

        {/* Chat History & Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {isLoadingHistory ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                gap: '8px',
                fontSize: '13.5px',
              }}
            >
              <RefreshCw size={16} className="animate-spin" />
              <span>Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            /* Empty State */
            <div
              style={{
                margin: 'auto',
                maxWidth: '620px',
                textAlign: 'center',
                padding: '30px 16px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(46, 125, 50, 0.15) 100%)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Sparkles size={32} color="#8b5cf6" />
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Ask Feeder about animals, feeding, rescue, adoption, or Feeder.life.
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                Get trusted assistance on safe feeding ingredients, educational first-aid triage, community care, or
                platform features like Posts, Stories, and SOS alerts.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '10px',
                  textAlign: 'left',
                }}
              >
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      fontSize: '12.5px',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      lineHeight: 1.4,
                      transition: 'border 0.15s ease, transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand-primary)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Bubbles */
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    gap: '12px',
                    alignItems: 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  {/* Avatar */}
                  {isUser ? (
                    user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username || 'User'}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1.5px solid var(--border-subtle)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'var(--brand-primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )
                  ) : (
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      🐾
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div
                    style={{
                      maxWidth: '78%',
                      background: isUser ? 'var(--brand-primary-light)' : 'var(--bg-secondary)',
                      color: isUser ? 'var(--text-main)' : 'var(--text-main)',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '14px 16px',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      border: isUser ? '1px solid #bbf7d0' : '1px solid var(--border-subtle)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}

          {/* Thinking / Typing indicator */}
          {isThinking && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}
              >
                🐾
              </div>
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '10px 16px',
                  fontSize: '13.5px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <RefreshCw size={14} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '8px 12px',
              transition: 'border 0.15s ease',
            }}
          >
            <textarea
              ref={textareaRef}
              value={inputQuery}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                user
                  ? 'Ask about animal care, feeding safety, injury first aid, or Feeder features... (Enter to send, Shift+Enter for new line)'
                  : 'Please sign in to ask Feeder AI'
              }
              disabled={!user || isThinking}
              rows={1}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                resize: 'none',
                outline: 'none',
                fontSize: '14px',
                lineHeight: 1.5,
                maxHeight: '120px',
                fontFamily: 'inherit',
                color: 'var(--text-main)',
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputQuery.trim() || isThinking || !user}
              className="btn-primary"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                flexShrink: 0,
                cursor: !inputQuery.trim() || isThinking || !user ? 'not-allowed' : 'pointer',
                opacity: !inputQuery.trim() || isThinking || !user ? 0.5 : 1,
              }}
              title="Send Message"
            >
              <Send size={16} />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '6px',
              padding: '0 4px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
              gap: '4px',
              minWidth: 0,
            }}
          >
            <span style={{ minWidth: 0, flex: '1 1 200px' }}>Ask Feeder provides educational welfare guidance, not formal veterinary certification.</span>
            <span style={{ flexShrink: 0 }}>{inputQuery.length}/2000</span>
          </div>
        </div>
      </main>

      {/* SOS Modal triggerable directly */}
      <SOSModal
        user={user}
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        onSosCreated={() => {
          router.push('/sos');
        }}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  ArrowLeft,
  Trash2,
  Reply,
  Loader2,
  Check,
  CheckCheck,
  Paperclip,
  X,
  AlertCircle,
  ChevronDown,
  UserX,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import type { ConversationSummary, ChatMessage } from '@/lib/services/messaging';
import { formatTime } from '@/lib/utils/date';
import { getSupabaseClient } from '@/lib/supabase/client';

interface MessagesClientProps {
  user: UserSession | null;
  initialConversations: ConversationSummary[];
  availableGuardians: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string;
    role: string;
  }[];
  initialSelectedConvId?: string | null;
}

export default function MessagesClient({
  user,
  initialConversations,
  availableGuardians,
  initialSelectedConvId,
}: MessagesClientProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    initialSelectedConvId || (initialConversations.length > 0 ? initialConversations[0].id : null)
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [guardianFilter, setGuardianFilter] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrolledToBottomRef = useRef(true);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !initialSelectedConvId && initialConversations.length > 0) {
        setSelectedConvId(null);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [initialSelectedConvId, initialConversations.length]);

  const activeConversation = conversations.find((c) => c.id === selectedConvId);

  // Scroll handler to track whether user is at bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 80;
    isScrolledToBottomRef.current = isBottom;
    if (isBottom) {
      setHasNewMessagesBelow(false);
    }
  };

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      setHasNewMessagesBelow(false);
    }
  }, []);

  // Fetch messages when conversation changes
  const fetchMessages = useCallback(
    async (convId: string, isSilent = false) => {
      if (!isSilent) setIsLoadingMessages(true);
      setSendError(null);
      try {
        const res = await fetch(`/api/messages/conversations/${convId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setMessages((prev) => {
            const hasChanged = data.messages.length !== prev.length ||
              (data.messages.length > 0 && prev.length > 0 && data.messages[data.messages.length - 1].id !== prev[prev.length - 1].id);
            if (hasChanged && !isScrolledToBottomRef.current && !isSilent) {
              setHasNewMessagesBelow(true);
            }
            return data.messages;
          });

          // Mark unread as 0 locally
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch {
      } finally {
        if (!isSilent) {
          setIsLoadingMessages(false);
          setTimeout(() => scrollToBottom(false), 50);
        }
      }
    },
    [scrollToBottom]
  );

  // Refresh active conversation messages and presence
  useEffect(() => {
    if (!selectedConvId || !user) return;

    fetchMessages(selectedConvId);
    setOtherUserTyping(false);
    setIsOtherUserOnline(false);

    // Setup Supabase Realtime channel
    const supabase = getSupabaseClient();
    const channelName = `conversation:${selectedConvId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: user.id },
      },
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        if (payload && payload.conversationId === selectedConvId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            const updated = [...prev, payload];
            if (isScrolledToBottomRef.current) {
              setTimeout(() => scrollToBottom(true), 50);
            } else {
              setHasNewMessagesBelow(true);
            }
            return updated;
          });

          // Update conversation list preview
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConvId
                ? {
                    ...c,
                    updatedAt: payload.createdAt,
                    lastMessage: {
                      body: payload.body,
                      createdAt: payload.createdAt,
                      senderId: payload.senderId,
                    },
                  }
                : c
            )
          );
        }
      })
      .on('broadcast', { event: 'message_deleted' }, ({ payload }) => {
        if (payload?.messageId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.messageId
                ? { ...m, body: 'This message was deleted.', status: 'deleted', mediaUrl: null }
                : m
            )
          );
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId !== user.id) {
          setOtherUserTyping(!!payload.isTyping);
          if (payload.isTyping) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setOtherUserTyping(false);
            }, 3000);
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const otherParticipantId = activeConversation?.otherParticipant?.id;
        if (otherParticipantId && presenceState[otherParticipantId]) {
          setIsOtherUserOnline(true);
        } else {
          setIsOtherUserOnline(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: user.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Resilient fallback polling every 4 seconds to guarantee delivery
    const pollInterval = setInterval(() => {
      fetchMessages(selectedConvId, true);
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedConvId, user, activeConversation?.otherParticipant?.id, fetchMessages, scrollToBottom]);

  // Typing event emitter
  const handleTyping = (text: string) => {
    setMessageText(text);

    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, isTyping: true },
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: user.id, isTyping: false },
        });
      }, 2000);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    setSendError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload?category=chat', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setMediaUrl(data.url);
      } else {
        setSendError(data.error || 'Failed to upload media file.');
      }
    } catch {
      setSendError('Network error uploading media.');
    } finally {
      setIsUploadingMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = messageText.trim();
    if ((!trimmed && !mediaUrl) || !selectedConvId || isSending) return;

    let fullBody = trimmed;
    if (replyingToMessage) {
      fullBody = `[Replying to ${replyingToMessage.senderName}: "${replyingToMessage.body.slice(0, 40)}..."]\n${fullBody}`;
    }

    const currentMedia = mediaUrl;
    setMessageText('');
    setMediaUrl(null);
    setReplyingToMessage(null);
    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch(`/api/messages/conversations/${selectedConvId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullBody || 'Shared an attachment',
          mediaUrl: currentMedia || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => scrollToBottom(true), 50);

        // Broadcast to other participant via Supabase Realtime
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'new_message',
            payload: data.message,
          });
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user?.id, isTyping: false },
          });
        }

        // Update last message in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvId
              ? {
                  ...c,
                  updatedAt: new Date().toISOString(),
                  lastMessage: {
                    body: fullBody || 'Shared an attachment',
                    createdAt: new Date().toISOString(),
                    senderId: user?.id || '',
                  },
                }
              : c
          )
        );
      } else {
        setSendError(data.error || "Couldn't send message. Try again.");
        // Restore unsent text
        setMessageText(trimmed);
        setMediaUrl(currentMedia);
      }
    } catch {
      setSendError("Couldn't send message. Check network connection.");
      setMessageText(trimmed);
      setMediaUrl(currentMedia);
    } finally {
      setIsSending(false);
      textInputRef.current?.focus();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedConvId) return;
    try {
      const res = await fetch(`/api/messages/conversations/${selectedConvId}/messages/${messageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, body: 'This message was deleted.', status: 'deleted', mediaUrl: null }
              : m
          )
        );
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'message_deleted',
            payload: { messageId },
          });
        }
      }
    } catch {}
  };

  const handleStartConversation = async (guardianId: string) => {
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: guardianId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewChatModal(false);
        const convRes = await fetch('/api/messages/conversations');
        const convData = await convRes.json();
        if (convData.success) {
          setConversations(convData.conversations);
        }
        setSelectedConvId(data.conversationId);
      }
    } catch {}
  };

  if (!user) {
    return (
      <div className="card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '580px', margin: '40px auto' }}>
        <MessageSquare size={48} color="var(--brand-primary)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Direct Messaging</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Sign in to direct message animal feeders, rescuers, and community shelter coordinators.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ display: 'inline-flex', padding: '10px 24px', textDecoration: 'none' }}>
          Sign In
        </Link>
      </div>
    );
  }

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.otherParticipant?.fullName.toLowerCase().includes(q) ||
      c.otherParticipant?.username.toLowerCase().includes(q)
    );
  });

  const filteredGuardians = availableGuardians.filter((g) => {
    if (!guardianFilter.trim()) return true;
    const q = guardianFilter.toLowerCase();
    return g.fullName.toLowerCase().includes(q) || g.username.toLowerCase().includes(q);
  });

  return (
    <div
      style={{
        maxWidth: '1080px',
        margin: '0 auto',
        height: isMobile ? 'calc(100dvh - 120px)' : 'calc(100dvh - 84px)',
        display: isMobile ? 'flex' : 'grid',
        gridTemplateColumns: isMobile ? undefined : '320px 1fr',
        gap: '12px',
        paddingBottom: isMobile ? '70px' : '16px',
        width: '100%',
      }}
    >
      {/* Left Pane: Conversations List */}
      <div
        className="card"
        style={{
          display: isMobile && selectedConvId ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%',
          width: isMobile ? '100%' : '320px',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Messages</h2>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="btn btn-primary"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="New Message"
              aria-label="New message"
            >
              <Plus size={18} />
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 32px',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Conversation list items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '13.5px', fontWeight: 600 }}>No messages yet.</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Click + to message a fellow animal guardian.</div>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              const other = conv.otherParticipant;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #059669' : '3px solid transparent',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={other?.avatarUrl || '/avatars/default.png'}
                      alt={other?.fullName || 'User'}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: conv.unreadCount > 0 ? 800 : 600,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {other?.fullName || 'Guardian'}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span
                          style={{
                            background: '#059669',
                            color: 'white',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            flexShrink: 0,
                          }}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: conv.unreadCount > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                        fontWeight: conv.unreadCount > 0 ? 600 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}
                    >
                      {conv.lastMessage?.body || 'Start the conversation.'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Thread */}
      <div
        className="card"
        style={{
          display: isMobile && !selectedConvId ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%',
          flex: 1,
          width: isMobile ? '100%' : undefined,
          overflow: 'hidden',
          padding: 0,
          position: 'relative',
        }}
      >
        {activeConversation ? (
          <>
            {/* Thread Header */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isMobile && (
                  <button
                    onClick={() => setSelectedConvId(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Back to conversations"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <Link
                  href={activeConversation.otherParticipant?.username ? `/profile/${activeConversation.otherParticipant.username}` : '#'}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}
                  className="hover:opacity-90"
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={activeConversation.otherParticipant?.avatarUrl || '/avatars/default.png'}
                      alt={activeConversation.otherParticipant?.fullName || ''}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    {isOtherUserOnline && (
                      <span
                        title="Online Now"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '11px',
                          height: '11px',
                          borderRadius: '50%',
                          background: '#10b981',
                          border: '2px solid white',
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{activeConversation.otherParticipant?.fullName || 'Guardian'}</span>
                      {isOtherUserOnline && (
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>&bull; Online</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      @{activeConversation.otherParticipant?.username || 'member'}
                    </div>
                  </div>
                </Link>
              </div>

              {activeConversation.otherParticipant && (
                <Link
                  href={`/profile/${activeConversation.otherParticipant.username}`}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '12px', textDecoration: 'none' }}
                >
                  View Profile
                </Link>
              )}
            </div>

            {/* Error Banner */}
            {sendError && (
              <div
                style={{
                  background: '#FEE2E2',
                  borderBottom: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} />
                  <span>{sendError}</span>
                </div>
                <button
                  onClick={() => setSendError(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: 'var(--bg-secondary)',
                position: 'relative',
              }}
            >
              {isLoadingMessages ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 8px auto' }} />
                  Loading conversation history...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <MessageSquare size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>Start the conversation.</div>
                  <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                    Send a private message to coordinate feedings, emergency rescues, or veterinary care.
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user.id;
                  const isDeleted = msg.status === 'deleted';

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                        gap: '8px',
                        alignItems: 'flex-end',
                        position: 'relative',
                      }}
                    >
                      {!isMine && (
                        <img
                          src={msg.senderAvatar || '/avatars/default.png'}
                          alt={msg.senderName}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      )}
                      <div
                        style={{
                          maxWidth: '74%',
                          padding: '10px 14px',
                          borderRadius: isMine ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          background: isMine ? (isDeleted ? '#9CA3AF' : '#059669') : 'var(--bg-card)',
                          color: isMine ? '#ffffff' : 'var(--text-main)',
                          border: isMine ? 'none' : '1px solid var(--border-subtle)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          fontSize: '13.5px',
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          position: 'relative',
                          fontStyle: isDeleted ? 'italic' : 'normal',
                        }}
                      >
                        {/* Media rendering if message has attachment */}
                        {msg.mediaUrl && !isDeleted && (
                          <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                            {msg.mediaUrl.endsWith('.mp4') || msg.mediaUrl.endsWith('.webm') ? (
                              <video src={msg.mediaUrl} controls style={{ width: '100%', maxHeight: '220px', objectFit: 'cover' }} />
                            ) : (
                              <img src={msg.mediaUrl} alt="Chat attachment" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover' }} />
                            )}
                          </div>
                        )}

                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.body}</div>

                        <div
                          style={{
                            fontSize: '10.5px',
                            color: isMine ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            marginTop: '4px',
                          }}
                        >
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMine && !isDeleted && (
                            <span title={msg.status === 'read' ? 'Read' : 'Sent'} style={{ display: 'inline-flex', alignItems: 'center' }}>
                              {msg.status === 'read' ? <CheckCheck size={13} color="white" /> : <Check size={13} color="white" />}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons (Reply & Delete for own message) */}
                      {!isDeleted && (
                        <div style={{ display: 'flex', gap: '4px', opacity: 0.6, alignSelf: 'center' }}>
                          <button
                            onClick={() => setReplyingToMessage(msg)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
                            title="Reply"
                          >
                            <Reply size={13} />
                          </button>
                          {isMine && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                              title="Delete message"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {otherUserTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <div className="flex gap-1">
                    <span className="animate-bounce">&bull;</span>
                    <span className="animate-bounce delay-100">&bull;</span>
                    <span className="animate-bounce delay-200">&bull;</span>
                  </div>
                  <span>{activeConversation.otherParticipant?.fullName} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Floating "New message below" pill */}
            {hasNewMessagesBelow && (
              <button
                onClick={() => scrollToBottom(true)}
                style={{
                  position: 'absolute',
                  bottom: '74px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  zIndex: 20,
                }}
              >
                <span>New messages</span>
                <ChevronDown size={14} />
              </button>
            )}

            {/* Replying banner */}
            {replyingToMessage && (
              <div style={{ padding: '6px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Replying to <strong>{replyingToMessage.senderName}</strong>: &quot;{replyingToMessage.body.slice(0, 50)}...&quot;
                </span>
                <button onClick={() => setReplyingToMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Media preview before sending */}
            {mediaUrl && (
              <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={mediaUrl} alt="Preview" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover' }} />
                <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Attachment ready to send</span>
                <button onClick={() => setMediaUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Hidden Chat Media Input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,video/*"
              onChange={handleMediaUpload}
            />

            {/* Input Composer */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-card)',
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingMedia || isSending}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '44px',
                  minWidth: '44px',
                }}
                title="Attach photo or video"
                aria-label="Attach photo or video"
              >
                {isUploadingMedia ? <Loader2 className="animate-spin" size={18} /> : <Paperclip size={18} />}
              </button>

              <input
                ref={textInputRef}
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '13.5px',
                  outline: 'none',
                  minHeight: '44px',
                }}
              />

              <button
                type="submit"
                disabled={(!messageText.trim() && !mediaUrl) || isSending}
                className="btn btn-primary"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !messageText.trim() && !mediaUrl ? 0.6 : 1,
                }}
                aria-label="Send message"
              >
                {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              </button>
            </form>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <MessageSquare size={52} color="#059669" style={{ opacity: 0.5, marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0' }}>Your Messages</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 0 20px 0' }}>
              Connect directly with verified local animal rescuers, community feeders, and shelter volunteers.
            </p>
            <button className="btn btn-primary" onClick={() => setShowNewChatModal(true)} style={{ minHeight: '44px' }}>
              Start a Conversation
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowNewChatModal(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '440px', maxHeight: '520px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Start Direct Conversation</h3>
              <button onClick={() => setShowNewChatModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <input
                type="text"
                placeholder="Search fellow guardians..."
                value={guardianFilter}
                onChange={(e) => setGuardianFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {filteredGuardians.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No guardians found.
                </div>
              ) : (
                filteredGuardians.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleStartConversation(g.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    className="hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <img
                      src={g.avatarUrl || '/avatars/default.png'}
                      alt={g.fullName}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{g.fullName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{g.username}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

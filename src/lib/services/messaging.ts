import { getSupabaseServerClient } from '../supabase/server';
import crypto from 'crypto';

export interface ConversationSummary {
  id: string;
  type: string;
  title: string | null;
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
  otherParticipant: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string;
    role: string;
  } | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  body: string;
  mediaUrl?: string | null;
  createdAt: string;
}

export class MessagingService {
  static async getConversations(userId: string): Promise<ConversationSummary[]> {
    try {
      const supabase = getSupabaseServerClient();
      const { data: convRows, error } = await supabase
        .from('platform_data')
        .select('*')
        .eq('data_type', 'conversation')
        .or(`user_id.eq.${userId},target_user_id.eq.${userId},target_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error || !convRows) return [];

      const results: ConversationSummary[] = [];

      for (const row of convRows) {
        const otherUserId = row.user_id === userId ? (row.target_user_id || row.target_id) : row.user_id;

        // Fetch other user profile
        let otherUser = null;
        if (otherUserId) {
          const { data: u } = await supabase
            .from('users')
            .select('id, display_name, username, avatar_url, role')
            .eq('id', otherUserId)
            .maybeSingle();

          if (u) {
            otherUser = {
              id: u.id,
              fullName: u.display_name || u.username,
              username: u.username,
              avatarUrl: u.avatar_url || '',
              role: u.role || 'USER',
            };
          }
        }

        // Fetch last message
        const { data: lastMsgRows } = await supabase
          .from('platform_data')
          .select('*')
          .eq('data_type', 'message')
          .eq('target_id', row.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = lastMsgRows && lastMsgRows[0];

        results.push({
          id: row.id,
          type: row.data?.type || 'DIRECT',
          title: row.data?.title || null,
          updatedAt: row.updated_at || row.created_at,
          unreadCount: 0,
          lastMessage: lastMsg
            ? {
                body: lastMsg.data?.body || '',
                createdAt: lastMsg.created_at,
                senderId: lastMsg.user_id,
              }
            : null,
          otherParticipant: otherUser,
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  static async getOrCreateDirectConversation(user1Id: string, user2Id: string): Promise<string> {
    const supabase = getSupabaseServerClient();

    // Check if direct conversation already exists
    const { data: existingRows } = await supabase
      .from('platform_data')
      .select('id, user_id, target_user_id, target_id')
      .eq('data_type', 'conversation')
      .or(`and(user_id.eq.${user1Id},target_id.eq.${user2Id}),and(user_id.eq.${user2Id},target_id.eq.${user1Id}),and(user_id.eq.${user1Id},target_user_id.eq.${user2Id}),and(user_id.eq.${user2Id},target_user_id.eq.${user1Id})`)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      return existingRows[0].id;
    }

    const convId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const { data: newConv } = await supabase
      .from('platform_data')
      .insert({
        id: convId,
        data_type: 'conversation',
        user_id: user1Id,
        target_user_id: user2Id,
        target_id: user2Id,
        status: 'active',
        data: {
          type: 'DIRECT',
          participants: [user1Id, user2Id],
          created_at: nowIso,
        },
      })
      .select('id')
      .single();

    return newConv?.id || convId;
  }

  static async getMessages(conversationId: string, userId: string): Promise<ChatMessage[]> {
    const supabase = getSupabaseServerClient();

    const { data: msgRows, error } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'message')
      .eq('target_id', conversationId)
      .order('created_at', { ascending: true });

    if (error || !msgRows) return [];

    // Fetch senders
    const senderIds = Array.from(new Set(msgRows.map((r: any) => r.user_id).filter(Boolean)));
    let userMap = new Map<string, any>();
    if (senderIds.length > 0) {
      const { data: userRows } = await supabase
        .from('users')
        .select('id, display_name, username, avatar_url')
        .in('id', senderIds);
      userMap = new Map((userRows || []).map((u: any) => [u.id, u]));
    }

    return msgRows.map((r: any) => {
      const sender = userMap.get(r.user_id);
      return {
        id: r.id,
        conversationId,
        senderId: r.user_id,
        senderName: sender?.display_name || 'Member',
        senderUsername: sender?.username || 'member',
        senderAvatar: sender?.avatar_url || '',
        body: r.data?.body || '',
        mediaUrl: r.data?.media_url || null,
        createdAt: r.created_at,
      };
    });
  }

  static async sendMessage(conversationId: string, senderId: string, body: string, mediaUrl?: string): Promise<ChatMessage> {
    const supabase = getSupabaseServerClient();
    const msgId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const { data: sender } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_url')
      .eq('id', senderId)
      .maybeSingle();

    await supabase.from('platform_data').insert({
      id: msgId,
      data_type: 'message',
      user_id: senderId,
      target_id: conversationId,
      status: 'sent',
      data: {
        body: body.trim(),
        media_url: mediaUrl || null,
        created_at: nowIso,
      },
    });

    // Update conversation timestamp
    await supabase
      .from('platform_data')
      .update({ updated_at: nowIso })
      .eq('id', conversationId);

    return {
      id: msgId,
      conversationId,
      senderId,
      senderName: sender?.display_name || 'Member',
      senderUsername: sender?.username || 'member',
      senderAvatar: sender?.avatar_url || '',
      body: body.trim(),
      mediaUrl: mediaUrl || null,
      createdAt: nowIso,
    };
  }

  static async deleteMessage(conversationId: string, messageId: string, userId: string, userRole?: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();

    const { data: msg } = await supabase
      .from('platform_data')
      .select('*')
      .eq('id', messageId)
      .eq('target_id', conversationId)
      .maybeSingle();

    if (!msg) {
      throw new Error('Message not found');
    }

    const isAuthor = msg.user_id === userId;
    const isStaff = ['PLATFORM_ADMIN', 'PLATFORM_MODERATOR'].includes(userRole || '');

    if (!isAuthor && !isStaff) {
      throw new Error('Not authorized to delete this message');
    }

    await supabase.from('platform_data').delete().eq('id', messageId);
    return true;
  }
}

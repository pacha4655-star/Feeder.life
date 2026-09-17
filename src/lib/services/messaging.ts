import { getSupabaseServerClient } from '../supabase/server';
import { NotificationService } from './notifications';
import crypto from 'crypto';
import logger from '../monitoring/logger';

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
    isActive: boolean;
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
  status: 'sent' | 'read' | 'deleted';
  createdAt: string;
}

export class MessagingService {
  /**
   * Checks if either user has blocked the other in platform_data.
   */
  static async isBlocked(user1Id: string, user2Id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseServerClient();
      const { data: blocks } = await supabase
        .from('platform_data')
        .select('id')
        .eq('data_type', 'block')
        .or(`and(user_id.eq.${user1Id},target_id.eq.${user2Id}),and(user_id.eq.${user2Id},target_id.eq.${user1Id})`)
        .limit(1);

      return !!(blocks && blocks.length > 0);
    } catch {
      return false;
    }
  }

  /**
   * Retrieves all conversations for the authenticated user with real unread counts and participant info.
   */
  static async getConversations(userId: string): Promise<ConversationSummary[]> {
    try {
      const supabase = getSupabaseServerClient();

      // Fetch conversations where user is user_id or target_id or target_user_id
      const { data: convRows, error } = await supabase
        .from('platform_data')
        .select('*')
        .eq('data_type', 'conversation')
        .or(`user_id.eq.${userId},target_user_id.eq.${userId},target_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error || !convRows) return [];

      // Collect other participant IDs
      const otherUserIds: string[] = [];
      for (const row of convRows) {
        let otherId = row.user_id === userId ? (row.target_user_id || row.target_id) : row.user_id;
        if (!otherId && Array.isArray(row.data?.participants)) {
          otherId = row.data.participants.find((p: string) => p !== userId);
        }
        if (otherId && !otherUserIds.includes(otherId)) {
          otherUserIds.push(otherId);
        }
      }

      // Fetch user records
      let userMap = new Map<string, any>();
      if (otherUserIds.length > 0) {
        const { data: uRows } = await supabase
          .from('users')
          .select('id, display_name, username, avatar_url, role, is_active')
          .in('id', otherUserIds);

        if (uRows) {
          userMap = new Map(uRows.map((u: any) => [u.id, u]));
        }
      }

      const results: ConversationSummary[] = [];

      for (const row of convRows) {
        let otherId = row.user_id === userId ? (row.target_user_id || row.target_id) : row.user_id;
        if (!otherId && Array.isArray(row.data?.participants)) {
          otherId = row.data.participants.find((p: string) => p !== userId);
        }

        const u = otherId ? userMap.get(otherId) : null;
        const otherParticipant = u
          ? {
              id: u.id,
              fullName: u.display_name || u.username || 'Guardian',
              username: u.username || 'member',
              avatarUrl: u.avatar_url || '',
              role: u.role || 'USER',
              isActive: u.is_active !== false,
            }
          : null;

        // Fetch last message for this conversation
        const { data: lastMsgRows } = await supabase
          .from('platform_data')
          .select('*')
          .eq('data_type', 'message')
          .eq('target_id', row.id)
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = lastMsgRows && lastMsgRows[0];

        // Fetch exact unread count for the authenticated user in this conversation
        const { count: unreadCount } = await supabase
          .from('platform_data')
          .select('*', { count: 'exact', head: true })
          .eq('data_type', 'message')
          .eq('target_id', row.id)
          .neq('user_id', userId)
          .eq('status', 'sent');

        results.push({
          id: row.id,
          type: row.data?.type || 'DIRECT',
          title: row.data?.title || null,
          updatedAt: lastMsg?.created_at || row.updated_at || row.created_at,
          unreadCount: unreadCount || 0,
          lastMessage: lastMsg
            ? {
                body: lastMsg.data?.body || '',
                createdAt: lastMsg.created_at,
                senderId: lastMsg.user_id,
              }
            : null,
          otherParticipant,
        });
      }

      // Sort by updatedAt descending
      results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return results;
    } catch (err) {
      logger.error('Error fetching conversations in MessagingService', err);
      return [];
    }
  }

  /**
   * Deterministically finds or creates a 1-to-1 direct conversation between two users.
   */
  static async getOrCreateDirectConversation(user1Id: string, user2Id: string): Promise<string> {
    if (user1Id === user2Id) {
      throw new Error('Cannot start a conversation with yourself.');
    }

    const supabase = getSupabaseServerClient();

    // 1. Verify target user exists and is active
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, is_active, display_name, username')
      .eq('id', user2Id)
      .maybeSingle();

    if (userError || !targetUser) {
      throw new Error('This user does not exist.');
    }

    if (targetUser.is_active === false) {
      throw new Error('This account is no longer available.');
    }

    // 2. Verify blocking status
    const blocked = await this.isBlocked(user1Id, user2Id);
    if (blocked) {
      throw new Error("You can't message this user.");
    }

    // 3. Look for existing conversation deterministically
    const { data: existingRows } = await supabase
      .from('platform_data')
      .select('id, user_id, target_user_id, target_id, data')
      .eq('data_type', 'conversation')
      .or(`and(user_id.eq.${user1Id},target_id.eq.${user2Id}),and(user_id.eq.${user2Id},target_id.eq.${user1Id}),and(user_id.eq.${user1Id},target_user_id.eq.${user2Id}),and(user_id.eq.${user2Id},target_user_id.eq.${user1Id})`)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      return existingRows[0].id;
    }

    // 4. Create new direct conversation record
    const convId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const { data: newConv, error: insertError } = await supabase
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
          updated_at: nowIso,
        },
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error('Failed to create conversation record', insertError);
      throw new Error('Failed to create conversation.');
    }

    return newConv?.id || convId;
  }

  /**
   * Fetches messages for a conversation with strict IDOR participant validation.
   * Also automatically marks unread messages as read.
   */
  static async getMessages(conversationId: string, userId: string): Promise<ChatMessage[]> {
    const supabase = getSupabaseServerClient();

    // 1. Fetch conversation record to verify participant
    const { data: conv, error: convError } = await supabase
      .from('platform_data')
      .select('*')
      .eq('id', conversationId)
      .eq('data_type', 'conversation')
      .maybeSingle();

    if (convError || !conv) {
      throw new Error('Conversation not found');
    }

    const participants: string[] = conv.data?.participants || [conv.user_id, conv.target_user_id || conv.target_id].filter(Boolean);
    if (!participants.includes(userId)) {
      throw new Error('Not authorized to access this conversation');
    }

    // 2. Fetch messages
    const { data: msgRows, error: msgError } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'message')
      .eq('target_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError || !msgRows) return [];

    // 3. Mark unread incoming messages as read asynchronously
    const unreadIds = msgRows
      .filter((r: any) => r.user_id !== userId && r.status === 'sent')
      .map((r: any) => r.id);

    if (unreadIds.length > 0) {
      const nowIso = new Date().toISOString();
      await supabase
        .from('platform_data')
        .update({
          status: 'read',
          updated_at: nowIso,
        })
        .in('id', unreadIds);
    }

    // 4. Resolve sender user profiles
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
      const isDeleted = r.status === 'deleted' || r.data?.is_deleted;
      return {
        id: r.id,
        conversationId,
        senderId: r.user_id,
        senderName: sender?.display_name || sender?.username || 'Member',
        senderUsername: sender?.username || 'member',
        senderAvatar: sender?.avatar_url || '',
        body: isDeleted ? 'This message was deleted.' : (r.data?.body || ''),
        mediaUrl: isDeleted ? null : (r.data?.media_url || null),
        status: r.status as 'sent' | 'read' | 'deleted',
        createdAt: r.created_at,
      };
    });
  }

  /**
   * Sends a message in a conversation with participant validation, blocking check, and notification.
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
    mediaUrl?: string
  ): Promise<ChatMessage> {
    const trimmedBody = body ? body.trim() : '';
    if (!trimmedBody && !mediaUrl) {
      throw new Error('Message cannot be empty.');
    }

    const supabase = getSupabaseServerClient();

    // 1. Verify conversation and participant
    const { data: conv, error: convError } = await supabase
      .from('platform_data')
      .select('*')
      .eq('id', conversationId)
      .eq('data_type', 'conversation')
      .maybeSingle();

    if (convError || !conv) {
      throw new Error('Conversation not found');
    }

    const participants: string[] = conv.data?.participants || [conv.user_id, conv.target_user_id || conv.target_id].filter(Boolean);
    if (!participants.includes(senderId)) {
      throw new Error('Not authorized to message in this conversation');
    }

    const recipientId = participants.find((p) => p !== senderId);
    if (!recipientId) {
      throw new Error('Invalid conversation recipient');
    }

    // 2. Check if either user has blocked the other
    const blocked = await this.isBlocked(senderId, recipientId);
    if (blocked) {
      throw new Error("Cannot send message. This user is blocked.");
    }

    // 3. Verify recipient account is still active
    const { data: recipientUser } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('id', recipientId)
      .maybeSingle();

    if (!recipientUser || recipientUser.is_active === false) {
      throw new Error('This account is no longer available.');
    }

    // 4. Fetch sender info for return object & notification
    const { data: sender } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_url')
      .eq('id', senderId)
      .maybeSingle();

    const msgId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 5. Insert message record into platform_data
    const { error: insertError } = await supabase.from('platform_data').insert({
      id: msgId,
      data_type: 'message',
      user_id: senderId,
      target_id: conversationId,
      target_user_id: recipientId,
      status: 'sent',
      data: {
        body: trimmedBody,
        media_url: mediaUrl || null,
        sender_id: senderId,
        recipient_id: recipientId,
        is_read: false,
        created_at: nowIso,
      },
    });

    if (insertError) {
      logger.error('Failed to insert message into platform_data', insertError);
      throw new Error('Failed to send message.');
    }

    // 6. Update conversation timestamp
    await supabase
      .from('platform_data')
      .update({
        updated_at: nowIso,
        data: {
          ...conv.data,
          updated_at: nowIso,
          last_message: {
            body: trimmedBody || 'Shared an attachment',
            createdAt: nowIso,
            senderId,
          },
        },
      })
      .eq('id', conversationId);

    // 7. Send notification to recipient
    const senderDisplayName = sender?.display_name || sender?.username || 'Someone';
    await NotificationService.createNotification({
      recipientId,
      senderId,
      senderName: senderDisplayName,
      senderAvatar: sender?.avatar_url || null,
      type: 'MESSAGE',
      title: 'New Message',
      body: `${senderDisplayName}: "${trimmedBody.slice(0, 60)}${trimmedBody.length > 60 ? '...' : ''}"`,
      targetUrl: `/messages?user=${senderId}`,
    }).catch((err) => {
      logger.error('Failed to trigger message notification', err);
    });

    return {
      id: msgId,
      conversationId,
      senderId,
      senderName: sender?.display_name || sender?.username || 'Member',
      senderUsername: sender?.username || 'member',
      senderAvatar: sender?.avatar_url || '',
      body: trimmedBody,
      mediaUrl: mediaUrl || null,
      status: 'sent',
      createdAt: nowIso,
    };
  }

  /**
   * Deletes a message (marking it deleted for auditability & privacy).
   */
  static async deleteMessage(
    conversationId: string,
    messageId: string,
    userId: string,
    userRole?: string
  ): Promise<boolean> {
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

    // Soft delete message state
    await supabase
      .from('platform_data')
      .update({
        status: 'deleted',
        data: {
          ...msg.data,
          body: 'This message was deleted.',
          media_url: null,
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        },
      })
      .eq('id', messageId);

    return true;
  }

  /**
   * Calculates total real unread messages count for the given user.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const supabase = getSupabaseServerClient();
      const { count } = await supabase
        .from('platform_data')
        .select('*', { count: 'exact', head: true })
        .eq('data_type', 'message')
        .eq('target_user_id', userId)
        .eq('status', 'sent');

      return count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Marks all messages in a conversation as read for the user.
   */
  static async markConversationAsRead(conversationId: string, userId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from('platform_data')
        .update({
          status: 'read',
          updated_at: new Date().toISOString(),
        })
        .eq('data_type', 'message')
        .eq('target_id', conversationId)
        .neq('user_id', userId)
        .eq('status', 'sent');

      return true;
    } catch {
      return false;
    }
  }
}

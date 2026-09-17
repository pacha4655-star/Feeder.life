import { getSupabaseServerClient } from '@/lib/supabase/server';
import logger from '@/lib/monitoring/logger';

export interface CreateNotificationParams {
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string | null;
  type:
    | 'FOLLOW'
    | 'REACTION'
    | 'COMMENT'
    | 'COMMENT_REPLY'
    | 'COMMUNITY_JOIN'
    | 'COMMUNITY_REQUEST'
    | 'COMMUNITY_APPROVE'
    | 'COMMUNITY_POST'
    | 'SOS_RESPONSE'
    | 'MESSAGE'
    | 'SYSTEM';
  title: string;
  body: string;
  targetUrl: string;
  postId?: string;
  communityId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationRecord {
  id: string;
  recipient_id: string;
  sender_id?: string | null;
  sender_name?: string | null;
  sender_avatar?: string | null;
  type: string;
  title: string;
  body: string;
  target_url?: string;
  is_read: number;
  created_at: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create a persistent notification in platform_data.
   * Includes duplicate suppression and self-notification blocking.
   */
  static async createNotification(params: CreateNotificationParams): Promise<boolean> {
    try {
      const {
        recipientId,
        senderId,
        senderName,
        senderAvatar,
        type,
        title,
        body,
        targetUrl,
        postId,
        communityId,
        metadata = {},
      } = params;

      // 1. Never notify self
      if (senderId && senderId === recipientId) {
        return false;
      }

      if (!recipientId) {
        return false;
      }

      const supabase = getSupabaseServerClient();

      // 2. Deduplication check within last 5 minutes for identical action
      if (senderId && (type === 'FOLLOW' || type === 'REACTION' || type === 'COMMUNITY_REQUEST')) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from('platform_data')
          .select('id')
          .eq('data_type', 'notification')
          .eq('user_id', recipientId)
          .eq('target_id', senderId)
          .gte('created_at', fiveMinutesAgo)
          .limit(1);

        if (existing && existing.length > 0) {
          // Duplicate action within short window, skip
          return false;
        }
      }

      // 3. Insert notification record
      const { error } = await supabase.from('platform_data').insert({
        data_type: 'notification',
        user_id: recipientId,
        target_id: senderId || null,
        target_user_id: senderId || null,
        status: 'unread',
        data: {
          type,
          title,
          body,
          target_url: targetUrl,
          sender_name: senderName || null,
          sender_avatar: senderAvatar || null,
          post_id: postId || null,
          community_id: communityId || null,
          ...metadata,
        },
      });

      if (error) {
        logger.error('Failed to insert notification into platform_data', error);
        return false;
      }

      return true;
    } catch (err: any) {
      logger.error('Error in NotificationService.createNotification', err);
      return false;
    }
  }

  /**
   * Fetch paginated notifications for the authenticated user.
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 30,
    offset: number = 0
  ): Promise<{ notifications: NotificationRecord[]; unreadCount: number }> {
    try {
      const supabase = getSupabaseServerClient();

      // Fetch user notifications
      const { data: rows, error } = await supabase
        .from('platform_data')
        .select('*')
        .eq('data_type', 'notification')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !rows) {
        return { notifications: [], unreadCount: 0 };
      }

      const notifications: NotificationRecord[] = rows.map((r: any) => ({
        id: r.id,
        recipient_id: r.user_id,
        sender_id: r.target_id || r.target_user_id || null,
        sender_name: r.data?.sender_name || null,
        sender_avatar: r.data?.sender_avatar || null,
        type: r.data?.type || 'SYSTEM',
        title: r.data?.title || 'Notification',
        body: r.data?.body || '',
        target_url: r.data?.target_url || '/notifications',
        is_read: r.status === 'read' ? 1 : 0,
        created_at: r.created_at,
        metadata: r.data || {},
      }));

      // Get exact unread count
      const { count: unreadCount } = await supabase
        .from('platform_data')
        .select('*', { count: 'exact', head: true })
        .eq('data_type', 'notification')
        .eq('user_id', userId)
        .eq('status', 'unread');

      return {
        notifications,
        unreadCount: unreadCount || 0,
      };
    } catch (err: any) {
      logger.error('Error in NotificationService.getUserNotifications', err);
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Mark a single notification as read for the user.
   */
  static async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase
        .from('platform_data')
        .update({ status: 'read', updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .eq('data_type', 'notification');

      return !error;
    } catch (err) {
      return false;
    }
  }

  /**
   * Mark all notifications as read for the user.
   */
  static async markAllNotificationsRead(userId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase
        .from('platform_data')
        .update({ status: 'read', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('data_type', 'notification')
        .eq('status', 'unread');

      return !error;
    } catch (err) {
      return false;
    }
  }
}

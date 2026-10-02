'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface RealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onPayload: (payload: any) => void;
  enabled?: boolean;
}

/**
 * Hook to safely subscribe to Supabase Realtime Postgres changes with automatic
 * cleanup to prevent memory leaks and duplicate listeners.
 */
export function useRealtimeSubscription({
  table,
  filter,
  event = '*',
  onPayload,
  enabled = true,
}: RealtimeSubscriptionOptions) {
  const onPayloadRef = useRef(onPayload);
  onPayloadRef.current = onPayload;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const supabase = getSupabaseBrowserClient();
    const channelName = `realtime_${table}_${filter || 'all'}_${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload: any) => {
          if (onPayloadRef.current) {
            onPayloadRef.current(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, event, enabled]);
}

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { MessagingService } from '@/lib/services/messaging';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const unreadCount = await MessagingService.getUnreadCount(user.id);
    return NextResponse.json({ success: true, unreadCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, unreadCount: 0, error: error.message }, { status: 500 });
  }
}

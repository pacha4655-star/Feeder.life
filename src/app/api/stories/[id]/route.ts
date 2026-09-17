import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { StoryService } from '@/lib/services/story';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: storyId } = await context.params;

    try {
      await StoryService.deleteStory(storyId, user.id, user.role);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') {
        return NextResponse.json({ success: false, error: 'Not authorized to delete this story' }, { status: 403 });
      }
      if (err.message === 'NOT_FOUND') {
        return NextResponse.json({ success: false, error: 'Story not found' }, { status: 404 });
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: storyId } = await context.params;

    try {
      const viewers = await StoryService.getStoryViewers(storyId, user.id);
      return NextResponse.json({ success: true, viewers });
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') {
        return NextResponse.json({ success: false, error: 'Only story authors can view viewer lists' }, { status: 403 });
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

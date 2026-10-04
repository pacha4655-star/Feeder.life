import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { ImpactService } from '@/lib/services/impact';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const community = await ImpactService.getCommunityImpact();

    let userImpact = null;
    if (user) {
      userImpact = await ImpactService.getUserImpact(user.id);
    }

    return NextResponse.json({
      success: true,
      userImpact,
      communityImpact: community,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

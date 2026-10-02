import { NextRequest, NextResponse } from 'next/server';
import { ImpactService } from '@/lib/services/impact';

export async function GET(request: NextRequest) {
  try {
    const community = await ImpactService.getCommunityImpact();

    return NextResponse.json({
      success: true,
      areas: community,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

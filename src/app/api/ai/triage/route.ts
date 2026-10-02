import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { AiTriageService } from '@/lib/services/ai-triage';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit('ai_triage', user.id, { limit: 30, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const { animalType, description, imageUrl } = body;

    const triageResult = await AiTriageService.triageIncident({
      animalType,
      description,
      imageUrl,
    });

    return NextResponse.json({ success: true, triage: triageResult });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

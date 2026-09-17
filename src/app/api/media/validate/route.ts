import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { MediaValidatorService } from '@/lib/services/media-validator';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';
import logger from '@/lib/monitoring/logger';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Rate limit: Media validation checks
    const rateLimit = checkRateLimit('media_validate', user.id, { limit: 60, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const contentType = request.headers.get('content-type') || '';

    let buffer: Buffer | undefined;
    let mimeType = 'image/jpeg';
    let mediaUrl: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      mimeType = file.type?.toLowerCase() || 'image/jpeg';
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      const jsonBody = await request.json().catch(() => ({}));
      mediaUrl = jsonBody.mediaUrl;
      mimeType = jsonBody.mimeType || 'image/jpeg';

      if (jsonBody.base64) {
        buffer = Buffer.from(jsonBody.base64, 'base64');
      }
    }

    const result = await MediaValidatorService.validateMedia({
      buffer,
      mimeType,
      mediaUrl,
    });

    return NextResponse.json({
      success: true,
      validation: result,
    });
  } catch (error: any) {
    logger.error('Media validation route error', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Media verification failed',
      },
      { status: 500 }
    );
  }
}

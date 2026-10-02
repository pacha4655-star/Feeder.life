import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import logger from '@/lib/monitoring/logger';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: applicationId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { status, reviewerNotes, scheduledHomeCheckDate } = body;

    const supabase = getSupabaseServerClient();

    // Fetch existing application
    const { data: existingApp, error: fetchErr } = await supabase
      .from('platform_data')
      .select('*')
      .eq('id', applicationId)
      .eq('data_type', 'adoption_application')
      .maybeSingle();

    if (fetchErr || !existingApp) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    // Only staff, animal guardian/creator, or application owner (for cancellation) can update
    const isStaff = user.role === 'PLATFORM_ADMIN' || user.role === 'PLATFORM_MODERATOR';
    const isGuardian = existingApp.target_user_id === user.id;
    const isApplicant = existingApp.user_id === user.id;

    if (!isStaff && !isGuardian && !isApplicant) {
      return NextResponse.json(
        { success: false, error: 'Forbidden. You do not have permission to review this application.' },
        { status: 403 }
      );
    }

    const validStatuses = [
      'SUBMITTED',
      'UNDER_REVIEW',
      'ELIGIBILITY_REVIEW',
      'HOME_CHECK',
      'APPROVED',
      'REJECTED',
      'COMPLETED',
      'CANCELLED',
    ];

    const nextStatus = validStatuses.includes(status) ? status : existingApp.status;
    const appData = existingApp.data || {};
    const history = Array.isArray(appData.history) ? appData.history : [];

    if (nextStatus !== existingApp.status) {
      history.push({
        stage: nextStatus,
        timestamp: new Date().toISOString(),
        updated_by: user.fullName,
        note: reviewerNotes || `Status updated to ${nextStatus}`,
      });
    }

    const updatedData = {
      ...appData,
      reviewer_notes: reviewerNotes ? sanitizeText(reviewerNotes).slice(0, 1000) : appData.reviewer_notes,
      scheduled_home_check_date: scheduledHomeCheckDate || appData.scheduled_home_check_date,
      history,
    };

    const { data: updated, error: updateErr } = await supabase
      .from('platform_data')
      .update({
        status: nextStatus,
        data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateErr) {
      logger.error('Error updating adoption application', updateErr);
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // Notify applicant of status update
    if (existingApp.user_id && existingApp.user_id !== user.id) {
      await supabase.from('platform_data').insert({
        data_type: 'notification',
        user_id: existingApp.user_id,
        target_user_id: user.id,
        target_id: applicationId,
        status: 'UNREAD',
        data: {
          type: 'ADOPTION_STATUS_UPDATE',
          title: `Adoption Application Update: ${nextStatus}`,
          body: `Your application for ${appData.animal_name || 'the animal'} has been updated to "${nextStatus}".`,
          target_url: `/adoption?tab=my_applications`,
        },
      });
    }

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

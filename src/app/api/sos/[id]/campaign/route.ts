import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import logger from '@/lib/monitoring/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sosId } = await context.params;
    const supabase = getSupabaseServerClient();

    const { data: campaignRow } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'medical_campaign')
      .eq('target_id', sosId)
      .maybeSingle();

    if (!campaignRow) {
      return NextResponse.json({ success: true, campaign: null });
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaignRow.id,
        sos_id: campaignRow.target_id,
        user_id: campaignRow.user_id,
        status: campaignRow.status || 'ACTIVE',
        data: campaignRow.data || {},
        created_at: campaignRow.created_at,
        updated_at: campaignRow.updated_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sosId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const {
      targetAmount = 5000,
      clinicName = 'Verified Animal Clinic',
      vetDoctorName,
      clinicContact,
      costBreakdown = [],
      description,
    } = body;

    const supabase = getSupabaseServerClient();

    // Check if campaign already exists for this SOS
    const { data: existing } = await supabase
      .from('platform_data')
      .select('id, data')
      .eq('data_type', 'medical_campaign')
      .eq('target_id', sosId)
      .maybeSingle();

    const campaignData = {
      target_amount: Number(targetAmount) || 5000,
      amount_raised: existing?.data?.amount_raised || 0,
      clinic_name: sanitizeText(clinicName).slice(0, 120),
      vet_doctor_name: vetDoctorName ? sanitizeText(vetDoctorName).slice(0, 100) : '',
      clinic_contact: clinicContact ? sanitizeText(clinicContact).slice(0, 50) : '',
      cost_breakdown: Array.isArray(costBreakdown) ? costBreakdown : [],
      description: description ? sanitizeText(description).slice(0, 1000) : '',
      receipts: existing?.data?.receipts || [],
      pledges: existing?.data?.pledges || [],
      escrow_status: 'CLINIC_VERIFIED_LEDGER',
      created_by_name: user.fullName,
    };

    if (existing) {
      const { data: updated, error } = await supabase
        .from('platform_data')
        .update({
          data: campaignData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, campaign: updated });
    } else {
      const { data: inserted, error } = await supabase
        .from('platform_data')
        .insert({
          data_type: 'medical_campaign',
          user_id: user.id,
          target_id: sosId,
          status: 'ACTIVE',
          data: campaignData,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, campaign: inserted });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id: sosId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { amount = 500, note = '', isAnonymous = false } = body;

    const parsedAmount = Math.max(10, Math.min(100000, Number(amount) || 500));

    const supabase = getSupabaseServerClient();

    const { data: campaignRow, error: fetchErr } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'medical_campaign')
      .eq('target_id', sosId)
      .maybeSingle();

    if (fetchErr || !campaignRow) {
      return NextResponse.json({ success: false, error: 'Medical campaign not found for this SOS' }, { status: 404 });
    }

    const campaignData = campaignRow.data || {};
    const pledges = Array.isArray(campaignData.pledges) ? campaignData.pledges : [];
    const currentRaised = Number(campaignData.amount_raised) || 0;

    const newPledge = {
      id: String(Date.now()),
      user_id: user.id,
      user_name: isAnonymous ? 'Kind Guardian' : user.fullName,
      amount: parsedAmount,
      note: note ? sanitizeText(note).slice(0, 300) : '',
      pledged_at: new Date().toISOString(),
    };

    pledges.push(newPledge);
    const newTotalRaised = currentRaised + parsedAmount;

    const { data: updated, error: updateErr } = await supabase
      .from('platform_data')
      .update({
        data: {
          ...campaignData,
          amount_raised: newTotalRaised,
          pledges,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignRow.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pledge: newPledge, totalRaised: newTotalRaised });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

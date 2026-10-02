import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';

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
    const { receiptTitle, amount, photoUrl, clinicName, receiptDate } = body;

    if (!photoUrl || !receiptTitle) {
      return NextResponse.json(
        { success: false, error: 'Receipt title and invoice photo are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    const { data: campaignRow, error: fetchErr } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'medical_campaign')
      .eq('target_id', sosId)
      .maybeSingle();

    if (fetchErr || !campaignRow) {
      return NextResponse.json({ success: false, error: 'Medical campaign not found' }, { status: 404 });
    }

    const campaignData = campaignRow.data || {};
    const receipts = Array.isArray(campaignData.receipts) ? campaignData.receipts : [];

    const newReceipt = {
      id: String(Date.now()),
      title: sanitizeText(receiptTitle).slice(0, 100),
      amount: Number(amount) || 0,
      photo_url: sanitizeUrl(photoUrl),
      clinic_name: clinicName ? sanitizeText(clinicName).slice(0, 100) : campaignData.clinic_name,
      receipt_date: receiptDate || new Date().toISOString().split('T')[0],
      uploaded_by: user.fullName,
      uploaded_at: new Date().toISOString(),
    };

    receipts.push(newReceipt);

    const { data: updated, error: updateErr } = await supabase
      .from('platform_data')
      .update({
        data: {
          ...campaignData,
          receipts,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignRow.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, receipt: newReceipt });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

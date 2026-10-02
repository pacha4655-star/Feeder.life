import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/security/sanitize';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limit';
import logger from '@/lib/monitoring/logger';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const rateLimit = checkRateLimit('adoption_apply', user.id, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const body = await request.json().catch(() => ({}));
    const {
      animalId,
      applicationType = 'ADOPTION', // 'ADOPTION' | 'FOSTER'
      applicantName,
      phone,
      email,
      city,
      address,
      housingType,
      landlordPetPolicy,
      householdAgreement,
      existingPets,
      petExperience,
      dailyAloneHours,
      reason,
      homeCheckReady,
    } = body;

    if (!animalId || !applicantName || !phone) {
      return NextResponse.json(
        { success: false, error: 'Animal selection, applicant name, and contact phone are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Verify animal exists
    const { data: animal, error: animalErr } = await supabase
      .from('animals')
      .select('id, name, species, created_by, avatar_url')
      .eq('id', animalId)
      .maybeSingle();

    if (animalErr || !animal) {
      return NextResponse.json({ success: false, error: 'Target animal not found' }, { status: 404 });
    }

    const applicationPayload = {
      applicant_name: sanitizeText(applicantName).slice(0, 100),
      applicant_email: email ? sanitizeText(email).slice(0, 100) : user.email,
      applicant_phone: sanitizeText(phone).slice(0, 30),
      city: city ? sanitizeText(city).slice(0, 100) : user.city || '',
      address: address ? sanitizeText(address).slice(0, 300) : '',
      housing_type: housingType || 'Apartment',
      landlord_pet_policy: landlordPetPolicy || 'Not applicable',
      household_agreement: Boolean(householdAgreement),
      existing_pets: existingPets ? sanitizeText(existingPets).slice(0, 500) : 'None',
      pet_experience: petExperience ? sanitizeText(petExperience).slice(0, 1000) : '',
      daily_alone_hours: dailyAloneHours ? String(dailyAloneHours).slice(0, 30) : '1-2 hours',
      reason: reason ? sanitizeText(reason).slice(0, 1000) : '',
      home_check_ready: Boolean(homeCheckReady),
      application_type: applicationType,
      animal_name: animal.name || animal.species,
      animal_species: animal.species,
      animal_avatar: animal.avatar_url,
      guardian_id: animal.created_by,
      reviewer_notes: '',
      history: [
        {
          stage: 'SUBMITTED',
          timestamp: new Date().toISOString(),
          note: 'Application submitted by applicant',
        },
      ],
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('platform_data')
      .insert({
        data_type: 'adoption_application',
        user_id: user.id,
        target_id: animal.id,
        target_user_id: animal.created_by,
        status: 'SUBMITTED',
        data: applicationPayload,
      })
      .select()
      .single();

    if (insertErr) {
      logger.error('Error inserting adoption application', insertErr);
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    // Notify animal guardian/rescuer
    if (animal.created_by && animal.created_by !== user.id) {
      await supabase.from('platform_data').insert({
        data_type: 'notification',
        user_id: animal.created_by,
        target_user_id: user.id,
        target_id: inserted.id,
        status: 'UNREAD',
        data: {
          type: 'ADOPTION_APPLICATION',
          title: `New ${applicationType} Application for ${animal.name || animal.species}`,
          body: `${applicantName} submitted an application to ${applicationType.toLowerCase()} ${animal.name || 'this animal'}.`,
          target_url: `/adoption?tab=reviewer`,
        },
      });
    }

    return NextResponse.json({ success: true, application: inserted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { canModifyResource, canDeleteResource } from '@/lib/security/rbac';
import { isValidAnimalStatus } from '@/lib/validation/schemas';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';
import logger from '@/lib/monitoring/logger';
import type { AnimalStatus } from '@/types/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: animalId } = await context.params;

    const supabase = getSupabaseServerClient();
    const { data: animal, error } = await supabase
      .from('animals')
      .select('*, users!animals_created_by_fkey(id, username, display_name, avatar_url)')
      .eq('id', animalId)
      .maybeSingle();

    if (error || !animal) {
      return NextResponse.json({ success: false, error: 'Animal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, animal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: animalId } = await context.params;
    const supabase = getSupabaseServerClient();

    // Check existing animal
    const { data: existingAnimal, error: fetchErr } = await supabase
      .from('animals')
      .select('created_by')
      .eq('id', animalId)
      .maybeSingle();

    if (fetchErr || !existingAnimal) {
      return NextResponse.json({ success: false, error: 'Animal not found' }, { status: 404 });
    }

    // Enforce ownership: User A cannot modify User B's animal
    if (!canModifyResource(user.id, user.role, existingAnimal.created_by)) {
      logger.security('IDOR attempt: User tried to modify another user animal', {
        userId: user.id,
        targetAnimalId: animalId,
        animalCreatorId: existingAnimal.created_by,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. You cannot modify an animal record you did not create.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = sanitizeText(body.name).slice(0, 80);
    if (body.status !== undefined && isValidAnimalStatus(body.status)) {
      updateData.status = body.status as AnimalStatus;
    }
    if (body.description !== undefined) updateData.description = sanitizeText(body.description).slice(0, 2000);
    if (body.avatarUrl !== undefined) updateData.avatar_url = sanitizeUrl(body.avatarUrl);
    if (body.medicalData !== undefined && typeof body.medicalData === 'object') {
      updateData.medical_data = body.medicalData;
    }
    if (body.feedingData !== undefined && typeof body.feedingData === 'object') {
      updateData.feeding_data = body.feedingData;
    }
    if (body.rescueData !== undefined && typeof body.rescueData === 'object') {
      updateData.rescue_data = body.rescueData;
    }

    const { data: updatedAnimal, error: updateErr } = await supabase
      .from('animals')
      .update(updateData)
      .eq('id', animalId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, animal: updatedAnimal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: animalId } = await context.params;
    const supabase = getSupabaseServerClient();

    const { data: existingAnimal, error: fetchErr } = await supabase
      .from('animals')
      .select('created_by')
      .eq('id', animalId)
      .maybeSingle();

    if (fetchErr || !existingAnimal) {
      return NextResponse.json({ success: false, error: 'Animal not found' }, { status: 404 });
    }

    // Enforce ownership: User A cannot delete User B's animal
    if (!canDeleteResource(user.id, user.role, existingAnimal.created_by)) {
      logger.security('IDOR attempt: User tried to delete another user animal', {
        userId: user.id,
        targetAnimalId: animalId,
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden. You cannot delete an animal record you did not create.' },
        { status: 403 }
      );
    }

    const { error: delErr } = await supabase.from('animals').delete().eq('id', animalId);
    if (delErr) {
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Animal record deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

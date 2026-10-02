import { getSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizeUrl } from '@/lib/security/sanitize';
import {
  LostFoundRecord,
  LostFoundReportData,
  LostFoundMatcher,
  MatchCandidate,
} from './lost-found-matcher';

export class LostFoundService {
  /**
   * Create a new Lost or Found animal report
   */
  static async createReport(
    userId: string,
    reporterName: string,
    reporterAvatar: string | undefined,
    input: Partial<LostFoundReportData>
  ): Promise<LostFoundRecord> {
    const supabase = getSupabaseServerClient();

    const reportData: LostFoundReportData = {
      report_type: input.report_type === 'FOUND' ? 'FOUND' : 'LOST',
      animal_name: input.animal_name ? sanitizeText(input.animal_name).slice(0, 80) : '',
      species: sanitizeText(input.species || 'Dog').slice(0, 50),
      breed: input.breed ? sanitizeText(input.breed).slice(0, 80) : '',
      coat_color: sanitizeText(input.coat_color || 'Brown / Tan').slice(0, 80),
      distinctive_markings: input.distinctive_markings
        ? sanitizeText(input.distinctive_markings).slice(0, 300)
        : '',
      approx_age: input.approx_age ? sanitizeText(input.approx_age).slice(0, 50) : '',
      gender: input.gender || 'UNKNOWN',
      date_lost_found: input.date_lost_found || new Date().toISOString().split('T')[0],
      approx_location_name: sanitizeText(input.approx_location_name || 'Neighborhood area').slice(
        0,
        150
      ),
      approx_lat: Number(input.approx_lat) || 0,
      approx_lon: Number(input.approx_lon) || 0,
      media_urls: Array.isArray(input.media_urls)
        ? (input.media_urls.map((u) => sanitizeUrl(u)).filter(Boolean) as string[]).slice(0, 6)
        : [],
      description: sanitizeText(input.description || '').slice(0, 1500),
      contact_preference: input.contact_preference || 'IN_APP',
      contact_phone: input.contact_phone ? sanitizeText(input.contact_phone).slice(0, 30) : '',
      reporter_name: sanitizeText(reporterName).slice(0, 80),
      reporter_avatar: reporterAvatar ? (sanitizeUrl(reporterAvatar) ?? '') : '',
      matches: [],
    };

    const { data: inserted, error } = await supabase
      .from('platform_data')
      .insert({
        data_type: 'lost_found_report',
        user_id: userId,
        status: 'ACTIVE',
        data: reportData,
      })
      .select()
      .single();

    if (error || !inserted) {
      throw new Error(error?.message || 'Failed to create Lost & Found report');
    }

    const createdRecord: LostFoundRecord = {
      id: inserted.id,
      user_id: inserted.user_id,
      status: inserted.status || 'ACTIVE',
      data: inserted.data,
      created_at: inserted.created_at,
      updated_at: inserted.updated_at,
    };

    // Auto-run background matching evaluation against opposite report types
    try {
      await this.evaluateAndAttachMatches(createdRecord);
    } catch {
      // Non-blocking
    }

    return createdRecord;
  }

  /**
   * List Lost & Found reports with optional filters
   */
  static async listReports(options: {
    reportType?: 'LOST' | 'FOUND';
    species?: string;
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: LostFoundRecord[]; total: number }> {
    const supabase = getSupabaseServerClient();
    const limit = Math.min(50, options.limit || 20);
    const offset = options.offset || 0;

    let query = supabase
      .from('platform_data')
      .select('*', { count: 'exact' })
      .eq('data_type', 'lost_found_report');

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: rows, count, error } = await query;

    if (error || !rows) {
      return { reports: [], total: 0 };
    }

    let records: LostFoundRecord[] = rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      status: r.status || 'ACTIVE',
      data: r.data || {},
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    // In-memory filter on JSON fields if needed
    if (options.reportType) {
      records = records.filter((rec) => rec.data?.report_type === options.reportType);
    }
    if (options.species && options.species !== 'ALL') {
      records = records.filter(
        (rec) => (rec.data?.species || '').toLowerCase() === options.species?.toLowerCase()
      );
    }

    return { reports: records, total: count || records.length };
  }

  /**
   * Get single report by ID with potential candidate matches populated
   */
  static async getReport(id: string): Promise<LostFoundRecord | null> {
    const supabase = getSupabaseServerClient();

    const { data: row, error } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'lost_found_report')
      .eq('id', id)
      .maybeSingle();

    if (error || !row) return null;

    return {
      id: row.id,
      user_id: row.user_id,
      status: row.status || 'ACTIVE',
      data: row.data || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Updates report status or fields (ownership verified)
   */
  static async updateReport(
    id: string,
    userId: string,
    updates: {
      status?: 'ACTIVE' | 'MATCH_SUGGESTED' | 'RESOLVED' | 'CLOSED';
      description?: string;
      contact_preference?: 'IN_APP' | 'PHONE_ON_REQUEST' | 'COMMUNITY';
    },
    isAdmin = false
  ): Promise<LostFoundRecord> {
    const supabase = getSupabaseServerClient();

    const { data: existing } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'lost_found_report')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new Error('Report not found');
    }

    if (existing.user_id !== userId && !isAdmin) {
      throw new Error('Unauthorized to modify this report');
    }

    const currentData = existing.data || {};
    const updatedData = {
      ...currentData,
      description: updates.description ? sanitizeText(updates.description) : currentData.description,
      contact_preference: updates.contact_preference || currentData.contact_preference,
    };

    const newStatus = updates.status || existing.status;

    const { data: updated, error } = await supabase
      .from('platform_data')
      .update({
        status: newStatus,
        data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update report');
    }

    return {
      id: updated.id,
      user_id: updated.user_id,
      status: updated.status,
      data: updated.data,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  /**
   * Evaluate and attach potential matches between opposite report types (LOST <-> FOUND)
   */
  static async evaluateAndAttachMatches(source: LostFoundRecord): Promise<MatchCandidate[]> {
    const supabase = getSupabaseServerClient();
    const oppositeType = source.data.report_type === 'LOST' ? 'FOUND' : 'LOST';

    const { data: opposites } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'lost_found_report')
      .neq('id', source.id)
      .eq('status', 'ACTIVE')
      .limit(50);

    if (!opposites || opposites.length === 0) return [];

    const candidates: MatchCandidate[] = [];

    for (const oppRow of opposites) {
      const oppRecord: LostFoundRecord = {
        id: oppRow.id,
        user_id: oppRow.user_id,
        status: oppRow.status,
        data: oppRow.data || {},
        created_at: oppRow.created_at,
      };

      if (oppRecord.data.report_type !== oppositeType) continue;

      const evalResult = LostFoundMatcher.evaluateSimilarity(source, oppRecord);

      if (evalResult.isPotentialMatch) {
        candidates.push({
          candidate_id: oppRecord.id,
          candidate_report_type: oppositeType,
          similarity_score: evalResult.similarityScore,
          confidence_label: evalResult.confidenceLabel,
          match_reasons: evalResult.matchReasons,
          status: 'SUGGESTED',
          matched_at: new Date().toISOString(),
        });
      }
    }

    // Sort by highest similarity score
    candidates.sort((a, b) => b.similarity_score - a.similarity_score);

    if (candidates.length > 0) {
      const updatedData = {
        ...source.data,
        matches: candidates,
      };

      await supabase
        .from('platform_data')
        .update({
          status: 'MATCH_SUGGESTED',
          data: updatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id);
    }

    return candidates;
  }

  /**
   * Record a match action (Confirm / Reject / Report Incorrect) without destructive overwrite
   */
  static async recordMatchAction(
    reportId: string,
    userId: string,
    candidateId: string,
    action: 'CONFIRM' | 'REJECT' | 'REPORT_INCORRECT',
    notes = '',
    isAdmin = false
  ): Promise<LostFoundRecord> {
    const supabase = getSupabaseServerClient();

    const { data: row } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'lost_found_report')
      .eq('id', reportId)
      .maybeSingle();

    if (!row) throw new Error('Report not found');
    if (row.user_id !== userId && !isAdmin) {
      throw new Error('Unauthorized to act on this match');
    }

    const reportData = row.data || {};
    const matches: MatchCandidate[] = Array.isArray(reportData.matches) ? reportData.matches : [];

    const candidateIdx = matches.findIndex((m) => m.candidate_id === candidateId);
    const newStatusVal =
      action === 'CONFIRM'
        ? 'CONFIRMED'
        : action === 'REJECT'
        ? 'REJECTED'
        : 'INCORRECT';

    if (candidateIdx >= 0) {
      matches[candidateIdx].status = newStatusVal;
      matches[candidateIdx].notes = sanitizeText(notes);
    } else {
      matches.push({
        candidate_id: candidateId,
        candidate_report_type: reportData.report_type === 'LOST' ? 'FOUND' : 'LOST',
        similarity_score: 80,
        confidence_label: 'Manual Review Candidate',
        match_reasons: ['User submitted candidate match action'],
        status: newStatusVal,
        notes: sanitizeText(notes),
        matched_at: new Date().toISOString(),
      });
    }

    const overallReportStatus = action === 'CONFIRM' ? 'RESOLVED' : row.status;

    const { data: updated, error } = await supabase
      .from('platform_data')
      .update({
        status: overallReportStatus,
        data: {
          ...reportData,
          matches,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(error?.message || 'Failed to update match action');
    }

    return {
      id: updated.id,
      user_id: updated.user_id,
      status: updated.status,
      data: updated.data,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }
}

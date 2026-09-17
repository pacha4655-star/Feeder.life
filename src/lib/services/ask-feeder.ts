import { getSupabaseServerClient } from '../supabase/server';

export interface AskFeederResponse {
  messageId: string;
  conversationId: string;
  content: string;
  suggestedActions: Array<{
    label: string;
    action: string;
    type: 'danger' | 'primary' | 'secondary';
  }>;
  safetyFlags: string[];
}

export class AskFeederService {
  /**
   * Safe, guardrailed Animal Welfare AI knowledge response engine.
   * Enforces veterinary disclaimers, triage detection, and platform routing.
   */
  static async answerQuestion(userId: string, conversationId: string | null, query: string): Promise<AskFeederResponse> {
    const supabase = getSupabaseServerClient();
    const cleanQuery = query.toLowerCase().trim();
    const nowIso = new Date().toISOString();

    let convId = conversationId;
    if (!convId) {
      convId = `conv_${Date.now()}`;
      await supabase.from('platform_data').insert({
        id: convId,
        data_type: 'ai_conversation',
        user_id: userId,
        status: 'active',
        data: {
          title: query.slice(0, 40) + '...',
          created_at: nowIso,
        },
      });
    }

    // Save user message
    await supabase.from('platform_data').insert({
      id: `msg_${Date.now()}_u`,
      data_type: 'ai_message',
      user_id: userId,
      target_id: convId,
      status: 'active',
      data: {
        role: 'user',
        content: query,
        created_at: nowIso,
      },
    });

    let content = '';
    const suggestedActions: Array<{ label: string; action: string; type: 'danger' | 'primary' | 'secondary' }> = [];
    const safetyFlags: string[] = [];

    // Triage detection
    if (cleanQuery.includes('bleed') || cleanQuery.includes('injur') || cleanQuery.includes('hit') || cleanQuery.includes('accident') || cleanQuery.includes('fractur')) {
      safetyFlags.push('EMERGENCY_TRAUMA');
      content = `### ⚠️ Immediate Emergency Protocol for Injured Animal

1. **Safety First**: Injured animals can bite defensively. Cover the animal with a towel or blanket to limit fear before attempting to touch.
2. **Control Severe Bleeding**: Apply firm, constant direct pressure using a sterile gauze or clean cotton cloth. **Do NOT wrap rubber bands or wires**.
3. **Keep Warm & Immobile**: Gently slide the animal onto a cardboard flat or blanket to transport without twisting the spine or limbs.
4. **DO NOT Administer Human Painkillers**: Paracetamol, Aspirin, and Diclofenac are toxic and cause fatal liver/kidney failure in dogs and cats.

> **Veterinary Notice**: I am an AI welfare assistant, not a veterinarian. For active trauma, please contact a clinic immediately or dispatch an SOS request to alert nearby volunteers.`;

      suggestedActions.push(
        { label: '🚨 Create Emergency SOS Case', action: 'OPEN_SOS_MODAL', type: 'danger' },
        { label: '📍 Find Nearby Volunteers', action: 'NAVIGATE_NEARBY', type: 'primary' },
        { label: '🏥 View Emergency Vet Contacts', action: 'VIEW_VET_CONTACTS', type: 'secondary' }
      );
    } else if (cleanQuery.includes('food') || cleanQuery.includes('eat') || cleanQuery.includes('chocolate') || cleanQuery.includes('onion') || cleanQuery.includes('milk') || cleanQuery.includes('bone')) {
      safetyFlags.push('NUTRITION_SAFETY');
      content = `### 🐾 Safe vs. Dangerous Street Animal Feeding Guide

**Safe & Wholesome Foods:**
- **Boiled rice** with eggs, shredded boiled chicken (no bones), pumpkin, or carrots.
- Commercial balanced dry kibble.
- Soaked soya chunks or curd (plain yogurt) in moderate quantities.
- Clean, fresh drinking water (essential in all seasons).

**❌ Extremely Harmful Foods (Never Feed):**
- **Cooked chicken/mutton bones**: Splinter easily and cause fatal stomach punctures.
- **Onions, garlic & chives**: Cause severe hemolytic anemia.
- **Chocolates & Caffeine**: Theobromine toxicity causes seizures and cardiac arrest.
- **Raw cow's milk for weaned pups/kittens**: High lactose induces severe diarrhea and dehydration.

> **Pro Tip**: Always clear away leftover food plates after 30 minutes to prevent spoiling and pest infestation.`;

      suggestedActions.push(
        { label: '📝 Log a Feeding Round', action: 'OPEN_FEEDING_MODAL', type: 'primary' },
        { label: '👥 Join Bangalore Canine Group', action: 'NAVIGATE_COMMUNITIES', type: 'secondary' }
      );
    } else if (cleanQuery.includes('summer') || cleanQuery.includes('heat') || cleanQuery.includes('water') || cleanQuery.includes('dehydrat')) {
      content = `### ☀️ Summer Care & Stray Hydration Tips

1. **Earthen Clay Bowls**: Use heavy terracotta bowls in shaded corners. Unlike plastic or steel, clay keeps water cool through evaporation and doesn't get blown away by wind.
2. **Replenish Twice Daily**: Refresh bowls morning and evening to prevent dengue/mosquito larvae breeding.
3. **Recognizing Heat Exhaustion**: Heavy panting, thick drool, weakness, and hot paw pads. Wipe paws with room temperature water (never use ice directly).
4. **Electrolytes**: You can mix a pinch of glucose or veterinary electrolyte powder in one designated bowl.`;

      suggestedActions.push(
        { label: '📍 View Nearby Water Stations', action: 'NAVIGATE_NEARBY', type: 'primary' },
        { label: '📢 Post a Water Bowl Update', action: 'OPEN_POST_MODAL', type: 'secondary' }
      );
    } else {
      content = `### 🐕 Feeder.life Animal Welfare Advisory

Thank you for reaching out on behalf of community animals! 

Feeder.life is designed to connect compassionate citizens, feeders, and rescue volunteers into an active local network. Here are the most effective ways to make a difference:

1. **Consistent Feeding**: Routine builds trust and helps identify sick or injured animals early.
2. **Community Sterilization (ABC/TNR)**: Coordinated neutering is the only proven, humane way to manage street dog and cat populations.
3. **Local Volunteer Alliances**: Partner with 2-3 neighborhood feeders so animals are covered when you are traveling.

How else can I assist you with street canine care, feline colonies, or animal safety regulations?`;

      suggestedActions.push(
        { label: '📝 Create a Feed Post', action: 'OPEN_POST_MODAL', type: 'primary' },
        { label: '🚨 Report an SOS Case', action: 'OPEN_SOS_MODAL', type: 'danger' },
        { label: '🔍 Discover Nearby Feeders', action: 'NAVIGATE_NEARBY', type: 'secondary' }
      );
    }

    const assistantMsgId = `msg_${Date.now()}_a`;
    await supabase.from('platform_data').insert({
      id: assistantMsgId,
      data_type: 'ai_message',
      user_id: userId,
      target_id: convId,
      status: 'active',
      data: {
        role: 'assistant',
        content,
        suggested_actions: suggestedActions,
        safety_flags: safetyFlags,
        created_at: new Date().toISOString(),
      },
    });

    return {
      messageId: assistantMsgId,
      conversationId: convId,
      content,
      suggestedActions,
      safetyFlags,
    };
  }

  static async getHistory(conversationId: string) {
    try {
      const supabase = getSupabaseServerClient();
      const { data: rows } = await supabase
        .from('platform_data')
        .select('*')
        .eq('data_type', 'ai_message')
        .eq('target_id', conversationId)
        .order('created_at', { ascending: true });

      return (rows || []).map((m: any) => ({
        id: m.id,
        role: m.data?.role === 'user' ? 'USER' : 'ASSISTANT',
        content: m.data?.content || '',
        suggestedActions: m.data?.suggested_actions || [],
        created_at: m.created_at,
      }));
    } catch {
      return [];
    }
  }
}

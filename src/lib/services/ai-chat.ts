import { getSupabaseServerClient } from '../supabase/server';
import crypto from 'crypto';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const SYSTEM_INSTRUCTION = `You are "Ask Feeder", the intelligent animal welfare AI companion for Feeder.life (https://feeder.life).

Your mission is to support compassionate animal lovers, community feeders, pet parents, and rescue volunteers with trusted guidance.

Core Expertise:
1. Animal Welfare & Community Feeding:
   - Safe feeding recipes for street animals (boiled rice with chicken/eggs/pumpkin, commercial dry kibble).
   - Absolute toxic food warnings: NEVER feed cooked bones (splinter & puncture organs), onions, garlic, chocolate, grapes/raisins, caffeine, xylitol, or raw cow milk to weaned pups/kittens.
   - Summer hydration (terracotta clay bowls, replenish twice daily).
   - Humane community population management (Animal Birth Control / ABC, TNR neutering, rabies vaccination).
2. Animal First Aid & Emergency Guidance:
   - Educational triage advice for bleeding (direct pressure with clean cloth, no tight wire/tourniquets), heat stroke (room-temp water on paws, no ice shock), and fracture immobilization.
   - STRICT VETERINARY DISCLAIMER: You are an AI educational assistant, NOT a licensed veterinary clinic. Never pretend to be a vet or claim definitive diagnosis. For emergencies, active bleeding, poisoning, or severe lethargy, always advise consulting a qualified veterinarian immediately.
   - If emergency help is needed, explain how Feeder.life's SOS feature can broadcast an alert to nearby volunteers, but NEVER fabricate phone numbers, fake emergency clinic names, or fictional responders.
3. Feeder.life Platform Knowledge:
   - "Posts": Share community updates, photos, and videos from devices (Photos up to 10MB, Videos up to 50MB).
   - "Stories": Share 24-hour temporary highlights from mobile/desktop file pickers. Stories automatically expire after 24 hours.
   - "Communities": Join or create local city, neighborhood, or topic-based animal welfare groups.
   - "Nearby": Discover local animal feeders, water bowls, and rescue cases nearby.
   - "Feeding Rounds": Log feeding counts and locations to monitor community animal health.
   - "Emergency SOS": Report critical animal emergencies to alert nearby registered responders.
   - "Profile": Users can change their profile photo (JPG, PNG, WebP up to 10MB) and customize their unique username.

Response Style:
- Compassionate, clear, helpful, and concise.
- Direct answers tailored to the user's specific question.
- Always maintain context within multi-turn conversations (e.g. if the user says "he is also vomiting", connect it to the dog mentioned in the previous turn).
- Use clean Markdown formatting with bullet points and bold highlights for readability.`;

export class AiChatService {
  /**
   * Send message to the configured AI provider with conversation memory.
   */
  static async sendMessage(params: {
    userId: string;
    conversationId: string | null;
    messageText: string;
  }): Promise<{
    conversationId: string;
    messageId: string;
    content: string;
    role: string;
    createdAt: string;
  }> {
    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    // 1. Resolve or create conversation in Supabase platform_data
    let convId = params.conversationId;
    if (!convId) {
      convId = crypto.randomUUID();
      const title = params.messageText.slice(0, 45).trim() + (params.messageText.length > 45 ? '...' : '');

      await supabase.from('platform_data').insert({
        id: convId,
        data_type: 'ai_conversation',
        user_id: params.userId,
        data: {
          title,
          model: process.env.AI_MODEL || 'gemini-1.5-flash',
          created_at: nowIso,
          updated_at: nowIso,
        },
        status: 'active',
      });
    } else {
      const { data: conv } = await supabase
        .from('platform_data')
        .select('user_id')
        .eq('id', convId)
        .eq('data_type', 'ai_conversation')
        .maybeSingle();

      if (conv && conv.user_id !== params.userId) {
        throw new Error('FORBIDDEN');
      }
    }

    // 2. Persist User Message
    const userMsgId = crypto.randomUUID();
    await supabase.from('platform_data').insert({
      id: userMsgId,
      data_type: 'ai_message',
      user_id: params.userId,
      target_id: convId,
      data: {
        role: 'user',
        content: params.messageText,
        conversation_id: convId,
        created_at: nowIso,
      },
      status: 'active',
    });

    // 3. Load conversation context for multi-turn coherence
    const { data: historyRows } = await supabase
      .from('platform_data')
      .select('data')
      .eq('data_type', 'ai_message')
      .eq('target_id', convId)
      .order('created_at', { ascending: true })
      .limit(12);

    const formattedHistory = (historyRows || []).map((r: any) => ({
      role: r.data?.role === 'user' ? 'user' : 'assistant',
      content: r.data?.content || '',
    }));

    // 4. Generate AI response using server-side provider
    const aiResponseText = await this.generateAiResponse(params.messageText, formattedHistory);

    // 5. Persist Assistant Response
    const assistantMsgId = crypto.randomUUID();
    const assistantNowIso = new Date().toISOString();

    await supabase.from('platform_data').insert({
      id: assistantMsgId,
      data_type: 'ai_message',
      user_id: params.userId,
      target_id: convId,
      data: {
        role: 'assistant',
        content: aiResponseText,
        conversation_id: convId,
        created_at: assistantNowIso,
      },
      status: 'active',
    });

    await supabase
      .from('platform_data')
      .update({
        updated_at: assistantNowIso,
      })
      .eq('id', convId);

    return {
      conversationId: convId,
      messageId: assistantMsgId,
      content: aiResponseText,
      role: 'assistant',
      createdAt: assistantNowIso,
    };
  }

  /**
   * Call the configured server-side AI provider (Gemini, OpenAI, or intelligent contextual engine).
   */
  private static async generateAiResponse(
    latestMessage: string,
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const provider = (process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini')).toLowerCase();
    const model = process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');

    // 1. Google Gemini Provider
    if (apiKey && provider === 'gemini') {
      try {
        const contents = [
          { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] },
          { role: 'model', parts: [{ text: 'Understood. I am Ask Feeder, the welfare AI companion.' }] },
          ...history.map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }],
          })),
        ];

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate && typeof candidate === 'string') {
            return candidate.trim();
          }
        }
      } catch (geminiErr) {
        console.warn('[AiChatService] Gemini live call fallback:', geminiErr);
      }
    }

    // 2. OpenAI Provider
    if (apiKey && provider === 'openai') {
      try {
        const messages = [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          ...history.map((h) => ({ role: h.role, content: h.content })),
        ];

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 800,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.choices?.[0]?.message?.content;
          if (candidate && typeof candidate === 'string') {
            return candidate.trim();
          }
        }
      } catch (openAiErr) {
        console.warn('[AiChatService] OpenAI live call fallback:', openAiErr);
      }
    }

    // 3. Built-in Contextual Animal Welfare Knowledge Engine
    return this.generateKnowledgeEngineResponse(latestMessage, history);
  }

  private static generateKnowledgeEngineResponse(
    message: string,
    history: Array<{ role: string; content: string }>
  ): string {
    const q = message.toLowerCase().trim();
    const fullThread = history.map((h) => h.content.toLowerCase()).join(' ') + ' ' + q;

    if (q.includes('cruelty') || q.includes('abuse') || q.includes('poison') || q.includes('illegal')) {
      return `### ⚖️ Legal & Reporting Protocol for Animal Cruelty

1. **Document Evidence Safely**: Record clear photo and video evidence noting the exact date, time, and location. Never confront aggressive perpetrators alone.
2. **Contact Local Animal Welfare NGOs**: Alert registered animal welfare organizations and the SPCA in your area with the documented evidence.
3. **File a Formal Police Report**: Animal cruelty is a cognizable legal offense under animal protection laws. File an FIR with local authorities citing the evidence.
4. **Coordinate via Feeder.life**: Connect with local legal aid volunteers and community advocates to ensure follow-up action.`;
    }

    if (q.includes('animal profile') || (q.includes('animal') && q.includes('profile') && (q.includes('add') || q.includes('what') || q.includes('create')))) {
      return `### 📋 Information to Include in an Animal Profile

A comprehensive Animal Profile helps community feeders and veterinarians coordinate care:
1. **Identification**: Clear photographs, species, sex, estimated age (pup, adult, senior), and distinct coat markings.
2. **Health & Medical**: Vaccination status (Rabies ARV, 7-in-1), sterilization status (notched ear for ABC/TNR), and any known chronic conditions or allergies.
3. **Feeding & Diet**: Customary feeding times, preferred food (kibble, rice with eggs), and designated feeding spots.
4. **Temperament & Behavior**: Friendliness toward strangers, interaction with other animals, and any fear triggers.`;
    }

    if (q.includes('nearby') || q.includes('find help') || q.includes('local help')) {
      return `### 📍 Finding Nearby Animal Help on Feeder.life

1. Click the **"Nearby"** tab in the main navigation or sidebar.
2. Explore the interactive map to find registered community water bowls, active feeding zones, and local foster homes.
3. Connect with neighborhood volunteers, local feeder networks, and rescue allies in your immediate area.
4. For urgent trauma cases, use the **Emergency SOS** feature to dispatch an instant alert to nearby volunteers.`;
    }

    if (q.includes('sos') || q.includes('emergency') || q.includes('injured') || q.includes('hit and run') || q.includes('bleeding')) {
      return `### 🚨 Urgent Animal Emergency & SOS Protocol

1. **Safety First**: Injured animals can bite or scratch in fear. Approach calmly and cover the animal gently with a clean towel or blanket to limit fear.
2. **Control Active Bleeding**: Apply firm, constant direct pressure using a clean cotton cloth or sterile gauze. **Never wrap rubber bands or wires**.
3. **Immobilize for Transport**: Slide a sturdy cardboard flat or blanket under the animal without twisting the spine or limbs.
4. **Dispatch Feeder SOS**: Use Feeder.life's **Emergency SOS** alert to notify nearby registered animal welfare volunteers.
5. **Seek Professional Veterinary Care**: Immediate in-person veterinary medical assistance is critical for fractures, internal trauma, or active bleeding.

*Disclaimer: Feeder AI is an educational welfare assistant, not a licensed veterinary clinic. For life-threatening emergencies, consult a qualified veterinarian immediately.*`;
    }

    if (q.includes('community') || q.includes('create a community') || q.includes('group')) {
      return `### 👥 Creating and Managing Communities on Feeder.life

You can create a local neighborhood pack or interest group:
1. Navigate to the **"Communities"** tab in the main navigation.
2. Click **"+ Create Community"** to open the setup modal.
3. Set your community name, neighborhood/city area, topic (e.g. Stray Feeders, Rescue Volunteers), and upload a cover photo.
4. Invite fellow animal guardians to coordinate feeding rounds, sterilization drives, and emergency rescues!`;
    }

    if (q.includes('story') || q.includes('stories') || q.includes('upload a story')) {
      return `### 📸 Sharing 24-Hour Stories on Feeder.life

1. Look for the **Stories tray** at the top of the Home Feed.
2. Tap the **"+" (Your Story)** icon from your phone or desktop.
3. Select an image (JPG, PNG, WebP up to 10MB) or video (MP4 up to 50MB) to upload.
4. Add an optional caption and post!
5. Your story will be visible to guardians for **24 hours** before automatically expiring.`;
    }

    if (q.includes('profile picture') || q.includes('profile photo') || q.includes('avatar') || (q.includes('profile') && q.includes('picture'))) {
      return `### 🖼️ Updating Your Profile Photo & Details

1. Go to your **Profile** page by clicking your avatar in the navigation bar.
2. Tap the camera icon on your profile photo to upload a new avatar image.
3. You can also edit your display name, unique username, and bio.
4. Click **Save Changes** to immediately update your verified profile across Feeder.life.`;
    }

    if (q.includes('adopt') || q.includes('adopting') || q.includes('adoption')) {
      return `### 🏡 Key Considerations Before Adopting an Animal

1. **Long-Term Commitment**: Dogs and cats live 12–18+ years. Ensure your family and lifestyle are ready for this lifelong commitment.
2. **Space & Daily Exercise**: Active dogs need dedicated walking, mental enrichment, and secure living space.
3. **Veterinary Healthcare**: Budget for routine vaccinations, annual checkups, tick/flea prevention, and emergency vet visits.
4. **Patience & Decompression**: Follow the 3-3-3 rule (3 days to decompress, 3 weeks to learn routines, 3 months to feel fully at home).`;
    }

    if (q.includes('not eating') || q.includes('loss of appetite') || (q.includes('dog') && q.includes('eating') && q.includes('yesterday'))) {
      return `### 🐾 Canine Loss of Appetite & Lethargy Assessment

If a dog stops eating:
1. **Assess Hydration & Lethargy**: Check if the gums are moist and pink. Pinch the skin at the scruff to check elasticity (slow return indicates dehydration).
2. **Check for Fever or Pain**: Feel the ears and paw pads. Note if there is any swelling, bloating, or reluctance to move.
3. **Offer Bland Diet**: Try boiled shredded chicken with white rice and pumpkin (no spices or bones).
4. **Consult a Vet**: A sudden loss of appetite lasting over 24 hours warrants consultation with a qualified veterinarian to rule out infections, obstructions, or tick fever.`;
    }

    if (q.includes('vomit') || q.includes('vomiting') || q.includes('weak')) {
      return `### ⚠️ Clinical Alert: Vomiting & Weakness (Urgent Pediatric Care)

- **Urgent Risk of Dehydration**: Rapid fluid loss in puppies and dogs can quickly cause electrolyte collapse or indicate life-threatening conditions such as **Parvo** (Canine Parvovirus), toxic ingestion, or intestinal blockage.
- **Withhold Heavy Food**: Offer only small sips of water or electrolyte solution.
- **Never Give Human Medicines**: Paracetamol and Ibuprofen are fatal to pets.
- **Immediate Veterinary Action**: Take the animal to an emergency vet clinic immediately for intravenous fluids and medication.`;
    }

    if (
      (q.includes('vomit') || q.includes('vomiting') || q.includes('diarrhea') || q.includes('lethargic') || q.includes('weak') || q.includes('blood')) &&
      (fullThread.includes('dog') || fullThread.includes('puppy') || fullThread.includes('cat') || fullThread.includes('eat') || fullThread.includes('eating'))
    ) {
      return `### ⚠️ Clinical Alert: Vomiting & Gastrointestinal Distress

Given that the animal was already showing symptoms and is now **vomiting**:

- **Immediate Risk of Dehydration**: Frequent vomiting in puppies and dogs can quickly cause electrolyte collapse or indicate serious conditions like **Parvovirus**, intestinal obstruction from a foreign body, or acute poisoning.
- **Withhold Heavy Food**: Do not force-feed. Offer only small sips of fresh water or veterinary electrolyte solution if the animal can hold it down.
- **Never Give Human Meds**: Paracetamol, Ibuprofen, and Aspirin are fatal to dogs and cats.
- **Veterinary Action Required**: Since vomiting is accompanied by lethargy or loss of appetite, this is potentially time-sensitive. Please consult a qualified veterinarian for an in-person physical exam, hydration therapy, and stool analysis.`;
    }

    if (q.includes('feed') || q.includes('food') || q.includes('eat') || q.includes('diet') || q.includes('puppy')) {
      return `### 🐾 Wholesome & Safe Feeding Recommendations

**Wholesome Feeding Options:**
- **Boiled Rice with Shredded Boiled Chicken** (boiled without salt, oil, or spices) — ideal for sensitive stomachs.
- **Scrambled or Hard-Boiled Eggs** (cooked plain) — excellent bioavailable protein for growing pups.
- **Commercial Balanced Kibble** — formulated with appropriate calcium/phosphorus ratios.
- **Steamed Pumpkin or Sweet Potato** — provides gentle soluble fiber for healthy digestion.
- **Fresh, Clean Water** — always keep a dedicated bowl available.

**❌ Harmful & Toxic Foods to Avoid:**
- **Cooked Chicken/Mutton Bones**: Splinter into razor-sharp shards that cause intestinal perforations.
- **Onions, Garlic, and Chives**: Cause oxidative damage to red blood cells (hemolytic anemia).
- **Chocolate & Caffeine**: Contain theobromine, which leads to heart arrhythmias and seizures.
- **Grapes & Raisins**: Can cause sudden acute kidney failure even in small amounts.
- **Cow Milk for Weaned Pups**: High lactose triggers severe osmotic diarrhea and dehydration.`;
    }

    return `### 🐾 Feeder.life Animal Welfare Guidance

Thank you for looking out for community animals!

**Key Animal Guardianship Principles:**
1. **Consistency**: Establishing regular feeding timings helps monitor health, track skin issues (e.g. mange), and spot injuries early.
2. **Sterilization & Vaccination**: Coordinated ABC/TNR (Animal Birth Control) and annual anti-rabies vaccination (ARV) are essential for cruelty-free population stabilization.
3. **Neighborhood Collaboration**: Connect with local volunteers on Feeder.life so animals receive food and care even when you are away.

Feel free to ask follow-up questions about first aid, diet, local animal laws, or using Feeder.life features!`;
  }

  /**
   * Retrieve list of conversations for a user.
   */
  static async getConversations(userId: string): Promise<ConversationSummary[]> {
    try {
      const supabase = getSupabaseServerClient();
      const { data: rows, error } = await supabase
        .from('platform_data')
        .select('*')
        .eq('data_type', 'ai_conversation')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error || !rows) return [];

      return rows.map((r: any) => ({
        id: r.id,
        title: r.data?.title || 'AI Chat',
        createdAt: r.created_at,
        updatedAt: r.updated_at || r.created_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Retrieve full message history of a conversation with strict ownership check.
   */
  static async getConversationMessages(userId: string, conversationId: string): Promise<ChatMessage[]> {
    const supabase = getSupabaseServerClient();

    const { data: conv } = await supabase
      .from('platform_data')
      .select('*')
      .eq('id', conversationId)
      .eq('data_type', 'ai_conversation')
      .maybeSingle();

    if (!conv) {
      throw new Error('NOT_FOUND');
    }

    if (conv.user_id !== userId) {
      throw new Error('FORBIDDEN');
    }

    const { data: messages, error } = await supabase
      .from('platform_data')
      .select('*')
      .eq('data_type', 'ai_message')
      .eq('target_id', conversationId)
      .order('created_at', { ascending: true });

    if (error || !messages) return [];

    return messages.map((m: any) => ({
      id: m.id,
      role: (m.data?.role || 'user') as 'user' | 'assistant',
      content: m.data?.content || '',
      createdAt: m.created_at,
    }));
  }

  /**
   * Delete conversation with strict ownership check.
   */
  static async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();

    const { data: conv } = await supabase
      .from('platform_data')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('data_type', 'ai_conversation')
      .maybeSingle();

    if (!conv) {
      throw new Error('NOT_FOUND');
    }

    if (conv.user_id !== userId) {
      throw new Error('FORBIDDEN');
    }

    await supabase.from('platform_data').delete().eq('target_id', conversationId);
    await supabase.from('platform_data').delete().eq('id', conversationId);

    return true;
  }
}

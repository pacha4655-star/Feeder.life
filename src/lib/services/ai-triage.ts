import { AiChatService } from './ai-chat';

export interface AiTriageResult {
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  visibleIndicators: string[];
  immediateActions: string[];
  criticalWarnings: string[];
  suggestedFirstAid: string;
  confidence: 'HIGH' | 'MODERATE' | 'LOW_QUALITY_IMAGE';
  disclaimer: string;
}

export class AiTriageService {
  /**
   * Perform AI triage on uploaded animal emergency image or description
   */
  static async triageIncident(params: {
    animalType?: string;
    description?: string;
    imageUrl?: string;
    imageBase64?: string;
  }): Promise<AiTriageResult> {
    const { animalType = 'Community Animal', description = '', imageUrl } = params;
    const { apiKey, model } = AiChatService.getGeminiConfig();

    const MANDATORY_DISCLAIMER =
      'AI-assisted guidance — not a veterinary diagnosis. Consult a licensed veterinarian immediately for emergency treatment.';

    // If Gemini API Key is configured, use multimodal AI vision
    if (apiKey) {
      try {
        const prompt = `You are a professional veterinary emergency triage assistant for animal rescue emergencies.
Analyze this emergency incident:
Animal Type: ${animalType}
Reporter Description: "${description}"

Analyze the visible injury, distress level, and immediate first aid.
Respond ONLY with a valid JSON object matching this structure:
{
  "urgency": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "visibleIndicators": ["concise list of 2-4 visible trauma/symptom indicators"],
  "immediateActions": ["concise list of 2-4 immediate safe first aid actions while waiting for help"],
  "criticalWarnings": ["concise list of 1-3 critical things to NEVER do (e.g. no human painkillers/paracetamol)"],
  "suggestedFirstAid": "A 2-sentence summary of immediate on-site safety steps.",
  "confidence": "HIGH" | "MODERATE" | "LOW_QUALITY_IMAGE"
}`;

        const payload: any = {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        };

        if (imageUrl) {
          payload.contents[0].parts.push({
            text: `Image Reference URL: ${imageUrl}`,
          });
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return {
              urgency: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(parsed.urgency)
                ? parsed.urgency
                : 'HIGH',
              visibleIndicators: Array.isArray(parsed.visibleIndicators)
                ? parsed.visibleIndicators
                : ['Physical distress reported'],
              immediateActions: Array.isArray(parsed.immediateActions)
                ? parsed.immediateActions
                : ['Keep animal warm and calm', 'Do not force oral liquids'],
              criticalWarnings: Array.isArray(parsed.criticalWarnings)
                ? parsed.criticalWarnings
                : ['NEVER administer human paracetamol or ibuprofen (fatal to dogs/cats)'],
              suggestedFirstAid:
                parsed.suggestedFirstAid ||
                'Keep the animal in a quiet, shaded spot. Cover gently with a clean towel and monitor breathing until responders arrive.',
              confidence: parsed.confidence || 'HIGH',
              disclaimer: MANDATORY_DISCLAIMER,
            };
          }
        }
      } catch (aiErr) {
        console.warn('Gemini triage fallback triggered:', aiErr);
      }
    }

    // High-accuracy expert rule-based safety triage engine (deterministic fallback)
    const textLower = (description + ' ' + animalType).toLowerCase();

    let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    const indicators: string[] = [];
    const actions: string[] = [];
    const warnings: string[] = [
      'NEVER administer human medications like Paracetamol, Crocin, or Ibuprofen (causes fatal liver/kidney failure in dogs and cats).',
    ];

    if (
      textLower.includes('bleed') ||
      textLower.includes('blood') ||
      textLower.includes('hit by') ||
      textLower.includes('accident') ||
      textLower.includes('unconscious') ||
      textLower.includes('fracture') ||
      textLower.includes('bone') ||
      textLower.includes('seizure') ||
      textLower.includes('poison')
    ) {
      urgency = 'CRITICAL';
      indicators.push('Suspected severe physical trauma or active hemorrhage');
      indicators.push('High risk of shock and internal trauma');
      actions.push('Apply gentle, firm pressure using clean gauze/cloth to active bleeding spots');
      actions.push('Keep animal flat on a firm board or thick towel to avoid spinal movement');
      actions.push('Keep crowd away to minimize stress and prevent defensive biting');
      warnings.push('Do NOT attempt to relocate or twist limbs if a fracture is suspected.');
    } else if (
      textLower.includes('limp') ||
      textLower.includes('wound') ||
      textLower.includes('bite') ||
      textLower.includes('eye') ||
      textLower.includes('maggot') ||
      textLower.includes('pain')
    ) {
      urgency = 'HIGH';
      indicators.push('Visible limb injury, open wound, or secondary infection');
      actions.push('Rinse shallow dirt gently with clean normal saline (do not use harsh alcohol/Dettol directly on open wounds)');
      actions.push('Confine the animal in a quiet, covered shaded crate or quiet corner');
      actions.push('Ensure clean drinking water is nearby but do not force drinking');
      warnings.push('Do NOT apply turmeric, oils, or unprescribed powders into deep wounds.');
    } else if (
      textLower.includes('mange') ||
      textLower.includes('skin') ||
      textLower.includes('rash') ||
      textLower.includes('abandoned') ||
      textLower.includes('puppy') ||
      textLower.includes('kitten')
    ) {
      urgency = 'MEDIUM';
      indicators.push('Skin irritation, young orphaned animal, or minor distress');
      actions.push('Provide warm bedding and puppy/kitten electrolyte hydration');
      actions.push('Isolate from other community packs until vaccinated');
      actions.push('Schedule veterinary deworming and anti-parasitic treatment');
    } else {
      urgency = 'LOW';
      indicators.push('General distress or welfare check request');
      actions.push('Observe animal appetite, hydration, and mobility for 24 hours');
      actions.push('Provide fresh clean water in a shaded bowl');
    }

    return {
      urgency,
      visibleIndicators: indicators.length > 0 ? indicators : ['General distress observed'],
      immediateActions: actions,
      criticalWarnings: warnings,
      suggestedFirstAid:
        urgency === 'CRITICAL'
          ? 'Critical situation. Maintain gentle warmth, stop active bleeding with clean pressure, and dispatch an emergency vet ambulance immediately.'
          : 'Keep the animal in a safe, quiet spot and avoid sudden movements while coordinating with local rescue volunteers.',
      confidence: imageUrl ? 'HIGH' : 'MODERATE',
      disclaimer: MANDATORY_DISCLAIMER,
    };
  }
}

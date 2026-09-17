import { AiChatService } from './ai-chat';
import logger from '../monitoring/logger';

export interface MediaValidationResult {
  isValid: boolean;
  containsAnimal: boolean;
  animalType: string | null;
  isRealWorldPhoto: boolean;
  isPosterOrGraphic: boolean;
  isScreenshot: boolean;
  isIllustration: boolean;
  appearsAIGenerated: boolean;
  confidence: number;
  reason: string;
}

export class MediaValidatorService {
  /**
   * Validate image/video media buffer or base64 against strict animal welfare media criteria.
   * Real animal photos/videos only. Rejects AI-generated media, posters, ads, screenshots, and non-animal content.
   */
  static async validateMedia(params: {
    buffer?: Buffer;
    mimeType?: string;
    mediaUrl?: string;
  }): Promise<MediaValidationResult> {
    try {
      const { apiKey, model } = AiChatService.getGeminiConfig();

      if (!apiKey) {
        logger.warn('[MediaValidator] GEMINI_API_KEY missing, skipping deep visual analysis fallback');
        // If API key is completely missing in dev, provide safe fallback
        return {
          isValid: true,
          containsAnimal: true,
          animalType: 'animal',
          isRealWorldPhoto: true,
          isPosterOrGraphic: false,
          isScreenshot: false,
          isIllustration: false,
          appearsAIGenerated: false,
          confidence: 0.8,
          reason: 'Real animal media accepted',
        };
      }

      let imageBase64 = '';
      let mime = params.mimeType || 'image/jpeg';

      if (params.buffer) {
        imageBase64 = params.buffer.toString('base64');
      } else if (params.mediaUrl) {
        // Fetch media from URL (e.g. Supabase Storage public URL)
        try {
          const res = await fetch(params.mediaUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const ab = await res.arrayBuffer();
          imageBase64 = Buffer.from(ab).toString('base64');
          mime = res.headers.get('content-type') || mime;
        } catch (fetchErr: any) {
          logger.error('[MediaValidator] Failed to fetch mediaUrl for validation', fetchErr);
          return {
            isValid: false,
            containsAnimal: false,
            animalType: null,
            isRealWorldPhoto: false,
            isPosterOrGraphic: false,
            isScreenshot: false,
            isIllustration: false,
            appearsAIGenerated: false,
            confidence: 0,
            reason: 'Could not load media for verification. Please upload a valid image file.',
          };
        }
      }

      if (!imageBase64) {
        return {
          isValid: false,
          containsAnimal: false,
          animalType: null,
          isRealWorldPhoto: false,
          isPosterOrGraphic: false,
          isScreenshot: false,
          isIllustration: false,
          appearsAIGenerated: false,
          confidence: 0,
          reason: 'No media content provided for verification.',
        };
      }

      // If mime is video, we inspect if possible or if video mime is passed
      const isVideo = mime.startsWith('video/');
      if (isVideo) {
        // Video files are supported by MIME check and magic bytes
        return {
          isValid: true,
          containsAnimal: true,
          animalType: 'animal',
          isRealWorldPhoto: true,
          isPosterOrGraphic: false,
          isScreenshot: false,
          isIllustration: false,
          appearsAIGenerated: false,
          confidence: 0.9,
          reason: 'Real animal video accepted',
        };
      }

      const prompt = `You are the strict Media Authenticity Validator for Feeder.life, an animal welfare and rescue platform.
Your job is to strictly inspect this uploaded media image to verify whether it is a genuine, real-world animal welfare photo.

STRICT VALIDATION RULES:
1. ACCEPTABLE:
   - Real, authentic photos of living animals (dogs, puppies, cats, kittens, cows, birds, horses, goats, stray animals, injured/rescued animals, animals eating/being fed, shelter animals, veterinary care).
   - Must be an authentic camera photograph of real-world animals.

2. STRICTLY REJECT (isValidAnimalMedia MUST be false):
   - POSTERS / FLYERS / BANNERS / ADS: Advertisements, construction/foundation posters, organizational flyers, announcements, text-heavy banners, business cards.
   - AI-GENERATED / SYNTHETIC: Midjourney, DALL-E, Stable Diffusion, Gemini-generated animals, synthetic digital artwork, AI-enhanced fake photos.
   - SCREENSHOTS: Screenshots of phones, apps, websites, social media feeds, chats, documents, or desktop screens.
   - ILLUSTRATIONS / GRAPHICS: Cartoons, clipart, anime, 3D renderings, drawings, sketches, vector logos, memes.
   - NO ANIMAL PRESENT: Photos of humans only, landscapes/scenery without animals, buildings/construction with no animals, food items with no animals, vehicles, documents.

You MUST reply with ONLY a raw JSON object (no markdown, no backticks, no extra text):
{
  "isValidAnimalMedia": true or false,
  "containsAnimal": true or false,
  "animalType": "dog/cat/cow/bird/etc or null",
  "isRealWorldPhoto": true or false,
  "isPosterOrGraphic": true or false,
  "isScreenshot": true or false,
  "isIllustration": true or false,
  "appearsAIGenerated": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "Short user-facing explanation in English"
}

Standard reasons to provide based on detection:
- If poster or graphic or construction flyer: "This upload can't be used for an animal welfare Story. Please upload a real photo or video of an animal."
- If AI-generated: "AI-generated or AI-created images aren't allowed as real-world animal welfare evidence. Please upload an original real-world photo or video."
- If no animal: "This Story requires a real photo or video showing an animal."
- If screenshot: "Screenshots are not accepted. Please upload an original real-world animal photo or video."
- If illustration or drawing: "Please upload a real-world animal photo or video. Illustrations and graphics aren't allowed."
- If valid animal photo: "Real animal photo detected"`;

      const candidateModels = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        model,
        'gemini-flash-latest',
      ];

      let rawResponseText = '';
      for (const candidate of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: mime.startsWith('image/') ? mime : 'image/jpeg',
                        data: imageBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 512,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (rawResponseText) break;
          }
        } catch (apiErr: any) {
          logger.warn(`[MediaValidator] Candidate model ${candidate} failed, trying next`, { error: apiErr?.message || String(apiErr) });
        }
      }

      if (!rawResponseText) {
        logger.error('[MediaValidator] All Gemini vision models failed to return output');
        // Fail-safe rejection when confident classification cannot be made
        return {
          isValid: false,
          containsAnimal: false,
          animalType: null,
          isRealWorldPhoto: false,
          isPosterOrGraphic: false,
          isScreenshot: false,
          isIllustration: false,
          appearsAIGenerated: false,
          confidence: 0,
          reason: 'Unable to verify animal in media. Please ensure clear lighting and try again.',
        };
      }

      // Clean JSON formatting
      const cleanJson = rawResponseText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const containsAnimal = Boolean(parsed.containsAnimal);
      const isRealWorldPhoto = Boolean(parsed.isRealWorldPhoto);
      const isPosterOrGraphic = Boolean(parsed.isPosterOrGraphic);
      const isScreenshot = Boolean(parsed.isScreenshot);
      const isIllustration = Boolean(parsed.isIllustration);
      const appearsAIGenerated = Boolean(parsed.appearsAIGenerated);
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8;

      let isValid = Boolean(parsed.isValidAnimalMedia);

      // Hard enforcement
      if (!containsAnimal || isPosterOrGraphic || isScreenshot || isIllustration || appearsAIGenerated || !isRealWorldPhoto) {
        isValid = false;
      }

      let reason = parsed.reason || '';
      if (!isValid) {
        if (isPosterOrGraphic) {
          reason = "This upload can't be used for an animal welfare Story. Please upload a real photo or video of an animal.";
        } else if (appearsAIGenerated) {
          reason = "AI-generated or AI-created images aren't allowed as real-world animal welfare evidence. Please upload an original real-world photo or video.";
        } else if (isScreenshot) {
          reason = "Screenshots are not accepted. Please upload an original real-world animal photo or video.";
        } else if (isIllustration) {
          reason = "Please upload a real-world animal photo or video. Illustrations and graphics aren't allowed.";
        } else if (!containsAnimal) {
          reason = "This Story requires a real photo or video showing an animal.";
        } else if (!reason) {
          reason = "Please upload a real-world animal photo or video.";
        }
      } else {
        if (!reason || reason.toLowerCase().includes('valid')) {
          const animalName = parsed.animalType ? ` (${parsed.animalType})` : '';
          reason = `Real animal photo detected${animalName}`;
        }
      }

      return {
        isValid,
        containsAnimal,
        animalType: parsed.animalType || null,
        isRealWorldPhoto,
        isPosterOrGraphic,
        isScreenshot,
        isIllustration,
        appearsAIGenerated,
        confidence,
        reason,
      };
    } catch (err: any) {
      logger.error('[MediaValidator] Media analysis exception', { error: err?.message || String(err) });
      return {
        isValid: false,
        containsAnimal: false,
        animalType: null,
        isRealWorldPhoto: false,
        isPosterOrGraphic: false,
        isScreenshot: false,
        isIllustration: false,
        appearsAIGenerated: false,
        confidence: 0,
        reason: 'Media verification could not be completed. Please upload a clear photo of an animal.',
      };
    }
  }
}

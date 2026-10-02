'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Volume2,
} from 'lucide-react';

interface ExtractedVoiceData {
  animalType: string;
  emergencyType: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  locationLandmark: string;
  transcript: string;
}

interface VoiceSOSRecorderProps {
  onDataExtracted: (data: ExtractedVoiceData) => void;
}

export default function VoiceSOSRecorder({ onDataExtracted }: VoiceSOSRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [extractedData, setExtractedData] = useState<ExtractedVoiceData | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  const parseVoiceText = (text: string): ExtractedVoiceData => {
    const lower = text.toLowerCase();

    // 1. Detect Animal
    let animalType = 'Street Dog (Indie)';
    if (lower.includes('puppy') || lower.includes('puppies')) animalType = 'Puppy / Puppies';
    else if (lower.includes('cat') || lower.includes('kitten')) animalType = 'Cat / Kitten';
    else if (lower.includes('bird') || lower.includes('pigeon') || lower.includes('crow')) animalType = 'Bird (Pigeon / Avian)';
    else if (lower.includes('cow') || lower.includes('calf') || lower.includes('cattle')) animalType = 'Cattle / Cow';
    else if (lower.includes('dog') || lower.includes('indie') || lower.includes('canine')) animalType = 'Street Dog (Indie)';

    // 2. Detect Emergency Type
    let emergencyType = 'INJURED_ANIMAL';
    if (lower.includes('hit by') || lower.includes('accident') || lower.includes('car') || lower.includes('bike')) {
      emergencyType = 'ACCIDENT';
    } else if (lower.includes('trap') || lower.includes('drain') || lower.includes('stuck')) {
      emergencyType = 'TRAPPED';
    } else if (lower.includes('abandon') || lower.includes('dumped')) {
      emergencyType = 'ABANDONED';
    } else if (lower.includes('cruelty') || lower.includes('beaten') || lower.includes('hit')) {
      emergencyType = 'CRUELTY';
    }

    // 3. Detect Urgency
    let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    if (
      lower.includes('bleed') ||
      lower.includes('blood') ||
      lower.includes('unconscious') ||
      lower.includes('urgent') ||
      lower.includes('critical') ||
      lower.includes('dying') ||
      lower.includes('fracture')
    ) {
      urgency = 'CRITICAL';
    } else if (lower.includes('minor') || lower.includes('scratch') || lower.includes('skin')) {
      urgency = 'MEDIUM';
    }

    // 4. Extract Location Landmark keywords
    let locationLandmark = '';
    const landmarkKeywords = ['near', 'at', 'opposite', 'behind', 'beside', 'close to', 'in front of'];
    for (const kw of landmarkKeywords) {
      const idx = lower.indexOf(kw);
      if (idx !== -1) {
        locationLandmark = text.slice(idx + kw.length).trim().split('.')[0].slice(0, 80);
        break;
      }
    }

    return {
      animalType,
      emergencyType,
      urgency,
      locationLandmark: locationLandmark || 'Near incident landmark',
      transcript: text,
    };
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type the details directly.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setExtractedData(null);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setTranscript(text);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Could not start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);

    if (transcript.trim()) {
      const parsed = parseVoiceText(transcript.trim());
      setExtractedData(parsed);
    }
  };

  const handleApplyExtractedData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      setExtractedData(null);
      setTranscript('');
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div
      style={{
        padding: '14px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: isListening ? '#DC2626' : 'var(--brand-sos)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isListening ? 'pulse 1.5s infinite' : 'none',
            }}
          >
            <Mic size={16} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Voice-to-SOS Fast Reporting
            </span>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
              Speak the emergency description to auto-fill incident fields.
            </p>
          </div>
        </div>

        {isListening ? (
          <button
            type="button"
            onClick={stopListening}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: '#DC2626',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <MicOff size={14} /> Stop Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={startListening}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--brand-sos)',
              background: 'transparent',
              color: 'var(--brand-sos)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Mic size={14} /> Start Voice
          </button>
        )}
      </div>

      {isListening && (
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(220, 38, 38, 0.08)',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#B91C1C',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Loader2 size={16} className="spin" />
          <span>{transcript || 'Listening... e.g. "Injured indie dog bleeding near Indiranagar park gate"'}</span>
        </div>
      )}

      {/* Pre-Submission Structured Confirmation Preview */}
      {extractedData && (
        <div
          style={{
            marginTop: '10px',
            padding: '12px',
            background: 'var(--bg-card)',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '8px' }}>
            <Sparkles size={14} /> Extracted Voice Information (Review Before Applying):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '10px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Animal:</span> <strong>{extractedData.animalType}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Urgency:</span> <strong>{extractedData.urgency}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Emergency:</span> <strong>{extractedData.emergencyType}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Landmark:</span> <strong>{extractedData.locationLandmark}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setExtractedData(null)}
              style={{ padding: '4px 10px', fontSize: '11.5px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer' }}
            >
              Discard
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleApplyExtractedData}
              style={{ padding: '4px 12px', fontSize: '11.5px', background: 'var(--brand-sos)', borderColor: 'var(--brand-sos)' }}
            >
              ✓ Apply to Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

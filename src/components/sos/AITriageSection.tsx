'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AiTriageResult } from '@/lib/services/ai-triage';

interface AITriageSectionProps {
  animalType?: string;
  description?: string;
  imageUrl?: string;
  initialTriage?: AiTriageResult | null;
  onTriageCompleted?: (triage: AiTriageResult) => void;
}

export default function AITriageSection({
  animalType = 'Community Animal',
  description = '',
  imageUrl,
  initialTriage = null,
  onTriageCompleted,
}: AITriageSectionProps) {
  const [triage, setTriage] = useState<AiTriageResult | null>(initialTriage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const runTriage = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animalType,
          description,
          imageUrl,
        }),
      });

      const data = await res.json();
      if (data.success && data.triage) {
        setTriage(data.triage);
        if (onTriageCompleted) onTriageCompleted(data.triage);
      } else {
        setError(data.error || 'Unable to perform visual injury assessment.');
      }
    } catch {
      setError('Network error while requesting AI triage.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        overflow: 'hidden',
        marginBottom: '16px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
              AI Emergency Injury Triage & First-Aid Advisor
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Automated visual distress scoring & on-site safety protocol
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!triage && (
            <button
              type="button"
              className="btn-primary"
              onClick={runTriage}
              disabled={isLoading}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                background: '#2563EB',
                borderColor: '#2563EB',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Analyze Case</span>
                </>
              )}
            </button>
          )}

          {triage && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#B91C1C', fontSize: '12.5px' }}>
          {error}
        </div>
      )}

      {/* Triage Results Body */}
      {triage && isExpanded && (
        <div style={{ padding: '16px' }}>
          {/* Urgency Badge & Summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Suggested Urgency:</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  background:
                    triage.urgency === 'CRITICAL'
                      ? 'rgba(220, 38, 38, 0.12)'
                      : triage.urgency === 'HIGH'
                      ? 'rgba(234, 88, 12, 0.12)'
                      : 'rgba(245, 158, 11, 0.12)',
                  color:
                    triage.urgency === 'CRITICAL'
                      ? '#DC2626'
                      : triage.urgency === 'HIGH'
                      ? '#EA580C'
                      : '#D97706',
                  textTransform: 'uppercase',
                }}
              >
                🚨 {triage.urgency}
              </span>
            </div>

            <button
              type="button"
              onClick={runTriage}
              disabled={isLoading}
              style={{ fontSize: '11px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Re-analyze
            </button>
          </div>

          <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '14px', lineHeight: 1.5 }}>
            {triage.suggestedFirstAid}
          </p>

          {/* Visible Indicators & Actions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            {/* Immediate Actions */}
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
              <strong style={{ fontSize: '12.5px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <CheckCircle2 size={14} color="#059669" /> Immediate First Aid Do&apos;s:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#047857', lineHeight: 1.4 }}>
                {triage.immediateActions.map((act, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>{act}</li>
                ))}
              </ul>
            </div>

            {/* Critical Warnings */}
            <div style={{ padding: '12px', background: 'rgba(220, 38, 38, 0.05)', borderRadius: '10px', border: '1px solid #FECACA' }}>
              <strong style={{ fontSize: '12.5px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <AlertCircle size={14} color="#DC2626" /> Critical Warnings (NEVER DO):
              </strong>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#B91C1C', lineHeight: 1.4 }}>
                {triage.criticalWarnings.map((warn, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>{warn}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mandatory Medical Disclaimer */}
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Info size={14} style={{ flexShrink: 0 }} />
            <span>{triage.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import FeederLogo from '@/components/common/FeederLogo';
import { RefreshCw, Home } from 'lucide-react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring if applicable
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-app)',
        textAlign: 'center',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '40px 24px',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: '16px',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <FeederLogo variant="responsive" height={40} />
        </div>
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>🛡️</div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          An unexpected issue occurred while loading this page. You can try refreshing the view or return to the main feed.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Try Again
          </button>
          <Link
            href="/"
            className="btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px' }}
          >
            <Home size={16} /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

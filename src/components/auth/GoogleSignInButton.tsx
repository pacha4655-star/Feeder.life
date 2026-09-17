'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  onError?: (msg: string) => void;
  onSuccess?: () => void;
  className?: string;
  style?: React.CSSProperties;
  buttonText?: string;
}

/**
 * Real Firebase Authentication Google OAuth button.
 * Triggers signInWithPopup(), extracts ID token, and verifies it with /api/auth/sync.
 */
export default function GoogleSignInButton({
  onError,
  onSuccess,
  className = '',
  style,
  buttonText = 'Continue with Google',
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    onError?.('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // 1. Trigger real Google OAuth popup via Firebase
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken(true);

      // 2. Send verified ID token to backend for cryptographic verification & user sync
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to sign in with Google. Please try again.');
      }

      onSuccess?.();

      // 3. Redirect first-time users to onboarding, and existing users to home
      const destination = data.redirectTo || (data.isNewUser ? '/onboarding' : '/');
      router.push(destination);
      router.refresh();
    } catch (err: any) {
      console.error('[Google Auth Diagnostic Error]:', {
        code: err.code,
        message: err.message,
        name: err.name,
      });

      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request' ||
        err.message?.includes('closed-by-user')
      ) {
        onError?.('Sign-in cancelled. Please select your Google account to proceed.');
      } else if (err.code === 'auth/popup-blocked') {
        onError?.('Pop-up was blocked by your browser. Please allow pop-ups for this site.');
      } else if (err.code === 'auth/unauthorized-domain') {
        onError?.(err.message || 'This domain is not authorized in Firebase Authentication Console.');
      } else if (err.code === 'auth/operation-not-allowed') {
        onError?.('Google Sign-In provider is disabled in Firebase Console.');
      } else if (err.code === 'auth/network-request-failed') {
        onError?.('Network connection failed. Please check your internet connection and try again.');
      } else if (err.message && !err.message.includes('object Object')) {
        onError?.(err.message);
      } else {
        onError?.('Unable to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={isLoading}
      className={`btn-google ${className}`.trim()}
      aria-label={buttonText}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        backgroundColor: 'var(--bg-card, #ffffff)',
        color: 'var(--text-main, #1e293b)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: 'var(--radius-md, 8px)',
        fontWeight: 600,
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.75 : 1,
        transition: 'all 0.15s ease-in-out',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        userSelect: 'none',
        ...style,
      }}
    >
      {isLoading ? (
        <>
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand-primary, #459138)' }} />
          <span>Signing in...</span>
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }} aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
}

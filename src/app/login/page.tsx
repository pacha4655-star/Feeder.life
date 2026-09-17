'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import FeederLogo from '@/components/common/FeederLogo';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { Lock, Mail, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter your email/username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let targetEmail = identifier.trim();

      // If user provided a username instead of an email, resolve to their email address
      if (!targetEmail.includes('@')) {
        const lookupRes = await fetch(`/api/auth/lookup?username=${encodeURIComponent(targetEmail)}`);
        const lookupData = await lookupRes.json();
        if (!lookupRes.ok || !lookupData.success || !lookupData.email) {
          throw new Error(lookupData.error || 'No account found with this username');
        }
        targetEmail = lookupData.email;
      }

      // 1. Authenticate with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      
      // 2. Obtain verified Firebase ID token
      const idToken = await userCredential.user.getIdToken(true);

      // 3. Synchronize user profile into Supabase & issue secure session cookie
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to sign in. Please try again.');
      }

      router.push(data.redirectTo || (data.isNewUser ? '/onboarding' : '/'));
      router.refresh();
    } catch (err: any) {
      console.error('[Firebase Login Error]:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('Invalid email/username or password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/user-disabled') {
        setError('This account has been disabled.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (err.message && !err.message.includes('object Object')) {
        setError(err.message);
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <Link href="/" className="auth-logo-link" title="Feeder Home">
            <FeederLogo variant="full" height={36} className="auth-logo-img" />
          </Link>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">
            Sign in to your animal welfare guardian account
          </p>
        </div>

        {error && (
          <div className="auth-error-box">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Google Authentication */}
        <GoogleSignInButton onError={(msg) => setError(msg)} className="auth-google-btn" />

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or sign in with email</span>
          <div className="auth-divider-line" />
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-field">
            <label className="auth-form-label">Email or Username</label>
            <input
              type="text"
              className="auth-form-input"
              placeholder="Enter email or @username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-field">
            <label className="auth-form-label">Password</label>
            <input
              type="password"
              className="auth-form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link href="/signup">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

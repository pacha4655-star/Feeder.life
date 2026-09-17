'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import FeederLogo from '@/components/common/FeederLogo';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !username || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // 2. Set Firebase Auth display name
      try {
        await updateProfile(userCredential.user, { displayName: fullName.trim() });
      } catch (profileErr) {
        console.warn('[Signup] Firebase updateProfile notice:', profileErr);
      }

      // 3. Obtain verified Firebase ID token
      const idToken = await userCredential.user.getIdToken(true);

      // 4. Synchronize user profile into Supabase PostgreSQL (zero passwords in Supabase)
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          username: username.trim(),
          fullName: fullName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete registration');
      }

      router.push(data.redirectTo || '/onboarding');
      router.refresh();
    } catch (err: any) {
      console.error('[Firebase Signup Error]:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/password authentication is not enabled in Firebase Console.');
      } else if (err.message && !err.message.includes('object Object')) {
        setError(err.message);
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <Link href="/" className="auth-logo-link" title="Feeder Home">
            <FeederLogo variant="full" height={36} className="auth-logo-img" />
          </Link>
          <h1 className="auth-title">Join the Animal Welfare Platform</h1>
          <p className="auth-subtitle">
            Connect with local feeders, report emergency SOS cases, and log community feeds.
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
          <span className="auth-divider-text">or sign up with email</span>
          <div className="auth-divider-line" />
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-field">
            <label className="auth-form-label">Full Name</label>
            <input
              type="text"
              className="auth-form-input"
              placeholder="e.g. Maya Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-field">
            <label className="auth-form-label">Email Address</label>
            <input
              type="email"
              className="auth-form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-field">
            <label className="auth-form-label">Username</label>
            <input
              type="text"
              className="auth-form-input"
              placeholder="e.g. mayavet"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="auth-form-field">
            <label className="auth-form-label">Password (min 8 chars)</label>
            <input
              type="password"
              className="auth-form-input"
              placeholder="Create strong password"
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
            {isLoading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link href="/login">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

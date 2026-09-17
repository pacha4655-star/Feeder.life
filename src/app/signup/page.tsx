'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import FeederLogo from '@/components/common/FeederLogo';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Heart,
  Shield,
  Utensils,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !username.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
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

      // 4. Synchronize user profile into Supabase PostgreSQL
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
          fullName: fullName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete registration. Please try again.');
      }

      router.push(data.redirectTo || '/onboarding');
      router.refresh();
    } catch (err: any) {
      console.error('[Firebase Signup Error]:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Unable to connect. Please check your internet connection.');
      } else if (err.message && !err.message.includes('object Object')) {
        setError(err.message);
      } else {
        setError('Unable to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="feeder-split-auth-page">
      <div className="feeder-split-auth-container">
        
        {/* ============================================================
            LEFT SECTION: Feeder Animal Welfare Branding & Real Visual
            ============================================================ */}
        <div className="feeder-auth-split-left">
          <div className="feeder-brand-header">
            <Link href="/" className="feeder-brand-logo-link" title="Feeder.life">
              <FeederLogo variant="full" height={44} className="feeder-brand-logo" />
            </Link>
          </div>

          <h1 className="feeder-split-headline">
            Connect. Care. Protect.
          </h1>
          <p className="feeder-split-subtext">
            Join a global community working together for animal welfare, feeding, rescue and compassionate care.
          </p>

          {/* Real Animal Photography Hero Card */}
          <div className="feeder-auth-visual-card">
            <div className="feeder-visual-img-wrap">
              <img
                src="/images/feeder-dogs-welfare.jpg"
                alt="Community dogs being fed and protected"
                className="feeder-auth-hero-img"
              />
              <div className="feeder-visual-overlay-pill">
                <Heart size={14} className="text-emerald-500 fill-emerald-500" />
                <span>Join 5,000+ compassionate animal caretakers</span>
              </div>
            </div>

            {/* Welfare Trust Badges */}
            <div className="feeder-visual-badges">
              <div className="feeder-visual-badge">
                <Utensils size={14} className="badge-icon-feeding" />
                <span>Daily Feeding Rounds</span>
              </div>
              <div className="feeder-visual-badge">
                <Shield size={14} className="badge-icon-rescue" />
                <span>Emergency SOS Network</span>
              </div>
              <div className="feeder-visual-badge">
                <Heart size={14} className="badge-icon-guardians" />
                <span>Verified Animal Guardians</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            RIGHT SECTION: Feeder Signup Panel
            ============================================================ */}
        <div className="feeder-auth-split-right">
          <div className="feeder-auth-card">
            
            {/* Header / Logo */}
            <div className="feeder-auth-card-header">
              <div className="feeder-card-logo-wrap">
                <FeederLogo variant="full" height={38} />
              </div>
              <h2 className="feeder-card-title">Create an Account</h2>
              <p className="feeder-card-subtitle">Join the animal welfare movement today</p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="feeder-auth-alert-error" role="alert">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Authentication */}
            <GoogleSignInButton
              onError={(msg) => setError(msg)}
              className="feeder-google-btn-custom"
            />

            {/* Divider */}
            <div className="feeder-auth-divider">
              <div className="feeder-divider-line" />
              <span className="feeder-divider-label">or sign up with email</span>
              <div className="feeder-divider-line" />
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="feeder-auth-form" noValidate>
              <div className="feeder-form-field">
                <label className="feeder-form-label" htmlFor="signup-fullname">
                  Full Name
                </label>
                <div className="feeder-input-wrap">
                  <User size={16} className="feeder-input-icon" />
                  <input
                    id="signup-fullname"
                    type="text"
                    className="feeder-form-input"
                    placeholder="e.g. Maya Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              <div className="feeder-form-field">
                <label className="feeder-form-label" htmlFor="signup-email">
                  Email Address
                </label>
                <div className="feeder-input-wrap">
                  <Mail size={16} className="feeder-input-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    className="feeder-form-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="feeder-form-field">
                <label className="feeder-form-label" htmlFor="signup-username">
                  Username
                </label>
                <div className="feeder-input-wrap">
                  <span className="feeder-input-prefix">@</span>
                  <input
                    id="signup-username"
                    type="text"
                    className="feeder-form-input feeder-prefixed-input"
                    placeholder="guardian_maya"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="feeder-form-field">
                <label className="feeder-form-label" htmlFor="signup-password">
                  Password (min. 6 characters)
                </label>
                <div className="feeder-input-wrap">
                  <Lock size={16} className="feeder-input-icon" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    className="feeder-form-input feeder-password-input"
                    placeholder="Create strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="feeder-eye-toggle-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="feeder-auth-primary-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Divider & Login CTA */}
            <div className="feeder-auth-card-footer">
              <div className="feeder-footer-divider" />
              <div className="feeder-signup-cta-wrap">
                <span className="feeder-signup-hint">Already have an account?</span>
                <Link href="/login" className="feeder-create-account-btn">
                  Log in to Feeder
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

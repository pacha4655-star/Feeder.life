'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import FeederLogo from '@/components/common/FeederLogo';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Heart,
  Shield,
  Utensils,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your email/username and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let targetEmail = identifier.trim();

      // If user provided a username instead of an email, resolve safely to their associated email
      if (!targetEmail.includes('@')) {
        const lookupRes = await fetch(`/api/auth/lookup?username=${encodeURIComponent(targetEmail)}`);
        const lookupData = await lookupRes.json();
        if (!lookupRes.ok || !lookupData.success || !lookupData.email) {
          throw new Error(lookupData.error || 'No Feeder account found with this username.');
        }
        targetEmail = lookupData.email;
      }

      // 1. Authenticate with real Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);

      // 2. Obtain cryptographically verified Firebase ID token
      const idToken = await userCredential.user.getIdToken(true);

      // 3. Synchronize user profile into Supabase & issue secure session cookie
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Your account was authenticated, but we couldn't finish signing you in. Please try again."
        );
      }

      // 4. Redirect to authenticated application
      router.push(data.redirectTo || (data.isNewUser ? '/onboarding' : '/'));
      router.refresh();
    } catch (err: any) {
      console.error('[Firebase Login Error]:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('Incorrect email/username or password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/user-disabled') {
        setError('This account has been deactivated. Please contact support.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Unable to connect. Please check your internet connection and try again.');
      } else if (err.message && !err.message.includes('object Object')) {
        setError(err.message);
      } else {
        setError('Incorrect email/username or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your registered email address.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess(false);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess(true);
    } catch (err: any) {
      console.error('[Password Reset Error]:', err);
      if (err.code === 'auth/user-not-found') {
        // For security reasons, don't confirm or deny existence, but accept or show friendly message
        setResetSuccess(true);
      } else if (err.code === 'auth/invalid-email') {
        setResetError('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setResetError('Too many password reset requests. Please wait a few moments.');
      } else {
        setResetError('Unable to send password reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
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
                <span>Over 10,000+ daily street feeds logged & protected</span>
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
            RIGHT SECTION: Feeder Authentication Panel
            ============================================================ */}
        <div className="feeder-auth-split-right">
          <div className="feeder-auth-card">
            
            {/* Header / Logo */}
            <div className="feeder-auth-card-header">
              <div className="feeder-card-logo-wrap">
                <FeederLogo variant="full" height={38} />
              </div>
              <h2 className="feeder-card-title">Welcome Back</h2>
              <p className="feeder-card-subtitle">Log in to your Feeder account</p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="feeder-auth-alert-error" role="alert">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Login Form */}
            <form onSubmit={handleSubmit} className="feeder-auth-form" noValidate>
              <div className="feeder-form-field">
                <label className="feeder-form-label" htmlFor="feeder-identifier">
                  Email or Username
                </label>
                <div className="feeder-input-wrap">
                  <Mail size={16} className="feeder-input-icon" />
                  <input
                    id="feeder-identifier"
                    type="text"
                    className="feeder-form-input"
                    placeholder="Enter email or @username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    required
                  />
                </div>
              </div>

              <div className="feeder-form-field">
                <div className="feeder-label-row">
                  <label className="feeder-form-label" htmlFor="feeder-password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(identifier.includes('@') ? identifier : '');
                      setResetError('');
                      setResetSuccess(false);
                      setShowForgotModal(true);
                    }}
                    className="feeder-forgot-link-btn"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="feeder-input-wrap">
                  <Lock size={16} className="feeder-input-icon" />
                  <input
                    id="feeder-password"
                    type={showPassword ? 'text' : 'password'}
                    className="feeder-form-input feeder-password-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Log In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="feeder-auth-divider">
              <div className="feeder-divider-line" />
              <span className="feeder-divider-label">or</span>
              <div className="feeder-divider-line" />
            </div>

            {/* Google Authentication */}
            <GoogleSignInButton
              onError={(msg) => setError(msg)}
              className="feeder-google-btn-custom"
            />

            {/* Bottom Divider & Create Account CTA */}
            <div className="feeder-auth-card-footer">
              <div className="feeder-footer-divider" />
              <div className="feeder-signup-cta-wrap">
                <span className="feeder-signup-hint">Don&apos;t have an account?</span>
                <Link href="/signup" className="feeder-create-account-btn">
                  Create new account
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ============================================================
          FORGOT PASSWORD MODAL DIALOG
          ============================================================ */}
      {showForgotModal && (
        <div className="feeder-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div
            className="feeder-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="feeder-modal-close-btn"
              onClick={() => setShowForgotModal(false)}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className="feeder-modal-header">
              <div className="feeder-modal-icon-wrap">
                <Lock size={22} />
              </div>
              <h3 className="feeder-modal-title">Reset Password</h3>
              <p className="feeder-modal-desc">
                Enter your registered email address and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            {resetSuccess ? (
              <div className="feeder-reset-success-box">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">Password Reset Email Sent</p>
                  <p className="text-xs text-emerald-800 mt-1">
                    If an account exists for <strong>{resetEmail}</strong>, you will receive an email with instructions shortly. Please check your inbox and spam folder.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="feeder-auth-primary-btn mt-4 w-full"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="feeder-modal-form">
                {resetError && (
                  <div className="feeder-auth-alert-error mb-3">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div className="feeder-form-field">
                  <label className="feeder-form-label" htmlFor="reset-email">
                    Account Email Address
                  </label>
                  <div className="feeder-input-wrap">
                    <Mail size={16} className="feeder-input-icon" />
                    <input
                      id="reset-email"
                      type="email"
                      className="feeder-form-input"
                      placeholder="name@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="feeder-modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="feeder-modal-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="feeder-auth-primary-btn"
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Globe,
  ChevronDown,
  Loader2,
  X,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // View mode: 'profile' (Reference style quick account card) or 'credentials' (Direct email/password form)
  const [viewMode, setViewMode] = useState<'profile' | 'credentials'>('profile');
  const [rememberedUser, setRememberedUser] = useState<{
    name: string;
    email: string;
    avatarUrl: string;
  } | null>(null);

  // Language selector state
  const [currentLang, setCurrentLang] = useState('English');
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Load last active user or default profile from storage if available
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('feeder_last_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && parsed.name) {
          setRememberedUser(parsed);
          setIdentifier(parsed.email || parsed.username || '');
          return;
        }
      }
    } catch {}

    // Default reference profile representation
    setRememberedUser({
      name: 'Pachamuthu S',
      email: '',
      avatarUrl: '/images/feeder-default-avatar.jpg',
    });
  }, []);

  const handleLogin = async (targetId: string, targetPass: string) => {
    if (!targetId.trim() || !targetPass) {
      setError('Please enter your email/username and password.');
      setViewMode('credentials');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let targetEmail = targetId.trim();

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
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, targetPass);

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

      // Save for quick profile continuation next time
      try {
        if (data.user) {
          localStorage.setItem(
            'feeder_last_user',
            JSON.stringify({
              name: data.user.displayName || data.user.username || 'Feeder Guardian',
              email: data.user.email,
              avatarUrl: data.user.avatarUrl || '/images/feeder-default-avatar.jpg',
            })
          );
        }
      } catch {}

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
      setViewMode('credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueClick = () => {
    if (rememberedUser?.email && password) {
      handleLogin(rememberedUser.email, password);
    } else {
      // Prompt for password / credentials smoothly
      setViewMode('credentials');
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
    <div className="feeder-exact-login-page">
      <div className="feeder-exact-split-layout">
        
        {/* ============================================================
            LEFT SECTION (≈ 60%): Exact Visual Composition
            ============================================================ */}
        <section className="feeder-exact-left-panel" aria-label="Feeder platform overview">
          <div className="feeder-exact-composition-wrapper">
            <img
              src="/images/feeder-login-left-composition.png"
              alt="Feeder. Explore the things you love. Animals Bring People Together, Care Feed Rescue Repeat."
              className="feeder-exact-left-hero-image"
              loading="eager"
            />
          </div>
        </section>

        {/* ============================================================
            VERTICAL DIVIDER
            ============================================================ */}
        <div className="feeder-exact-vertical-divider" aria-hidden="true" />

        {/* ============================================================
            RIGHT SECTION (≈ 40%): Login / Profile Authentication Panel
            ============================================================ */}
        <section className="feeder-exact-right-panel" aria-label="Account login">
          
          {/* Top Right Language Selector */}
          <div className="feeder-exact-top-bar">
            <div className="feeder-language-selector-wrap">
              <button
                type="button"
                className="feeder-language-btn"
                onClick={() => setShowLangMenu(!showLangMenu)}
                aria-expanded={showLangMenu}
                aria-label="Select language"
              >
                <Globe size={15} className="feeder-globe-icon" />
                <span>{currentLang}</span>
                <ChevronDown size={14} className="feeder-chevron-icon" />
              </button>

              {showLangMenu && (
                <div className="feeder-language-dropdown">
                  {['English', 'Español', 'Français', 'Deutsch', 'हिन्दी', 'Tamil'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={`feeder-language-option ${currentLang === lang ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentLang(lang);
                        setShowLangMenu(false);
                      }}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Centered Login Content */}
          <div className="feeder-exact-auth-container">
            
            {/* Error Message */}
            {error && (
              <div className="feeder-exact-alert-error" role="alert">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Profile Avatar Mode (Exact Reference Match) */}
            {viewMode === 'profile' ? (
              <div className="feeder-exact-profile-card">
                <div className="feeder-avatar-circle-wrap">
                  <img
                    src={rememberedUser?.avatarUrl || '/images/feeder-default-avatar.jpg'}
                    alt={rememberedUser?.name || 'User avatar'}
                    className="feeder-exact-user-avatar"
                  />
                </div>

                <h2 className="feeder-exact-user-name">
                  {rememberedUser?.name || 'Feeder Guardian'}
                </h2>

                {/* Primary Button: Continue */}
                <button
                  type="button"
                  onClick={handleContinueClick}
                  className="feeder-exact-btn-continue"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </button>

                {/* Secondary Button: Use another profile */}
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setViewMode('credentials');
                  }}
                  className="feeder-exact-btn-secondary"
                >
                  Use another profile
                </button>
              </div>
            ) : (
              /* Direct Credentials Form Mode */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin(identifier, password);
                }}
                className="feeder-exact-credentials-form"
                noValidate
              >
                <div className="feeder-credentials-header">
                  <h2 className="feeder-credentials-title">Sign in to Feeder</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setViewMode('profile');
                    }}
                    className="feeder-back-profile-btn"
                  >
                    Switch to saved profile
                  </button>
                </div>

                <div className="feeder-exact-form-group">
                  <label className="feeder-exact-label" htmlFor="feeder-login-identifier">
                    Email or Username
                  </label>
                  <div className="feeder-exact-input-wrap">
                    <Mail size={16} className="feeder-exact-input-icon" />
                    <input
                      id="feeder-login-identifier"
                      type="text"
                      className="feeder-exact-input"
                      placeholder="Enter email or @username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="feeder-exact-form-group">
                  <div className="feeder-exact-label-row">
                    <label className="feeder-exact-label" htmlFor="feeder-login-password">
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
                      className="feeder-exact-forgot-btn"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="feeder-exact-input-wrap">
                    <Lock size={16} className="feeder-exact-input-icon" />
                    <input
                      id="feeder-login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="feeder-exact-input feeder-exact-password-input"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="feeder-exact-eye-btn"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="feeder-exact-btn-continue"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <span>Log In</span>
                  )}
                </button>
              </form>
            )}

            {/* Divider: ────── or ────── */}
            <div className="feeder-exact-divider">
              <div className="feeder-exact-divider-line" />
              <span className="feeder-exact-divider-text">or</span>
              <div className="feeder-exact-divider-line" />
            </div>

            {/* Google Login: Continue with Google */}
            <GoogleSignInButton
              onError={(msg) => setError(msg)}
              className="feeder-exact-google-btn"
            />

            {/* Create new account CTA: Outline Button */}
            <div className="feeder-exact-signup-wrap">
              <Link href="/signup" className="feeder-exact-btn-create-account">
                Create new account
              </Link>
            </div>
          </div>
        </section>

      </div>

      {/* ============================================================
          FORGOT PASSWORD MODAL
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
                    If an account exists for <strong>{resetEmail}</strong>, you will receive an email with instructions shortly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="feeder-exact-btn-continue mt-4 w-full"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="feeder-modal-form">
                {resetError && (
                  <div className="feeder-exact-alert-error mb-3">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div className="feeder-exact-form-group">
                  <label className="feeder-exact-label" htmlFor="exact-reset-email">
                    Account Email Address
                  </label>
                  <div className="feeder-exact-input-wrap">
                    <Mail size={16} className="feeder-exact-input-icon" />
                    <input
                      id="exact-reset-email"
                      type="email"
                      className="feeder-exact-input"
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
                    className="feeder-exact-btn-continue"
                    disabled={resetLoading}
                    style={{ height: '40px', fontSize: '13.5px' }}
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

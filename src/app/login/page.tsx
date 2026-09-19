'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import LanguageFooter from '@/components/common/LanguageFooter';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  X,
  PawPrint,
  Heart,
  Utensils,
  Scale,
  Leaf,
  Users,
  ArrowRight,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { locale, language, setLocale, dir, t } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Mobile state: toggle between direct options and email/password form
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Language selector state
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Forgot password modal state
  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resolvedEmailDisplay, setResolvedEmailDisplay] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Cooldown countdown for password reset resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setError(t('errors.missingCredentials'));
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
          throw new Error(lookupData.error || t('errors.invalidCredentials'));
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
    } catch (err: unknown) {
      console.error('[Firebase Login Error]:', err);
      const authError = err as { code?: string; message?: string };
      if (
        authError.code === 'auth/user-not-found' ||
        authError.code === 'auth/wrong-password' ||
        authError.code === 'auth/invalid-credential'
      ) {
        setError(t('errors.invalidCredentials'));
      } else if (authError.code === 'auth/invalid-email') {
        setError(t('errors.invalidEmail'));
      } else if (authError.code === 'auth/user-disabled') {
        setError(t('errors.userDisabled'));
      } else if (authError.code === 'auth/too-many-requests') {
        setError(t('errors.tooManyRequests'));
      } else if (authError.code === 'auth/network-request-failed') {
        setError(t('errors.networkError'));
      } else if (authError.message && !authError.message.includes('object Object')) {
        setError(authError.message);
      } else {
        setError(t('errors.invalidCredentials'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken(true);

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to sign in with Google. Please try again.');
      }

      router.push(data.redirectTo || (data.isNewUser ? '/onboarding' : '/'));
      router.refresh();
    } catch (err: unknown) {
      console.error('[Google Login Error]:', err);
      const authError = err as { code?: string; message?: string };
      if (
        authError.code === 'auth/popup-closed-by-user' ||
        authError.code === 'auth/cancelled-popup-request' ||
        authError.message?.includes('closed-by-user')
      ) {
        setError('Sign-in cancelled. Please select your Google account to proceed.');
      } else {
        setError(authError.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = resetEmail.trim();
    if (!cleanInput) {
      setResetError(t('errors.missingCredentials') || 'Please enter your email or username.');
      return;
    }

    setResetLoading(true);
    setResetError('');

    try {
      let targetEmail = cleanInput;

      // If user entered a username without @, securely look up their registered email address
      if (!targetEmail.includes('@')) {
        try {
          const lookupRes = await fetch(`/api/auth/lookup?username=${encodeURIComponent(targetEmail)}`);
          const lookupData = await lookupRes.json();
          if (lookupRes.ok && lookupData.success && lookupData.email) {
            targetEmail = lookupData.email;
          }
        } catch (lookupErr) {
          console.warn('[Password Reset] Username lookup notice:', lookupErr);
        }
      }

      // Call real Firebase sendPasswordResetEmail with canonical continue URL
      if (targetEmail.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
        await sendPasswordResetEmail(auth, targetEmail, {
          url: 'https://feeder.life/login',
          handleCodeInApp: false,
        });
      }

      setResolvedEmailDisplay(targetEmail.includes('@') ? targetEmail : cleanInput);
      setResetSuccess(true);
      setResendCooldown(30);
    } catch (err: unknown) {
      console.error('[Password Reset Error]:', err);
      const authError = err as { code?: string; message?: string };
      if (authError.code === 'auth/user-not-found') {
        // Privacy-preserving non-enumeration
        setResolvedEmailDisplay(cleanInput);
        setResetSuccess(true);
        setResendCooldown(30);
      } else if (authError.code === 'auth/invalid-email') {
        setResetError(t('errors.invalidEmail') || 'Please enter a valid email address.');
      } else if (authError.code === 'auth/too-many-requests') {
        setResetError(t('errors.tooManyRequests') || 'Too many reset attempts. Please wait a moment before trying again.');
      } else if (authError.code === 'auth/network-request-failed') {
        setResetError(t('errors.networkError') || 'Network error. Please check your internet connection.');
      } else {
        setResetError(t('errors.resetFailed') || 'Unable to send password reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="feeder-exact-login-page" dir={dir}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) and (max-height: 800px) {
          html, body {
            overflow: hidden !important;
            height: 100vh !important;
          }
          .feeder-exact-login-page {
            height: 100vh !important;
            height: 100dvh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .feeder-desktop-top-bar {
            padding: 2px 24px !important;
            height: 24px !important;
            min-height: 24px !important;
          }
          .feeder-language-btn {
            padding: 2px 8px !important;
            font-size: 11px !important;
          }
          .feeder-exact-split-layout {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            max-height: calc(100vh - 95px) !important;
          }
          .feeder-exact-left-hero-image {
            max-height: min(44vh, 320px) !important;
            width: auto !important;
            object-fit: contain !important;
          }
          .feeder-exact-left-panel {
            padding: 4px 16px !important;
          }
          .feeder-exact-right-panel {
            padding: 4px 24px !important;
          }
          .feeder-auth-welcome-header {
            margin-bottom: 4px !important;
          }
          .feeder-login-brand-icon-wrap {
            width: 28px !important;
            height: 28px !important;
            margin-bottom: 2px !important;
          }
          .feeder-login-paw-icon {
            width: 16px !important;
            height: 16px !important;
          }
          .feeder-auth-welcome-title {
            font-size: 16px !important;
            margin-bottom: 2px !important;
          }
          .feeder-auth-welcome-subtitle {
            font-size: 10.5px !important;
            margin-bottom: 4px !important;
          }
          .feeder-exact-divider-row {
            margin: 4px 0 !important;
          }
          .feeder-exact-form-group {
            margin-bottom: 4px !important;
          }
          .feeder-exact-label {
            font-size: 10.5px !important;
            margin-bottom: 2px !important;
          }
          .feeder-exact-input-wrap {
            height: 32px !important;
          }
          .feeder-exact-input {
            font-size: 11.5px !important;
          }
          .feeder-exact-google-btn {
            height: 32px !important;
            font-size: 11.5px !important;
            margin-bottom: 4px !important;
          }
          .feeder-exact-btn-continue {
            height: 32px !important;
            font-size: 12px !important;
          }
          .feeder-exact-btn-create-account {
            height: 28px !important;
            font-size: 11px !important;
          }
          .feeder-exact-forgot-bottom-link {
            font-size: 10.5px !important;
          }
          .feeder-global-lang-footer {
            padding: 4px 16px 6px 16px !important;
            margin-top: 0 !important;
            flex-shrink: 0 !important;
          }
          .feeder-footer-inner-container {
            gap: 2px !important;
          }
          .feeder-footer-lang-list {
            gap: 2px 8px !important;
          }
          .feeder-footer-lang-btn {
            font-size: 10px !important;
            line-height: 1.2 !important;
          }
          .feeder-footer-links-row {
            margin-top: 1px !important;
          }
          .feeder-footer-links-list {
            gap: 2px 8px !important;
          }
          .feeder-footer-nav-link {
            font-size: 9.5px !important;
            line-height: 1.2 !important;
          }
          .feeder-footer-copyright-row {
            margin-top: 1px !important;
            font-size: 9px !important;
            line-height: 1.2 !important;
          }
        }
      `}} />
      
      {/* ============================================================
          DESKTOP TOP RIGHT LANGUAGE SELECTOR (>= 769px)
          ============================================================ */}
      <header className="feeder-exact-top-bar feeder-desktop-top-bar" aria-label="Language selection">
        <div className="feeder-language-selector-wrap">
          <button
            type="button"
            className="feeder-language-btn"
            onClick={() => setShowLangMenu(!showLangMenu)}
            aria-expanded={showLangMenu}
            aria-label={t('login.selectLanguage')}
          >
            <span>{locale === 'en' ? 'English' : (language.nativeName || 'English')}</span>
            <ChevronDown size={13} className="feeder-chevron-icon" />
          </button>

          {showLangMenu && (
            <div className="feeder-language-dropdown">
              {SUPPORTED_LANGUAGES.slice(0, 10).map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`feeder-language-option ${locale === lang.code ? 'active' : ''}`}
                  onClick={() => {
                    setLocale(lang.code);
                    setShowLangMenu(false);
                  }}
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ============================================================
          1. MOBILE LOGIN EXPERIENCE (< 769px) - FULL RESPONSIVE COMPOSITION
          ============================================================ */}
      <div className="feeder-mobile-nature-container">
        {/* Animal Landscape Hero Section */}
        <div className="feeder-mobile-hero-wrap">
          <img
            src="/images/feeder-mobile-animals-hero.jpg"
            alt="Feeder - A kinder world for every animal"
            className="feeder-mobile-hero-img"
            loading="eager"
          />
        </div>

        {/* White Rounded Login Panel (Overlays the bottom of the animal hero) */}
        <div className="feeder-mobile-auth-panel">
          {/* Six Feature Icons Row */}
          <div className="feeder-mobile-features-row">
            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-wrap">
                <PawPrint size={18} />
              </div>
              <span className="feeder-mobile-feature-label">Find Help</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-wrap">
                <Heart size={18} />
              </div>
              <span className="feeder-mobile-feature-label">Adopt</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-wrap">
                <Utensils size={18} />
              </div>
              <span className="feeder-mobile-feature-label">Support Feeding</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-wrap">
                <Scale size={18} />
              </div>
              <span className="feeder-mobile-feature-label">Know Your Rights</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-wrap">
                <Leaf size={18} />
              </div>
              <span className="feeder-mobile-feature-label">Learn &amp; Explore</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-wrap">
                <Users size={18} />
              </div>
              <span className="feeder-mobile-feature-label">Join a Community</span>
            </div>
          </div>

          {/* Global Error Banner */}
          {error && !showEmailForm && (
            <div className="feeder-exact-alert-error my-2" role="alert">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="ml-auto text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Action Buttons / Inline Email Credentials Form */}
          {!showEmailForm ? (
            <div className="feeder-mobile-actions-stack">
              <button
                type="button"
                className="feeder-mobile-btn-email"
                onClick={() => {
                  setError('');
                  setShowEmailForm(true);
                }}
              >
                <Mail size={16} className="shrink-0" />
                <span>Continue with Email</span>
                <ArrowRight size={16} className="shrink-0 ml-auto" />
              </button>

              <button
                type="button"
                className="feeder-mobile-btn-google"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg className="feeder-mobile-svg-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                className="feeder-mobile-btn-apple"
                onClick={() => setError('Apple Sign-In is configured for iOS Safari / App. Please use Google or Email to continue.')}
              >
                <svg className="feeder-mobile-svg-icon fill-current text-black" width="18" height="18" viewBox="0 0 170 170" aria-hidden="true">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.71-11.65-14.01-6.1-9.47-10.9-19.8-14.41-30.98-3.51-11.19-5.27-21.75-5.27-31.69 0-14.79 3.82-26.79 11.45-36.02 7.63-9.23 17.06-13.91 28.3-14.04 4.8 0 10.05 1.25 15.77 3.75 5.72 2.5 9.53 3.81 11.43 3.93 1.48-.13 5.48-1.5 12.01-4.12 6.53-2.62 12.07-3.75 16.63-3.39 12.85.99 22.95 5.56 30.3 13.72-11.19 6.81-16.69 16.28-16.5 28.43.19 9.55 3.87 17.58 11.03 24.08 7.16 6.5 15.65 10.15 25.47 10.95-2.22 6.77-5.18 14.16-8.87 22.18zm-29.47-111.4c0 6.77-2.52 13.23-7.55 19.38-6.16 7.42-13.67 11.83-22.53 11.23-.13-.99-.19-1.98-.19-2.97 0-6.52 2.76-13.23 8.27-20.12 2.75-3.45 6.13-6.27 10.14-8.48 4.01-2.2 7.97-3.42 11.86-3.66.12 1.55.19 3.09.19 4.62z"/>
                </svg>
                <span>Continue with Apple</span>
              </button>

              <div className="feeder-exact-divider">
                <div className="feeder-exact-divider-line" />
                <span className="feeder-exact-divider-text">OR</span>
                <div className="feeder-exact-divider-line" />
              </div>

              <Link href="/signup" className="feeder-mobile-btn-create">
                Create an Account
              </Link>

              <div className="feeder-mobile-login-switch">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setShowEmailForm(true);
                  }}
                  className="feeder-mobile-login-link"
                >
                  Log In
                </button>
              </div>
            </div>
          ) : (
            /* Inline Email Login Form */
            <form onSubmit={handleLogin} className="feeder-exact-credentials-form mt-1" noValidate>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-[#0f4c16]">Log In with Email</span>
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="text-[12px] font-semibold text-[#1b5e20] hover:underline"
                >
                  ← Back to options
                </button>
              </div>

              {error && (
                <div className="feeder-exact-alert-error mb-2" role="alert">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="feeder-exact-form-group">
                <label className="feeder-exact-label" htmlFor="feeder-mobile-identifier">
                  {t('login.emailOrUsername')}
                </label>
                <div className="feeder-exact-input-wrap">
                  <Mail size={16} className="feeder-exact-input-icon" />
                  <input
                    id="feeder-mobile-identifier"
                    type="text"
                    className="feeder-exact-input"
                    placeholder={t('login.emailPlaceholder')}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="feeder-exact-form-group">
                <div className="feeder-exact-label-row">
                  <label className="feeder-exact-label" htmlFor="feeder-mobile-password">
                    {t('login.password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(identifier.trim());
                      setResetError('');
                      setResetSuccess(false);
                      setShowForgotModal(true);
                    }}
                    className="feeder-exact-forgot-btn"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>
                <div className="feeder-exact-input-wrap">
                  <Lock size={16} className="feeder-exact-input-icon" />
                  <input
                    id="feeder-mobile-password"
                    type={showPassword ? 'text' : 'password'}
                    className="feeder-exact-input feeder-exact-password-input"
                    placeholder={t('login.passwordPlaceholder')}
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
                    <span>{t('login.loggingIn')}</span>
                  </>
                ) : (
                  <span>{t('login.logIn')}</span>
                )}
              </button>
            </form>
          )}

          {/* Bottom Group: Pagination Dots & feeder.life Footer */}
          <div className="feeder-mobile-bottom-group">
            <div className="feeder-mobile-dots-row">
              <span className="feeder-mobile-dot active" />
              <span className="feeder-mobile-dot" />
              <span className="feeder-mobile-dot" />
            </div>

            <div className="feeder-mobile-footer-wrap">
              <div className="feeder-mobile-footer-brand">
                <Leaf size={14} className="feeder-mobile-footer-leaf" />
                <span>feeder.life</span>
              </div>
              <p className="feeder-mobile-footer-tagline">
                For animals. For people. For a better tomorrow.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          2. DESKTOP LOGIN EXPERIENCE (>= 769px) - FULL SPLIT LAYOUT
          ============================================================ */}
      <div className="feeder-exact-split-layout">
        
        {/* LEFT SECTION (≈ 58%): Visual Composition */}
        <section className="feeder-exact-left-panel" aria-label="Feeder platform overview">
          <div className="feeder-exact-composition-wrapper">
            <img
              src="/images/feeder-login-left-composition.png"
              alt="Feeder - A kinder world for every animal"
              className="feeder-exact-left-hero-image"
              loading="eager"
            />
          </div>
        </section>

        {/* VERTICAL DIVIDER */}
        <div className="feeder-exact-vertical-divider" aria-hidden="true" />

        {/* RIGHT SECTION (≈ 42%): Generic Feeder Authentication Panel */}
        <section className="feeder-exact-right-panel" aria-label="Account login">
          <div className="feeder-exact-auth-container">
            
            {/* Feeder Paw + Heart Icon & Welcome Header */}
            <div className="feeder-auth-welcome-header">
              <div className="feeder-login-brand-icon-wrap">
                <img
                  src="/images/feeder-icon.svg"
                  alt="Feeder Logo"
                  className="feeder-login-paw-icon"
                />
              </div>
              <h2 className="feeder-auth-welcome-title">
                {t('login.welcomeTitle')}
              </h2>
              <p className="feeder-auth-welcome-subtitle">
                {t('login.welcomeSubtitle')}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="feeder-exact-alert-error" role="alert">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Login: Continue with Google */}
            <GoogleSignInButton
              onError={(msg) => setError(msg)}
              className="feeder-exact-google-btn"
              buttonText={t('login.continueWithGoogle')}
            />

            {/* Divider: ────── or ────── */}
            <div className="feeder-exact-divider">
              <div className="feeder-exact-divider-line" />
              <span className="feeder-exact-divider-text">{t('login.or')}</span>
              <div className="feeder-exact-divider-line" />
            </div>

            {/* Direct Email & Password Credentials Form */}
            <form onSubmit={handleLogin} className="feeder-exact-credentials-form" noValidate>
              <div className="feeder-exact-form-group">
                <label className="feeder-exact-label" htmlFor="feeder-desktop-login-identifier">
                  {t('login.emailOrUsername')}
                </label>
                <div className="feeder-exact-input-wrap">
                  <Mail size={16} className="feeder-exact-input-icon" />
                  <input
                    id="feeder-desktop-login-identifier"
                    type="text"
                    className="feeder-exact-input"
                    placeholder={t('login.emailPlaceholder')}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="feeder-exact-form-group">
                <div className="feeder-exact-label-row">
                  <label className="feeder-exact-label" htmlFor="feeder-desktop-login-password">
                    {t('login.password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(identifier.trim());
                      setResetError('');
                      setResetSuccess(false);
                      setShowForgotModal(true);
                    }}
                    className="feeder-exact-forgot-btn"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>
                <div className="feeder-exact-input-wrap">
                  <Lock size={16} className="feeder-exact-input-icon" />
                  <input
                    id="feeder-desktop-login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="feeder-exact-input feeder-exact-password-input"
                    placeholder={t('login.passwordPlaceholder')}
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
                    <span>{t('login.loggingIn')}</span>
                  </>
                ) : (
                  <span>{t('login.logIn')}</span>
                )}
              </button>
            </form>

            {/* Create new account CTA */}
            <div className="feeder-exact-signup-wrap">
              <Link href="/signup" className="feeder-exact-btn-create-account">
                {t('login.createNewAccount')}
              </Link>
            </div>

            {/* Subtle Forgot Password link at bottom */}
            <div className="feeder-exact-forgot-bottom-wrap">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(identifier.trim());
                  setResetError('');
                  setResetSuccess(false);
                  setShowForgotModal(true);
                }}
                className="feeder-exact-forgot-bottom-link"
              >
                {t('login.forgotPassword')}
              </button>
            </div>

          </div>
        </section>

      </div>

      {/* Global Multilingual Footer (Desktop) */}
      <LanguageFooter />

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
              aria-label={t('modal.close')}
            >
              <X size={18} />
            </button>

            <div className="feeder-modal-header">
              <div className="feeder-modal-icon-wrap">
                <Lock size={22} />
              </div>
              <h3 className="feeder-modal-title">{t('forgotPassword.modalTitle')}</h3>
              <p className="feeder-modal-desc">
                {t('forgotPassword.modalDesc')}
              </p>
            </div>

            {resetSuccess ? (
              <div className="feeder-reset-success-box">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">{t('forgotPassword.successTitle')}</h4>
                    <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                      {t('forgotPassword.successDesc', { email: resolvedEmailDisplay || resetEmail })}
                    </p>
                    <p className="text-[11.5px] text-emerald-800/90 mt-2">
                      The link may take a few moments to arrive. Please check your <strong>Spam, Junk, or Promotions</strong> folder if you do not see it in your inbox.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-200/60 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handlePasswordReset()}
                    disabled={resetLoading || resendCooldown > 0}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center py-1"
                  >
                    {resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : "Didn't get the email? Resend link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="feeder-exact-btn-continue w-full"
                  >
                    {t('forgotPassword.backToSignIn')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="feeder-modal-form">
                {resetError && (
                  <div className="feeder-exact-alert-error mb-3" role="alert">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div className="feeder-exact-form-group">
                  <label className="feeder-exact-label" htmlFor="exact-reset-email">
                    {t('forgotPassword.emailLabel')}
                  </label>
                  <div className="feeder-exact-input-wrap">
                    <Mail size={16} className="feeder-exact-input-icon" />
                    <input
                      id="exact-reset-email"
                      type="text"
                      className="feeder-exact-input"
                      placeholder={t('forgotPassword.emailPlaceholder')}
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
                    {t('forgotPassword.cancel')}
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
                        <span>{t('forgotPassword.sending')}</span>
                      </>
                    ) : (
                      <span>{t('forgotPassword.sendLink')}</span>
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

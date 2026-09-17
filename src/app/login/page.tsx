'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
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
  Globe,
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
  ArrowLeft,
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
    } catch (err: any) {
      console.error('[Firebase Login Error]:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError(t('errors.invalidCredentials'));
      } else if (err.code === 'auth/invalid-email') {
        setError(t('errors.invalidEmail'));
      } else if (err.code === 'auth/user-disabled') {
        setError(t('errors.userDisabled'));
      } else if (err.code === 'auth/too-many-requests') {
        setError(t('errors.tooManyRequests'));
      } else if (err.code === 'auth/network-request-failed') {
        setError(t('errors.networkError'));
      } else if (err.message && !err.message.includes('object Object')) {
        setError(err.message);
      } else {
        setError(t('errors.invalidCredentials'));
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
    } catch (err: any) {
      console.error('[Password Reset Error]:', err);
      if (err.code === 'auth/user-not-found') {
        // Privacy-preserving non-enumeration
        setResolvedEmailDisplay(cleanInput);
        setResetSuccess(true);
        setResendCooldown(30);
      } else if (err.code === 'auth/invalid-email') {
        setResetError(t('errors.invalidEmail') || 'Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setResetError(t('errors.tooManyRequests') || 'Too many reset attempts. Please wait a moment before trying again.');
      } else if (err.code === 'auth/network-request-failed') {
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
      
      {/* ============================================================
          TOP RIGHT LANGUAGE SELECTOR (GLOBAL)
          ============================================================ */}
      <header className="feeder-exact-top-bar" aria-label="Language selection">
        <div className="feeder-language-selector-wrap">
          <button
            type="button"
            className="feeder-language-btn"
            onClick={() => setShowLangMenu(!showLangMenu)}
            aria-expanded={showLangMenu}
            aria-label={t('login.selectLanguage')}
          >
            <Globe size={14} className="feeder-globe-icon" />
            <span>{language.nativeName || 'English'}</span>
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
          1. MOBILE LOGIN EXPERIENCE (< 769px) - NATURE REFERENCE UI
          ============================================================ */}
      <div className="feeder-mobile-nature-container">
        
        {/* Top Branding Section */}
        <div className="feeder-mobile-brand-header">
          <div className="feeder-mobile-logo-wrap">
            <img
              src="/images/feeder-logo.svg"
              alt="Feeder"
              className="feeder-mobile-logo-svg"
            />
          </div>
          <h1 className="feeder-mobile-main-tagline">
            {t('login.taglineMain') || 'A kinder world for every animal.'}
          </h1>
          <p className="feeder-mobile-sub-tagline">
            {t('login.taglineSub') || 'Connect • Care • Protect • Empower'}
          </p>
        </div>

        {/* Hero Wildlife Art Composition */}
        <div className="feeder-mobile-hero-wrapper">
          <img
            src="/images/feeder-wildlife-hero.jpg"
            alt="Feeder. A kinder world for every animal."
            className="feeder-mobile-hero-image"
            loading="eager"
          />
        </div>

        {/* Rounded Authentication Panel */}
        <div className="feeder-mobile-auth-panel">
          
          {/* Feature Action Circles */}
          <div className="feeder-mobile-features-grid">
            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-box">
                <PawPrint size={18} className="text-[#1B5E20]" />
              </div>
              <span className="feeder-mobile-feature-label">{t('login.findHelp') || 'Find Help'}</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-box">
                <Heart size={18} className="text-[#1B5E20]" />
              </div>
              <span className="feeder-mobile-feature-label">{t('login.adopt') || 'Adopt'}</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-box">
                <Utensils size={18} className="text-[#1B5E20]" />
              </div>
              <span className="feeder-mobile-feature-label">{t('login.supportFeeding') || 'Support Feeding'}</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-box">
                <Scale size={18} className="text-[#1B5E20]" />
              </div>
              <span className="feeder-mobile-feature-label">{t('login.knowYourRights') || 'Know Your Rights'}</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-box">
                <Leaf size={18} className="text-[#1B5E20]" />
              </div>
              <span className="feeder-mobile-feature-label">{t('login.learnAndExplore') || 'Learn & Explore'}</span>
            </div>

            <div className="feeder-mobile-feature-item">
              <div className="feeder-mobile-feature-icon-box">
                <Users size={18} className="text-[#1B5E20]" />
              </div>
              <span className="feeder-mobile-feature-label">{t('login.joinCommunity') || 'Join a Community'}</span>
            </div>
          </div>

          {/* Authentication Actions Area */}
          <div className="feeder-mobile-auth-actions-wrap">
            
            {/* Error Message */}
            {error && (
              <div className="feeder-exact-alert-error" role="alert">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!showEmailForm ? (
              /* Default Quick Auth Mode */
              <div className="feeder-mobile-quick-actions">
                {/* Continue with Email Button */}
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="feeder-mobile-btn-email"
                >
                  <Mail size={17} className="shrink-0" />
                  <span>{t('login.continueWithEmail') || 'Continue with Email'}</span>
                  <ArrowRight size={16} className="shrink-0" />
                </button>

                {/* Continue with Google */}
                <GoogleSignInButton
                  onError={(msg) => setError(msg)}
                  className="feeder-mobile-btn-google"
                  buttonText={t('login.continueWithGoogle')}
                />

                {/* Divider: ──── OR ──── */}
                <div className="feeder-exact-divider">
                  <div className="feeder-exact-divider-line" />
                  <span className="feeder-exact-divider-text">{t('login.or') || 'OR'}</span>
                  <div className="feeder-exact-divider-line" />
                </div>

                {/* Create an Account */}
                <Link href="/signup" className="feeder-mobile-btn-create">
                  {t('login.createNewAccount') || 'Create an Account'}
                </Link>

                {/* Already have an account? Log In */}
                <div className="feeder-mobile-login-toggle-wrap">
                  <span className="text-[#64748b] text-[12.5px]">
                    {t('login.alreadyHaveAccount') || 'Already have an account?'}
                  </span>{' '}
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className="feeder-mobile-login-link"
                  >
                    {t('login.logIn') || 'Log In'}
                  </button>
                </div>
              </div>
            ) : (
              /* Direct Email / Password Credentials Form */
              <form onSubmit={handleLogin} className="feeder-exact-credentials-form" noValidate>
                <div className="feeder-exact-form-group">
                  <label className="feeder-exact-label" htmlFor="feeder-login-identifier">
                    {t('login.emailOrUsername')}
                  </label>
                  <div className="feeder-exact-input-wrap">
                    <Mail size={16} className="feeder-exact-input-icon" />
                    <input
                      id="feeder-login-identifier"
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
                    <label className="feeder-exact-label" htmlFor="feeder-login-password">
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
                      id="feeder-login-password"
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

                {/* Quick Google Option */}
                <div className="mt-2.5">
                  <GoogleSignInButton
                    onError={(msg) => setError(msg)}
                    className="feeder-mobile-btn-google"
                    buttonText={t('login.continueWithGoogle')}
                  />
                </div>

                {/* Back to Quick Options */}
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="feeder-mobile-back-btn"
                >
                  <ArrowLeft size={14} />
                  <span>{t('login.backToOptions') || 'Back to all options'}</span>
                </button>
              </form>
            )}

            {/* Pagination Dots: • • • */}
            <div className="feeder-mobile-pagination-dots" aria-hidden="true">
              <span className="feeder-mobile-dot active" />
              <span className="feeder-mobile-dot" />
              <span className="feeder-mobile-dot" />
            </div>

            {/* Brand Footer */}
            <div className="feeder-mobile-footer-brand">
              <div className="feeder-mobile-footer-logo-row">
                <Leaf size={13} className="text-[#2e7d32]" />
                <span className="feeder-mobile-footer-text">feeder.life</span>
              </div>
              <p className="feeder-mobile-footer-tagline">
                {t('login.footerTagline') || 'For animals. For people. For a better tomorrow.'}
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
              alt="Feeder. Explore the things you love. Animals Bring People Together, Care Feed Rescue Repeat."
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

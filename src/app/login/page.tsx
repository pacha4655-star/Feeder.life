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
import MobileLogin from '@/components/auth/MobileLogin';
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
  Globe,
  X,
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

  // Desktop language selector dropdown state
  const [showLangMenu, setShowLangMenu] = useState(false);

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
      const idToken = await userCredential.user.getIdToken();

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
      const idToken = await userCredential.user.getIdToken();

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
    <div className="feeder-page-root" dir={dir}>
      {/* ============================================================
          1. MOBILE VIEWPORT EXPERIENCE (< 1024px)
          ============================================================ */}
      <div className="feeder-mobile-viewport-wrapper">
        <MobileLogin
          identifier={identifier}
          setIdentifier={setIdentifier}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          isLoading={isLoading}
          error={error}
          setError={setError}
          showEmailForm={showEmailForm}
          setShowEmailForm={setShowEmailForm}
          handleLogin={handleLogin}
          handleGoogleSignIn={handleGoogleSignIn}
          onForgotPasswordClick={() => {
            setResetEmail(identifier.trim());
            setResetError('');
            setResetSuccess(false);
            setShowForgotModal(true);
          }}
          t={t}
        />
      </div>

      {/* ============================================================
          2. DESKTOP VIEWPORT EXPERIENCE (>= 1024px) - REAL RESPONSIVE UI
          ============================================================ */}
      <main className="login-shell">
        <div className="login-shell-inner">
          <section className="login-main">
            {/* LEFT HERO PANEL */}
            <section className="hero-panel" aria-label="Feeder Overview">
              <div className="hero-visual">
                <img
                  src="/images/feeder-login-left-artwork.jpg"
                  alt="Feeder — Connect. Care. Protect. Make a difference. A kinder world for every animal."
                  className="hero-artwork-img"
                  loading="eager"
                  fetchPriority="high"
                  width={1024}
                  height={1024}
                />
              </div>
            </section>

            {/* RIGHT AUTH PANEL */}
            <section className="auth-panel" aria-label="Account Login">
              {/* TOP RIGHT LANGUAGE SELECTOR */}
              <header className="auth-header">
                <div className="auth-lang-picker">
                  <button
                    type="button"
                    className="auth-lang-btn"
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    aria-expanded={showLangMenu}
                    aria-label={t('login.selectLanguage')}
                  >
                    <Globe size={15} className="auth-lang-globe" />
                    <span>{locale === 'en' ? 'English (US)' : (language.nativeName || 'English')}</span>
                    <ChevronDown size={14} className="auth-lang-chevron" />
                  </button>

                  {showLangMenu && (
                    <div className="auth-lang-dropdown">
                      {SUPPORTED_LANGUAGES.slice(0, 12).map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          className={`auth-lang-option ${locale === lang.code ? 'active' : ''}`}
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

              {/* AUTH CARD */}
              <div className="auth-card-container">
                <div className="auth-card">
                  <h1 className="auth-title">
                    {t('login.welcomeTitle') || 'Welcome to Feeder'}
                  </h1>
                  <p className="auth-subtitle">
                    {t('login.welcomeSubtitle') || 'Connect. Care. Protect. Make a difference.'}
                  </p>

                  {/* Error Notification */}
                  {error && (
                    <div className="auth-alert-error" role="alert">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Google Login Action */}
                  <GoogleSignInButton
                    onError={(msg) => setError(msg)}
                    className="auth-btn-google"
                    buttonText={t('login.continueWithGoogle') || 'Continue with Google'}
                  />

                  {/* OR Divider */}
                  <div className="auth-divider" aria-hidden="true">
                    <div className="auth-divider-line" />
                    <span className="auth-divider-text">{t('login.or') || 'OR'}</span>
                    <div className="auth-divider-line" />
                  </div>

                  {/* Credentials Form */}
                  <form onSubmit={handleLogin} className="auth-credentials-form" noValidate>
                    <div className="auth-form-group">
                      <label className="auth-label" htmlFor="desktop-login-identifier">
                        {t('login.emailOrUsername') || 'Email or Username'}
                      </label>
                      <div className="auth-input-wrap">
                        <Mail size={17} className="auth-input-icon" />
                        <input
                          id="desktop-login-identifier"
                          type="text"
                          className="auth-input"
                          placeholder={t('login.emailPlaceholder') || 'Enter email or username'}
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div className="auth-form-group">
                      <div className="auth-label-row">
                        <label className="auth-label" htmlFor="desktop-login-password">
                          {t('login.password') || 'Password'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(identifier.trim());
                            setResetError('');
                            setResetSuccess(false);
                            setShowForgotModal(true);
                          }}
                          className="auth-forgot-link"
                        >
                          {t('login.forgotPassword') || 'Forgot password?'}
                        </button>
                      </div>
                      <div className="auth-input-wrap">
                        <Lock size={17} className="auth-input-icon" />
                        <input
                          id="desktop-login-password"
                          type={showPassword ? 'text' : 'password'}
                          className="auth-input auth-password-input"
                          placeholder={t('login.passwordPlaceholder') || 'Enter password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="auth-eye-btn"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="auth-btn-login"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>{t('login.loggingIn') || 'Logging In...'}</span>
                        </>
                      ) : (
                        <span>{t('login.logIn') || 'Log In'}</span>
                      )}
                    </button>
                  </form>

                  {/* Create Account Button */}
                  <Link href="/signup" className="auth-btn-create-account">
                    {t('login.createNewAccount') || 'Create an Account'}
                  </Link>
                </div>

                {/* Bottom Switch text */}
                <div className="auth-footer-switch">
                  <span>New to Feeder? </span>
                  <Link href="/signup" className="auth-footer-switch-link">
                    Create an account
                  </Link>
                </div>
              </div>
            </section>
          </section>

          {/* DESKTOP FOOTER */}
          <footer className="login-footer" aria-label="Site footer">
            <div className="login-footer-copyright">
              Feeder.life © 2026. Empowering Compassion for Animals Worldwide.
            </div>
            <nav className="login-footer-nav" aria-label="Footer links">
              <Link href="/communities" className="login-footer-link">Communities</Link>
              <Link href="/animals" className="login-footer-link">Animals</Link>
              <Link href="/feeding" className="login-footer-link">Feeding</Link>
              <Link href="/sos" className="login-footer-link">SOS Rescue</Link>
              <Link href="/nearby" className="login-footer-link">Nearby</Link>
              <Link href="/ask-feeder" className="login-footer-link">Ask Feeder AI</Link>
              <a href="#about" onClick={(e) => { e.preventDefault(); alert("Feeder.life is a social animal welfare network connecting community feeders, volunteers, and rescuers worldwide."); }} className="login-footer-link">About</a>
              <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Feeder.life Privacy Policy: Your data and location coordinates are protected and used strictly for animal rescue and community feeding coordination."); }} className="login-footer-link">Privacy</a>
              <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Feeder.life Terms of Service: By using Feeder.life, you agree to uphold ethical animal welfare practices and respectful community conduct."); }} className="login-footer-link">Terms</a>
              <a href="#help" onClick={(e) => { e.preventDefault(); alert("Feeder Support: Email help@feeder.life for volunteer assistance, verified shelter badges, or platform queries."); }} className="login-footer-link">Help &amp; Support</a>
            </nav>
          </footer>
        </div>
      </main>

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
                    className="auth-btn-login w-full"
                  >
                    {t('forgotPassword.backToSignIn')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="feeder-modal-form">
                {resetError && (
                  <div className="auth-alert-error mb-3" role="alert">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div className="auth-form-group">
                  <label className="auth-label" htmlFor="exact-reset-email">
                    {t('forgotPassword.emailLabel')}
                  </label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="exact-reset-email"
                      type="text"
                      className="auth-input"
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
                    className="auth-btn-login"
                    disabled={resetLoading}
                    style={{ height: '42px', fontSize: '13.5px', marginTop: 0 }}
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

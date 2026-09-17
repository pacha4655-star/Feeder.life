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
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { locale, language, setLocale, dir, t } = useLanguage();

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
      setError(t('errors.missingCredentials'));
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
          throw new Error(lookupData.error || t('errors.invalidCredentials'));
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
      setResetError(t('errors.invalidEmail'));
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
        setResetError(t('errors.invalidEmail'));
      } else if (err.code === 'auth/too-many-requests') {
        setResetError(t('errors.tooManyRequests'));
      } else {
        setResetError(t('errors.resetFailed'));
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="feeder-exact-login-page" dir={dir}>
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
                aria-label={t('login.selectLanguage')}
              >
                <Globe size={15} className="feeder-globe-icon" />
                <span>{language.nativeName}</span>
                <ChevronDown size={14} className="feeder-chevron-icon" />
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
                    alt={rememberedUser?.name || t('login.userAvatar')}
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
                      <span>{t('login.signingIn')}</span>
                    </>
                  ) : (
                    <span>{t('login.continue')}</span>
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
                  {t('login.useAnotherProfile')}
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
                  <h2 className="feeder-credentials-title">{t('login.title')}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setViewMode('profile');
                    }}
                    className="feeder-back-profile-btn"
                  >
                    {t('login.switchToSaved')}
                  </button>
                </div>

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
                      autoFocus
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
                        setResetEmail(identifier.includes('@') ? identifier : '');
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
              </form>
            )}

            {/* Divider: ────── or ────── */}
            <div className="feeder-exact-divider">
              <div className="feeder-exact-divider-line" />
              <span className="feeder-exact-divider-text">{t('login.or')}</span>
              <div className="feeder-exact-divider-line" />
            </div>

            {/* Google Login: Continue with Google */}
            <GoogleSignInButton
              onError={(msg) => setError(msg)}
              className="feeder-exact-google-btn"
              buttonText={t('login.continueWithGoogle')}
            />

            {/* Create new account CTA: Outline Button */}
            <div className="feeder-exact-signup-wrap">
              <Link href="/signup" className="feeder-exact-btn-create-account">
                {t('login.createNewAccount')}
              </Link>
            </div>
          </div>
        </section>

      </div>

      {/* ============================================================
          GLOBAL MULTILINGUAL FOOTER
          ============================================================ */}
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
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">{t('forgotPassword.successTitle')}</p>
                  <p className="text-xs text-emerald-800 mt-1">
                    {t('forgotPassword.successDesc', { email: resetEmail })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="feeder-exact-btn-continue mt-4 w-full"
                >
                  {t('forgotPassword.backToSignIn')}
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
                    {t('forgotPassword.emailLabel')}
                  </label>
                  <div className="feeder-exact-input-wrap">
                    <Mail size={16} className="feeder-exact-input-icon" />
                    <input
                      id="exact-reset-email"
                      type="email"
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

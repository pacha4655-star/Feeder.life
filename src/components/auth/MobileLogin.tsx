'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  Leaf,
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import FeatureActionGrid from './FeatureActionGrid';
import AuthProviderButton from './AuthProviderButton';
import AuthDivider from './AuthDivider';

export interface MobileLoginProps {
  identifier: string;
  setIdentifier: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean | ((prev: boolean) => boolean)) => void;
  isLoading: boolean;
  error: string;
  setError: (val: string) => void;
  showEmailForm: boolean;
  setShowEmailForm: (val: boolean) => void;
  handleLogin: (e?: React.FormEvent) => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
  handleAppleSignIn?: () => void;
  onForgotPasswordClick: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function MobileLogin({
  identifier,
  setIdentifier,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isLoading,
  error,
  setError,
  showEmailForm,
  setShowEmailForm,
  handleLogin,
  handleGoogleSignIn,
  handleAppleSignIn,
  onForgotPasswordClick,
  t,
}: MobileLoginProps) {
  const onAppleClick = () => {
    if (handleAppleSignIn) {
      handleAppleSignIn();
    } else {
      setError('Apple Sign-In is configured for iOS Safari / App. Please continue with Google or Email.');
    }
  };

  return (
    <div className="feeder-mobile-login-root">
      {/* ── FULL-WIDTH HERO SECTION ──────────────────────── */}
      <section className="feeder-mobile-hero-section" aria-label="Feeder Welcome">
        {/* Full-Width Animal & Nature Landscape Background */}
        <div className="feeder-mobile-hero-bg-layer" aria-hidden="true">
          <Image
            src="/assets/feeder-login/hero-nature-animals-landscape.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 480px"
            className="feeder-mobile-hero-bg-img"
          />
        </div>

        {/* Top Header: Safe Area & Language Selector */}
        <header className="feeder-mobile-top-header">
          <LanguageSelector className="feeder-mobile-lang-btn" useGlobeAsset={false} />
        </header>

        {/* Real HTML Brand & Taglines Layered Over Open Sky */}
        <div className="feeder-mobile-brand-block">
          <div className="feeder-mobile-logo-wrap">
            <Image
              src="/assets/feeder-login/feeder-logo.png"
              alt="Feeder.life"
              width={180}
              height={44}
              priority
              className="feeder-mobile-logo-img"
            />
          </div>
          <h1 className="feeder-mobile-hero-title">
            A kinder world for every animal.
          </h1>
          <p className="feeder-mobile-hero-subline">
            <span>Connect</span>
            <span className="feeder-bullet" aria-hidden="true">•</span>
            <span>Care</span>
            <span className="feeder-bullet" aria-hidden="true">•</span>
            <span>Protect</span>
            <span className="feeder-bullet" aria-hidden="true">•</span>
            <span>Empower</span>
          </p>
        </div>

        {/* Generous Open Sky Spacer between Text and Animals */}
        <div className="feeder-mobile-hero-spacer" aria-hidden="true" />
      </section>

      {/* ── WHITE AUTHENTICATION SHEET ─────────────────────── */}
      <section className="feeder-mobile-auth-sheet" aria-label="Sign in to Feeder">
        {/* 6 Circular Feature Items Grid */}
        <FeatureActionGrid />

        {/* Global Error Banner */}
        {error && !showEmailForm && (
          <div className="feeder-auth-error-banner" role="alert">
            <AlertCircle size={15} className="shrink-0 text-red-600" />
            <span className="feeder-auth-error-text">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="feeder-auth-error-close"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Main Authentication Flow */}
        {!showEmailForm ? (
          <div className="feeder-mobile-auth-stack">
            {/* 1. Continue with Email Button */}
            <AuthProviderButton
              variant="email"
              label="Continue with Email"
              icon={
                <Image
                  src="/assets/feeder-login/email-icon-reference.webp"
                  alt=""
                  width={18}
                  height={18}
                  className="feeder-auth-icon-img"
                />
              }
              rightIcon={
                <Image
                  src="/assets/feeder-login/arrow-icon-reference.webp"
                  alt=""
                  width={16}
                  height={16}
                  className="feeder-auth-arrow-img"
                />
              }
              onClick={() => {
                setError('');
                setShowEmailForm(true);
              }}
            />

            {/* 2. Continue with Google Button */}
            <AuthProviderButton
              variant="google"
              label="Continue with Google"
              icon={
                <Image
                  src="/assets/feeder-login/google-icon-reference.webp"
                  alt=""
                  width={18}
                  height={18}
                  className="feeder-auth-icon-img"
                />
              }
              onClick={handleGoogleSignIn}
              isLoading={isLoading}
              disabled={isLoading}
            />

            {/* 3. Continue with Apple Button */}
            <AuthProviderButton
              variant="apple"
              label="Continue with Apple"
              icon={
                <Image
                  src="/assets/feeder-login/apple-icon-reference.webp"
                  alt=""
                  width={18}
                  height={18}
                  className="feeder-auth-icon-img"
                />
              }
              onClick={onAppleClick}
            />

            {/* 4. OR Divider */}
            <AuthDivider text="OR" />

            {/* 5. Create an Account Button */}
            <AuthProviderButton
              variant="create"
              label="Create an Account"
              href="/signup"
            />

            {/* 6. Already have an account? Log In Link */}
            <div className="feeder-mobile-account-switch">
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowEmailForm(true);
                }}
                className="feeder-mobile-login-switch-btn"
              >
                Log In
              </button>
            </div>
          </div>
        ) : (
          /* Inline Email Login Form */
          <form onSubmit={handleLogin} className="feeder-mobile-email-form" noValidate>
            <div className="feeder-email-form-header">
              <span className="feeder-email-form-title">Log In with Email</span>
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="feeder-email-back-btn"
              >
                ← Back to options
              </button>
            </div>

            {error && (
              <div className="feeder-auth-error-banner" role="alert">
                <AlertCircle size={15} className="shrink-0 text-red-600" />
                <span className="feeder-auth-error-text">{error}</span>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="feeder-auth-error-close"
                  aria-label="Dismiss error"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="feeder-form-field">
              <label className="feeder-form-label" htmlFor="mobile-email-identifier">
                {t('login.emailOrUsername')}
              </label>
              <div className="feeder-form-input-container">
                <Mail size={16} className="feeder-form-input-icon" />
                <input
                  id="mobile-email-identifier"
                  type="text"
                  className="feeder-form-input"
                  placeholder={t('login.emailPlaceholder')}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="feeder-form-field">
              <div className="feeder-form-label-row">
                <label className="feeder-form-label" htmlFor="mobile-email-password">
                  {t('login.password')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onForgotPasswordClick();
                  }}
                  className="feeder-form-forgot-btn"
                >
                  {t('login.forgotPassword')}
                </button>
              </div>
              <div className="feeder-form-input-container">
                <Lock size={16} className="feeder-form-input-icon" />
                <input
                  id="mobile-email-password"
                  type={showPassword ? 'text' : 'password'}
                  className="feeder-form-input feeder-form-input-pwd"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="feeder-form-eye-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="feeder-auth-provider-btn feeder-auth-btn-email feeder-form-submit-btn"
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

        {/* ── FOOTER GROUP ───────────────────────────────────── */}
        <footer className="feeder-mobile-footer-group">
          {/* Pagination dots (Slide 1 of 3 active) */}
          <div className="feeder-mobile-dots-bar" aria-label="Slide 1 of 3">
            <span className="feeder-pagination-dot active" />
            <span className="feeder-pagination-dot" />
            <span className="feeder-pagination-dot" />
          </div>

          {/* feeder.life Brand & Tagline */}
          <div className="feeder-mobile-brand-footer">
            <div className="feeder-mobile-footer-logo-row">
              <Image
                src="/assets/feeder-login/footer-leaf-reference.webp"
                alt=""
                width={15}
                height={14}
                className="feeder-footer-leaf-img"
              />
              <span className="feeder-footer-brand-name">feeder.life</span>
            </div>
            <p className="feeder-footer-slogan">
              For animals. For people. For a better tomorrow.
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}

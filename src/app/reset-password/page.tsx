'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Leaf,
} from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';

  const [email, setEmail] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(true);
  const [codeError, setCodeError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate the oobCode on mount
  useEffect(() => {
    if (!oobCode) {
      setIsValidatingCode(false);
      setCodeError('Missing or invalid password reset link. Please request a new link.');
      return;
    }

    let isMounted = true;
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        if (isMounted) {
          setEmail(userEmail);
          setIsValidatingCode(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error('[Reset Password Verification Error]:', err);
          setIsValidatingCode(false);
          if (err.code === 'auth/expired-action-code') {
            setCodeError('This password reset link has expired. Please request a new one.');
          } else if (err.code === 'auth/invalid-action-code') {
            setCodeError('This password reset link is invalid or has already been used.');
          } else if (err.code === 'auth/user-disabled') {
            setCodeError('This account has been disabled. Please contact support.');
          } else {
            setCodeError('Unable to verify reset link. Please request a new password reset.');
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '#cbd5e1' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: '#ef4444' };
      case 2:
        return { score: 2, label: 'Fair', color: '#f59e0b' };
      case 3:
        return { score: 3, label: 'Good', color: '#10b981' };
      case 4:
        return { score: 4, label: 'Strong', color: '#059669' };
      default:
        return { score: 0, label: '', color: '#cbd5e1' };
    }
  };

  const pwdStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!password) {
      setFormError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[Confirm Password Reset Error]:', err);
      if (err.code === 'auth/expired-action-code') {
        setFormError('This password reset link has expired. Please request a new one.');
      } else if (err.code === 'auth/invalid-action-code') {
        setFormError('This reset code is invalid or has already been used.');
      } else if (err.code === 'auth/weak-password') {
        setFormError('Password is too weak. Please choose a stronger password.');
      } else if (err.code === 'auth/too-many-requests') {
        setFormError('Too many attempts. Please try again later.');
      } else {
        setFormError('Unable to update your password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="feeder-compact-signup-page">
      {/* Top Bar with Back Button */}
      <div className="feeder-compact-signup-topbar">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="feeder-compact-back-btn"
          aria-label="Back to Login"
        >
          <ArrowLeft size={15} />
          <span>Back to Login</span>
        </button>
      </div>

      {/* Main Centered Container */}
      <div className="feeder-compact-signup-container">
        {/* Brand Header */}
        <div className="feeder-compact-signup-brand">
          <Link href="/" className="feeder-compact-logo-link" title="Feeder.life">
            <img
              src="/images/feeder-logo.svg"
              alt="Feeder"
              className="feeder-compact-logo-img"
            />
          </Link>
          <h1 className="feeder-compact-signup-title">Set New Password</h1>
          <p className="feeder-compact-signup-desc">
            {email ? `Create a secure new password for ${email}` : 'Secure your Feeder account'}
          </p>
        </div>

        {/* Card */}
        <div className="feeder-compact-signup-card">
          {isValidatingCode ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-[#475569]">
              <Loader2 size={28} className="animate-spin text-[#1B5E20]" />
              <p className="text-sm font-medium">Verifying reset link security code...</p>
            </div>
          ) : codeError ? (
            <div className="py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} />
              </div>
              <h2 className="text-base font-bold text-[#0f172a] mb-1">Reset Link Expired or Invalid</h2>
              <p className="text-xs text-[#64748b] mb-5 leading-relaxed">{codeError}</p>
              <Link
                href="/login"
                className="feeder-compact-btn-submit text-center flex items-center justify-center text-decoration-none"
              >
                Return to Login
              </Link>
            </div>
          ) : isSuccess ? (
            <div className="py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="text-base font-bold text-[#0f172a] mb-1">Password Changed Successfully</h2>
              <p className="text-xs text-[#64748b] mb-5 leading-relaxed">
                Your account password has been updated. You can now log in using your new credentials.
              </p>
              <Link
                href="/login"
                className="feeder-compact-btn-submit text-center flex items-center justify-center text-decoration-none"
              >
                Log In Now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="feeder-compact-signup-form" noValidate>
              {formError && (
                <div className="feeder-exact-alert-error mb-2" role="alert">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* New Password */}
              <div className="feeder-compact-field">
                <label className="feeder-compact-label" htmlFor="new-password">
                  New password
                </label>
                <div className="feeder-compact-input-wrap">
                  <Lock size={15} className="feeder-compact-input-icon" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="feeder-compact-input feeder-compact-input-password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="feeder-compact-eye-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Password Strength */}
              {password && (
                <div className="feeder-compact-strength-row">
                  <div className="feeder-compact-strength-bars">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className="feeder-compact-strength-bar"
                        style={{
                          background: pwdStrength.score >= lvl ? pwdStrength.color : '#e2e8f0',
                        }}
                      />
                    ))}
                  </div>
                  <span className="feeder-compact-strength-text" style={{ color: pwdStrength.color }}>
                    {pwdStrength.label}
                  </span>
                </div>
              )}

              {/* Confirm Password */}
              <div className="feeder-compact-field">
                <label className="feeder-compact-label" htmlFor="confirm-new-password">
                  Confirm new password
                </label>
                <div className="feeder-compact-input-wrap">
                  <Lock size={15} className="feeder-compact-input-icon" />
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="feeder-compact-input feeder-compact-input-password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="feeder-compact-eye-btn"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="feeder-compact-btn-submit mt-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <span>Set New Password</span>
                    <ShieldCheck size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <footer className="feeder-compact-footer">
          <div className="feeder-compact-footer-row">
            <Leaf size={13} className="text-[#2e7d32]" />
            <span className="feeder-compact-footer-domain">feeder.life</span>
          </div>
          <p className="feeder-compact-footer-copy">Connect. Care. Rescue. Repeat.</p>
        </footer>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f4f8f4]">
          <Loader2 size={32} className="animate-spin text-[#1B5E20]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

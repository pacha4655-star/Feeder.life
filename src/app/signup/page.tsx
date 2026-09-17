'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Globe,
  MapPin,
  ShieldCheck,
  Loader2,
  Leaf,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Username validation state
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState('');

  // Real Username Availability Checker (Debounced)
  useEffect(() => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      setUsernameAvailable(null);
      setUsernameError('');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUser)) {
      setUsernameAvailable(false);
      setUsernameError('Only lowercase letters, numbers, and underscores allowed.');
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      setUsernameError('');
      try {
        const res = await fetch(`/api/auth/lookup?check=available&username=${encodeURIComponent(cleanUser)}`);
        const data = await res.json();
        if (data.success && data.available) {
          setUsernameAvailable(true);
          setUsernameError('');
        } else {
          setUsernameAvailable(false);
          setUsernameError(data.error || 'This username is already taken.');
        }
      } catch (err) {
        console.warn('Username check notice:', err);
      } finally {
        setUsernameChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Client validation
    if (!cleanFirst) {
      setError('Please enter your first name.');
      return;
    }
    if (cleanFirst.length < 2) {
      setError('First name must be at least 2 characters.');
      return;
    }
    if (!cleanLast) {
      setError('Please enter your last name.');
      return;
    }
    if (!cleanUser) {
      setError('Please choose a username.');
      return;
    }
    if (cleanUser.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUser)) {
      setError('Username can only contain lowercase letters, numbers, and underscores.');
      return;
    }
    if (usernameAvailable === false) {
      setError(usernameError || 'This username is already taken. Please choose another.');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please create a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setIsLoading(true);

    try {
      const fullName = `${cleanFirst} ${cleanLast}`.trim();

      // 1. Create real account in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      // 2. Set Firebase Auth display name
      try {
        await updateProfile(userCredential.user, {
          displayName: fullName,
        });
      } catch (profileErr) {
        console.warn('[Signup] Firebase updateProfile notice:', profileErr);
      }

      // 3. Obtain verified Firebase ID token
      const idToken = await userCredential.user.getIdToken(true);

      // 4. Synchronize user profile into Supabase PostgreSQL (users table)
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          username: cleanUser,
          fullName,
          profileData: {
            country: country.trim() || undefined,
            city: city.trim() || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete registration with the database. Please try again.');
      }

      // 5. Complete flow and redirect
      router.push(data.redirectTo || '/onboarding');
      router.refresh();
    } catch (err: any) {
      console.error('[Firebase Signup Error]:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try logging in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Unable to connect. Please check your internet connection.');
      } else if (err.message && !err.message.includes('object Object')) {
        setError(err.message);
      } else {
        setError('Unable to create your account. Please try again.');
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
          id="btn-signup-back"
          type="button"
          onClick={() => router.push('/login')}
          className="feeder-compact-back-btn"
          aria-label="Go back to login"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
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
          <h1 className="feeder-compact-signup-title">Create your Feeder account</h1>
          <p className="feeder-compact-signup-desc">
            Join a global community of people who care for animals.
          </p>
        </div>

        {/* Signup Card */}
        <div className="feeder-compact-signup-card">
          
          {/* Error Alert Banner */}
          {error && (
            <div className="feeder-exact-alert-error mb-3" role="alert">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="feeder-compact-signup-form" noValidate>
            
            {/* Name Fields (2 Columns) */}
            <div className="feeder-compact-grid-2col">
              <div className="feeder-compact-field">
                <label className="feeder-compact-label" htmlFor="signup-firstname">
                  First name
                </label>
                <div className="feeder-compact-input-wrap">
                  <User size={15} className="feeder-compact-input-icon" />
                  <input
                    id="signup-firstname"
                    type="text"
                    className="feeder-compact-input"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </div>
              </div>

              <div className="feeder-compact-field">
                <label className="feeder-compact-label" htmlFor="signup-lastname">
                  Last name
                </label>
                <div className="feeder-compact-input-wrap">
                  <User size={15} className="feeder-compact-input-icon" />
                  <input
                    id="signup-lastname"
                    type="text"
                    className="feeder-compact-input"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Username Field */}
            <div className="feeder-compact-field">
              <div className="feeder-compact-label-row">
                <label className="feeder-compact-label" htmlFor="signup-username">
                  Username
                </label>
                {usernameChecking && (
                  <span className="text-[11px] text-[#64748b] flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" /> Checking...
                  </span>
                )}
                {!usernameChecking && usernameAvailable === true && (
                  <span className="text-[11px] text-[#15803d] font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Available
                  </span>
                )}
              </div>
              <div className="feeder-compact-input-wrap">
                <span className="feeder-compact-username-prefix">@</span>
                <input
                  id="signup-username"
                  type="text"
                  className="feeder-compact-input feeder-compact-input-username"
                  placeholder="choose_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  autoComplete="username"
                  required
                />
              </div>
              {usernameError && (
                <p className="text-[11px] text-[#b91c1c] font-medium mt-0.5">{usernameError}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="feeder-compact-field">
              <label className="feeder-compact-label" htmlFor="signup-email">
                Email address
              </label>
              <div className="feeder-compact-input-wrap">
                <Mail size={15} className="feeder-compact-input-icon" />
                <input
                  id="signup-email"
                  type="email"
                  className="feeder-compact-input"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password & Confirm Password (2 Columns on Desktop) */}
            <div className="feeder-compact-grid-2col">
              <div className="feeder-compact-field">
                <label className="feeder-compact-label" htmlFor="signup-password">
                  Password
                </label>
                <div className="feeder-compact-input-wrap">
                  <Lock size={15} className="feeder-compact-input-icon" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    className="feeder-compact-input feeder-compact-input-password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
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

              <div className="feeder-compact-field">
                <label className="feeder-compact-label" htmlFor="signup-confirm-password">
                  Confirm password
                </label>
                <div className="feeder-compact-input-wrap">
                  <Lock size={15} className="feeder-compact-input-icon" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="feeder-compact-input feeder-compact-input-password"
                    placeholder="Re-enter password"
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
            </div>

            {/* Compact Password Strength Meter */}
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

            {/* Optional Location (Country & City) */}
            <div className="feeder-compact-grid-2col">
              <div className="feeder-compact-field">
                <label className="feeder-compact-label" htmlFor="signup-country">
                  Country <span className="text-[#94a3b8] font-normal">(Optional)</span>
                </label>
                <div className="feeder-compact-input-wrap">
                  <Globe size={15} className="feeder-compact-input-icon" />
                  <input
                    id="signup-country"
                    type="text"
                    className="feeder-compact-input"
                    placeholder="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    autoComplete="country-name"
                  />
                </div>
              </div>

              <div className="feeder-compact-field">
                <label className="feeder-compact-label" htmlFor="signup-city">
                  City <span className="text-[#94a3b8] font-normal">(Optional)</span>
                </label>
                <div className="feeder-compact-input-wrap">
                  <MapPin size={15} className="feeder-compact-input-icon" />
                  <input
                    id="signup-city"
                    type="text"
                    className="feeder-compact-input"
                    placeholder="City / Location"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    autoComplete="address-level2"
                  />
                </div>
              </div>
            </div>

            {/* Required Terms Checkbox */}
            <div className="feeder-compact-terms-wrap">
              <label className="feeder-compact-checkbox-label">
                <input
                  id="signup-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="feeder-compact-checkbox"
                  required
                />
                <span className="feeder-compact-terms-text">
                  I agree to Feeder&apos;s{' '}
                  <a href="#terms" className="feeder-compact-legal-link">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#privacy" className="feeder-compact-legal-link">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>

            {/* Create Account Primary CTA */}
            <button
              id="btn-signup-submit"
              type="submit"
              className="feeder-compact-btn-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating your account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ShieldCheck size={16} />
                </>
              )}
            </button>

            {/* OR Divider */}
            <div className="feeder-compact-divider">
              <div className="feeder-compact-divider-line" />
              <span className="feeder-compact-divider-text">OR</span>
              <div className="feeder-compact-divider-line" />
            </div>

            {/* One-Tap Google Signup */}
            <GoogleSignInButton
              onError={(msg) => setError(msg)}
              className="feeder-mobile-btn-google"
              buttonText="Continue with Google"
            />

            {/* Already have an account */}
            <div className="feeder-compact-login-footer">
              <span>Already have an account?</span>{' '}
              <Link href="/login" className="feeder-compact-login-link">
                Log in
              </Link>
            </div>
          </form>
        </div>

        {/* Footer Brand Line */}
        <footer className="feeder-compact-footer">
          <div className="feeder-compact-footer-row">
            <Leaf size={13} className="text-[#2e7d32]" />
            <span className="feeder-compact-footer-domain">feeder.life</span>
          </div>
          <p className="feeder-compact-footer-copy">
            Connect. Care. Rescue. Repeat.
          </p>
        </footer>

      </div>
    </div>
  );
}

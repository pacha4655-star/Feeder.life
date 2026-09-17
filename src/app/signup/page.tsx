'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Camera,
  Globe,
  MapPin,
  ShieldCheck,
  Loader2,
  Leaf,
  PawPrint,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  // Current Step: 1, 2, 3, 4
  const [step, setStep] = useState(1);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile / Location State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [country, setCountry] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [city, setCity] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Validation / Loading State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState('');

  // Real Username Availability Checker
  useEffect(() => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || cleanUser.length < 3) {
      setUsernameAvailable(null);
      setUsernameError('');
      return;
    }

    // Format validation
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

  // Back Navigation Handler
  const handleBack = () => {
    setError('');
    if (step === 1) {
      router.push('/login');
    } else {
      setStep((prev) => prev - 1);
    }
  };

  // Step 1 Validation -> Proceed to Step 2
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

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

    setStep(2);
  };

  // Step 2 Validation -> Proceed to Step 3
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanUser = username.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
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

    // Verify username availability if not yet confirmed
    if (usernameAvailable === false) {
      setError(usernameError || 'This username is already taken. Please choose another.');
      return;
    }

    setStep(3);
  };

  // Step 3 Validation -> Proceed to Step 4
  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

    setStep(4);
  };

  // Step 4 Final Account Creation
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUser = username.trim().toLowerCase();
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // 1. Create real account in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      // 2. Set Firebase Auth display name
      try {
        await updateProfile(userCredential.user, {
          displayName: fullName,
          photoURL: avatarPreview || undefined,
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
          avatarUrl: avatarPreview || null,
          profileData: {
            country: country.trim() || undefined,
            state: stateRegion.trim() || undefined,
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

  // Avatar Photo Picker Handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile photo must be smaller than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '#e2e8f0' };
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
        return { score: 0, label: '', color: '#e2e8f0' };
    }
  };

  const pwdStrength = getPasswordStrength(password);

  const stepTitles = [
    'Your Name',
    'Account Details',
    'Security',
    'Profile & Location',
  ];

  return (
    <div className="feeder-signup-page">
      <div className="feeder-signup-wrapper">
        
        {/* Top Header Bar */}
        <header className="feeder-signup-header">
          <button
            id="btn-signup-back"
            type="button"
            onClick={handleBack}
            className="feeder-signup-back-btn"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <Link href="/" className="feeder-signup-logo-link" title="Feeder.life">
            <img
              src="/images/feeder-logo.svg"
              alt="Feeder"
              className="feeder-signup-logo-img"
            />
          </Link>

          <div className="feeder-signup-header-spacer" />
        </header>

        {/* Step Progress Bar & Counter */}
        <div className="feeder-signup-progress-wrap">
          <div className="feeder-signup-progress-meta">
            <span className="feeder-signup-step-counter">
              Step {step} of 4
            </span>
            <span className="feeder-signup-step-title">
              {stepTitles[step - 1]}
            </span>
          </div>

          <div className="feeder-signup-progress-track">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`feeder-signup-progress-segment ${step >= s ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="feeder-signup-card">
          
          {/* Error Banner */}
          {error && (
            <div className="feeder-exact-alert-error mb-4" role="alert">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ============================================================
              STEP 1: NAME
              ============================================================ */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="feeder-signup-form" noValidate>
              <div className="feeder-signup-heading-group">
                <h1 className="feeder-signup-title">What&apos;s your name?</h1>
                <p className="feeder-signup-subtitle">
                  Enter your name so animal caretakers and rescue teams can recognize you.
                </p>
              </div>

              <div className="feeder-signup-fields-grid">
                <div className="feeder-exact-form-group">
                  <label className="feeder-exact-label" htmlFor="signup-firstname">
                    First name
                  </label>
                  <div className="feeder-exact-input-wrap">
                    <User size={16} className="feeder-exact-input-icon" />
                    <input
                      id="signup-firstname"
                      type="text"
                      className="feeder-exact-input"
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="feeder-exact-form-group">
                  <label className="feeder-exact-label" htmlFor="signup-lastname">
                    Last name
                  </label>
                  <div className="feeder-exact-input-wrap">
                    <User size={16} className="feeder-exact-input-icon" />
                    <input
                      id="signup-lastname"
                      type="text"
                      className="feeder-exact-input"
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                id="btn-signup-continue"
                type="submit"
                className="feeder-signup-btn-continue"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>

              {/* Alternative One-Tap Google Signup */}
              <div className="feeder-exact-divider">
                <div className="feeder-exact-divider-line" />
                <span className="feeder-exact-divider-text">OR</span>
                <div className="feeder-exact-divider-line" />
              </div>

              <GoogleSignInButton
                onError={(msg) => setError(msg)}
                className="feeder-mobile-btn-google"
                buttonText="Continue with Google"
              />

              <div className="feeder-signup-login-footer">
                <span>Already have an account?</span>{' '}
                <Link href="/login" className="feeder-signup-login-link">
                  Log in
                </Link>
              </div>
            </form>
          )}

          {/* ============================================================
              STEP 2: ACCOUNT DETAILS (EMAIL & USERNAME)
              ============================================================ */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="feeder-signup-form" noValidate>
              <div className="feeder-signup-heading-group">
                <h1 className="feeder-signup-title">How can we reach you?</h1>
                <p className="feeder-signup-subtitle">
                  Choose a unique username and an email for notifications and emergency SOS alerts.
                </p>
              </div>

              <div className="feeder-exact-form-group">
                <label className="feeder-exact-label" htmlFor="signup-email">
                  Email address
                </label>
                <div className="feeder-exact-input-wrap">
                  <Mail size={16} className="feeder-exact-input-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    className="feeder-exact-input"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="feeder-exact-form-group">
                <div className="feeder-exact-label-row">
                  <label className="feeder-exact-label" htmlFor="signup-username">
                    Username
                  </label>
                  {usernameChecking && (
                    <span className="text-[11px] text-[#64748b] flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin" /> Checking availability...
                    </span>
                  )}
                  {!usernameChecking && usernameAvailable === true && (
                    <span className="text-[11px] text-[#15803d] font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Available
                    </span>
                  )}
                </div>
                <div className="feeder-exact-input-wrap">
                  <span className="feeder-signup-username-prefix">@</span>
                  <input
                    id="signup-username"
                    type="text"
                    className="feeder-exact-input feeder-signup-username-input"
                    placeholder="choose_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    autoComplete="username"
                    required
                  />
                </div>
                {usernameError && (
                  <p className="text-[11.5px] text-[#b91c1c] mt-1 font-medium">
                    {usernameError}
                  </p>
                )}
                <p className="text-[11px] text-[#64748b] mt-1">
                  Only lowercase letters, numbers, and underscores (3–30 characters).
                </p>
              </div>

              <button
                id="btn-signup-continue"
                type="submit"
                className="feeder-signup-btn-continue"
                disabled={usernameChecking || usernameAvailable === false}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>

              <div className="feeder-signup-login-footer">
                <span>Already have an account?</span>{' '}
                <Link href="/login" className="feeder-signup-login-link">
                  Log in
                </Link>
              </div>
            </form>
          )}

          {/* ============================================================
              STEP 3: PASSWORD & SECURITY
              ============================================================ */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="feeder-signup-form" noValidate>
              <div className="feeder-signup-heading-group">
                <h1 className="feeder-signup-title">Secure your account</h1>
                <p className="feeder-signup-subtitle">
                  Create a strong password to protect your account and animal welfare records.
                </p>
              </div>

              <div className="feeder-exact-form-group">
                <label className="feeder-exact-label" htmlFor="signup-password">
                  Create a password
                </label>
                <div className="feeder-exact-input-wrap">
                  <Lock size={16} className="feeder-exact-input-icon" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    className="feeder-exact-input feeder-exact-password-input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
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

                {/* Password Strength Meter */}
                {password && (
                  <div className="feeder-signup-strength-meter">
                    <div className="feeder-signup-strength-bars">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className="feeder-signup-strength-bar"
                          style={{
                            background: pwdStrength.score >= lvl ? pwdStrength.color : '#e2e8f0',
                          }}
                        />
                      ))}
                    </div>
                    <span className="feeder-signup-strength-label" style={{ color: pwdStrength.color }}>
                      {pwdStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="feeder-exact-form-group">
                <label className="feeder-exact-label" htmlFor="signup-confirm-password">
                  Confirm password
                </label>
                <div className="feeder-exact-input-wrap">
                  <Lock size={16} className="feeder-exact-input-icon" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="feeder-exact-input feeder-exact-password-input"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="feeder-exact-eye-btn"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                id="btn-signup-continue"
                type="submit"
                className="feeder-signup-btn-continue"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>

              <div className="feeder-signup-login-footer">
                <span>Already have an account?</span>{' '}
                <Link href="/login" className="feeder-signup-login-link">
                  Log in
                </Link>
              </div>
            </form>
          )}

          {/* ============================================================
              STEP 4: PROFILE PHOTO, LOCATION & TERMS
              ============================================================ */}
          {step === 4 && (
            <form onSubmit={handleFinalSubmit} className="feeder-signup-form" noValidate>
              <div className="feeder-signup-heading-group">
                <h1 className="feeder-signup-title">Make Feeder yours</h1>
                <p className="feeder-signup-subtitle">
                  Add an optional profile photo and your city/region to connect with nearby feeders and rescue cases.
                </p>
              </div>

              {/* Optional Profile Photo */}
              <div className="feeder-signup-photo-section">
                <div className="feeder-signup-avatar-wrap">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile preview"
                      className="feeder-signup-avatar-img"
                    />
                  ) : (
                    <div className="feeder-signup-avatar-placeholder">
                      <User size={36} className="text-[#94a3b8]" />
                    </div>
                  )}
                  <label htmlFor="signup-photo-input" className="feeder-signup-photo-badge">
                    <Camera size={14} className="text-white" />
                  </label>
                </div>

                <input
                  id="signup-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="feeder-signup-photo-input-hidden hidden"
                />

                <label htmlFor="signup-photo-input" className="feeder-signup-photo-btn">
                  {avatarPreview ? 'Change photo' : 'Add profile photo'}
                </label>
              </div>

              {/* Location Fields (Optional & Country-Agnostic) */}
              <div className="feeder-signup-location-group">
                <div className="feeder-exact-form-group">
                  <label className="feeder-exact-label" htmlFor="signup-country">
                    Country <span className="text-[#94a3b8] font-normal">(Optional)</span>
                  </label>
                  <div className="feeder-exact-input-wrap">
                    <Globe size={16} className="feeder-exact-input-icon" />
                    <input
                      id="signup-country"
                      type="text"
                      className="feeder-exact-input"
                      placeholder="e.g. United States, India, UK..."
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      autoComplete="country-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="feeder-exact-form-group">
                    <label className="feeder-exact-label" htmlFor="signup-state">
                      State / Region
                    </label>
                    <div className="feeder-exact-input-wrap">
                      <MapPin size={16} className="feeder-exact-input-icon" />
                      <input
                        id="signup-state"
                        type="text"
                        className="feeder-exact-input"
                        placeholder="State / Province"
                        value={stateRegion}
                        onChange={(e) => setStateRegion(e.target.value)}
                        autoComplete="address-level1"
                      />
                    </div>
                  </div>

                  <div className="feeder-exact-form-group">
                    <label className="feeder-exact-label" htmlFor="signup-city">
                      City
                    </label>
                    <div className="feeder-exact-input-wrap">
                      <MapPin size={16} className="feeder-exact-input-icon" />
                      <input
                        id="signup-city"
                        type="text"
                        className="feeder-exact-input"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        autoComplete="address-level2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="feeder-signup-terms-box">
                <label className="feeder-signup-checkbox-label">
                  <input
                    id="signup-terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="feeder-signup-checkbox"
                    required
                  />
                  <span className="feeder-signup-checkbox-text">
                    I agree to Feeder&apos;s{' '}
                    <a href="#terms" className="feeder-signup-legal-link">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#privacy" className="feeder-signup-legal-link">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
              </div>

              {/* Final Submit Button */}
              <button
                id="btn-signup-submit"
                type="submit"
                className="feeder-signup-btn-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ShieldCheck size={18} />
                  </>
                )}
              </button>

              <div className="feeder-signup-login-footer">
                <span>Already have an account?</span>{' '}
                <Link href="/login" className="feeder-signup-login-link">
                  Log in
                </Link>
              </div>
            </form>
          )}

        </div>

        {/* Footer Brand Line */}
        <footer className="feeder-signup-footer-brand">
          <div className="feeder-mobile-footer-logo-row">
            <Leaf size={14} className="text-[#2e7d32]" />
            <span className="feeder-mobile-footer-text">feeder.life</span>
          </div>
          <p className="feeder-mobile-footer-tagline">
            Connect. Care. Rescue. Repeat.
          </p>
        </footer>

      </div>
    </div>
  );
}

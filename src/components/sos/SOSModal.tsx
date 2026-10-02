'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  AlertTriangle,
  MapPin,
  Eye,
  CheckCircle2,
  Camera,
  UploadCloud,
  Loader2,
  Navigation,
  ShieldCheck,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import VoiceSOSRecorder from '@/components/sos/VoiceSOSRecorder';
import AITriageSection from '@/components/sos/AITriageSection';

interface SOSModalProps {
  user: UserSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSosCreated: () => void;
}

export default function SOSModal({ user, isOpen, onClose, onSosCreated }: SOSModalProps) {
  useBodyScrollLock(isOpen);

  const [step, setStep] = useState(1);
  const [emergencyType, setEmergencyType] = useState('INJURED_ANIMAL');
  const [animalType, setAnimalType] = useState('Street Dog (Brown Indie)');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [approxLocation, setApproxLocation] = useState('');
  const [approxLat, setApproxLat] = useState<number | null>(null);
  const [approxLon, setApproxLon] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [contactPref, setContactPref] = useState('IN_APP');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🚨</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--sos-red, #dc2626)' }}>Sign In to Report Emergency</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            To protect animals and maintain emergency response integrity, verified accounts are required to dispatch real-time rescue alerts to nearby responders.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <a href="/login" className="btn btn-sos" style={{ textDecoration: 'none' }}>Sign In to Continue</a>
          </div>
        </div>
      </div>
    );
  }

  // Real device media upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    setIsUploading(true);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload?category=sos', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.url) {
          newUrls.push(data.url);
        } else {
          setError(data.error || `Upload failed for ${file.name}`);
        }
      }
      setMediaUrls((prev) => [...prev, ...newUrls].slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Upload error occurred');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Browser Geolocation Permission Request
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser. Please enter landmark manually.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Requesting browser GPS permission...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setApproxLat(lat);
        setApproxLon(lon);
        setLocationStatus('GPS acquired! Protected coordinates will be blurred to a safe radius.');
        if (!approxLocation) {
          setApproxLocation(`Coordinates: ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationStatus('GPS permission was denied. Please enter neighborhood/landmark name manually below.');
        } else {
          setLocationStatus('Unable to determine location. Please enter nearest street or landmark.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergencyType,
          animalType,
          urgency,
          title: title.trim() || `[Emergency] ${emergencyType.replace(/_/g, ' ')} - ${animalType}`,
          description,
          approxLocationName: approxLocation || 'Nearby location shared',
          approxLat: approxLat ?? 0,
          approxLon: approxLon ?? 0,
          mediaUrls,
          contactPreference: contactPref,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSosCreated();
        onClose();
        setStep(1);
      } else {
        setError(data.error || 'Failed to dispatch SOS alert');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during SOS submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header" style={{ background: '#fee2e2', borderBottom: '1px solid #fca5a5' }}>
          <div className="modal-title" style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} />
            <span>Emergency Animal SOS Dispatch</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Emergency Advisory Disclaimer */}
          <div
            style={{
              padding: '10px 14px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#9f1239',
              lineHeight: 1.5,
              marginBottom: '16px',
            }}
          >
            <strong>Safety & Emergency Notice:</strong> Feeder.life is a peer-to-peer animal welfare coordination network. For critical life-threatening trauma, immediately transport to the nearest veterinary emergency hospital.
          </div>

          {error && (
            <div style={{ padding: '10px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          {/* Stepper Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', position: 'relative' }}>
            {['Situation', 'Details', 'Location & Media', 'Confirm & Preview'].map((stepLabel, idx) => {
              const current = idx + 1;
              const isDone = step > current;
              const isCurrent = step === current;
              return (
                <div key={idx} style={{ textAlign: 'center', flex: 1, position: 'relative' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isDone ? '#10b981' : isCurrent ? '#ef4444' : 'var(--bg-secondary)',
                      color: isDone || isCurrent ? 'white' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 6px auto',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {isDone ? <CheckCircle2 size={16} /> : current}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {stepLabel}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Voice to SOS Assistant */}
          {step <= 2 && (
            <VoiceSOSRecorder
              onDataExtracted={(data) => {
                if (data.animalType) setAnimalType(data.animalType);
                if (data.emergencyType) setEmergencyType(data.emergencyType);
                if (data.urgency) setUrgency(data.urgency);
                if (data.transcript) {
                  setDescription(data.transcript);
                  setTitle(`[Emergency] ${data.emergencyType.replace(/_/g, ' ')} - ${data.animalType}`);
                }
                if (data.locationLandmark && !approxLocation) {
                  setApproxLocation(data.locationLandmark);
                }
              }}
            />
          )}

          {/* STEP 1: Situation & Urgency */}
          {step === 1 && (
            <div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Select Emergency Situation Type</label>
                <select
                  className="form-select"
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  style={{ minHeight: '44px' }}
                >
                  <option value="INJURED_ANIMAL">🩹 Animal Injured (wound, fracture, bleeding, limping)</option>
                  <option value="TRAPPED">🕳️ Animal Trapped (drain, netting, tree, canal, well)</option>
                  <option value="ABANDONED">📦 Animal Missing or Abandoned Puppies/Kittens</option>
                  <option value="CRUELTY">⚖️ Animal Abuse or Cruelty Concern</option>
                  <option value="ACCIDENT">🚗 Animal Accident (road hit, vehicle collision)</option>
                  <option value="ANIMAL_IN_DANGER">⚡ Animal in Danger (harassment, extreme weather)</option>
                  <option value="OTHER">❓ Other Critical Welfare Distress</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Triage Urgency Level</label>
                <div className="form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { level: 'CRITICAL', label: 'Critical', desc: 'Active bleeding, unconscious, life threat', color: '#ef4444' },
                    { level: 'HIGH', label: 'High Priority', desc: 'Severe fracture, open wound, trapped', color: '#f97316' },
                    { level: 'MEDIUM', label: 'Moderate', desc: 'Stable condition, needs veterinary care today', color: '#eab308' },
                    { level: 'LOW', label: 'Low / Advisory', desc: 'Minor rash, non-urgent advisory assistance', color: '#3b82f6' },
                  ].map((u) => (
                    <div
                      key={u.level}
                      onClick={() => setUrgency(u.level as any)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: urgency === u.level ? `2px solid ${u.color}` : '1px solid var(--border-subtle)',
                        background: urgency === u.level ? `${u.color}15` : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13px', color: u.color, marginBottom: '2px' }}>
                        {u.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                        {u.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Animal & Description */}
          {step === 2 && (
            <div>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Animal Information</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Street Indie Dog (Brown coat), Kitten with eye infection, Pigeon with clipped wing"
                  value={animalType}
                  onChange={(e) => setAnimalType(e.target.value)}
                  required
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Alert Headline</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Indie puppy hit by scooter, unable to stand on rear leg"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Detailed Description of Distress</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Describe visible injuries, animal behavior (calm, shivering, aggressive), nearest shelter/water, and what assistance is needed (transport crate, first aid kit, volunteer foster)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 3: Location, Media & Privacy */}
          {step === 3 && (
            <div>
              {/* Location Permission Flow */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Location Information</label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={handleRequestLocation}
                    disabled={isLocating}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', minHeight: '44px' }}
                  >
                    {isLocating ? <Loader2 className="animate-spin" size={16} /> : <Navigation size={16} color="#059669" />}
                    <span>{isLocating ? 'Detecting GPS...' : 'Detect Device GPS'}</span>
                  </button>
                </div>

                {locationStatus && (
                  <div style={{ fontSize: '12px', color: approxLat ? '#059669' : '#dc2626', marginBottom: '8px', fontWeight: 500 }}>
                    {locationStatus}
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Near Metro Pillar 42, 100ft Road, Indiranagar"
                    value={approxLocation}
                    onChange={(e) => setApproxLocation(e.target.value)}
                    required
                    style={{ minHeight: '44px' }}
                  />
                  <MapPin size={18} color="#059669" style={{ position: 'absolute', right: '12px', top: '13px' }} />
                </div>

                {/* Location Privacy Guarantee Notice */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    padding: '8px 12px',
                    background: 'rgba(5, 150, 105, 0.08)',
                    borderRadius: '8px',
                    marginTop: '8px',
                  }}
                >
                  <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <strong>Location Privacy Protected:</strong> Exact device coordinates are never shown to the public. Feeder.life displays only the general neighborhood and safe street area.
                  </div>
                </div>
              </div>

              {/* Real Media Upload */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Upload Emergency Photo / Video</label>

                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaUpload}
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  capture="environment"
                  onChange={handleMediaUpload}
                />

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', minHeight: '44px' }}
                  >
                    <ImageIcon size={16} />
                    <span>Upload Media</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isUploading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', minHeight: '44px' }}
                  >
                    <Camera size={16} />
                    <span>Camera</span>
                  </button>
                </div>

                {isUploading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <Loader2 className="animate-spin" size={16} color="#059669" />
                    <span>Uploading file securely to Supabase Storage...</span>
                  </div>
                )}

                {/* Uploaded media previews */}
                {mediaUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {mediaUrls.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                        <img src={url} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Preference */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Contact Preference for Responders</label>
                <select
                  className="form-select"
                  value={contactPref}
                  onChange={(e) => setContactPref(e.target.value)}
                  style={{ minHeight: '44px' }}
                >
                  <option value="IN_APP">In-App Chat & Comments Only (Recommended)</option>
                  <option value="PHONE_ON_REQUEST">Phone Number Visible to Verified Responders</option>
                  <option value="COMMUNITY">Assign to Local Community Rescue Team</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 4: Preview */}
          {step === 4 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
                <Eye size={18} color="#dc2626" />
                <span>Emergency Broadcast Confirmation</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Please review details before dispatching to the responder network:
              </div>

              <div className="card" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className={`badge-urgency ${urgency.toLowerCase()}`}>{urgency}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status: OPEN</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main)', marginBottom: '4px' }}>
                  {title || `[Emergency] ${emergencyType} - ${animalType}`}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  📍 {approxLocation || 'Neighborhood shared'} &bull; 🐾 {animalType}
                </div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--text-main)' }}>
                  {description || 'No detailed description provided.'}
                </div>

                {mediaUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', overflowX: 'auto' }}>
                    {mediaUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="Evidence"
                        style={{ height: '100px', width: '120px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '12px', fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                  Reporter: {user.fullName} (@{user.username}) &bull; Contact: {contactPref}
                </div>
              </div>

              {/* Optional AI Visual Injury Triage */}
              <div style={{ marginTop: '16px' }}>
                <AITriageSection
                  animalType={animalType}
                  description={description}
                  imageUrl={mediaUrls[0]}
                  onTriageCompleted={(result) => {
                    if (result.urgency) {
                      setUrgency(result.urgency);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting || isUploading}
            >
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (step === 2 && !description.trim()) {
                  setError('Please describe the distress situation.');
                  return;
                }
                if (step === 3 && !approxLocation.trim() && !approxLat) {
                  setError('Please provide the approximate landmark or detect your GPS.');
                  return;
                }
                setError('');
                setStep(step + 1);
              }}
              style={{ minHeight: '44px' }}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sos"
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              style={{ minHeight: '44px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Dispatching SOS Alert...</span>
                </>
              ) : (
                <span>🚨 Broadcast Emergency SOS</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

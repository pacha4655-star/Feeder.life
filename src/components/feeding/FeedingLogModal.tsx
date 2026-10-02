'use client';

import React, { useState } from 'react';
import { X, Utensils, MapPin, Camera } from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { OfflineFeedingQueue } from '@/lib/offline/feeding-queue';

interface FeedingLogModalProps {
  user: UserSession | null;
  isOpen: boolean;
  onClose: () => void;
  onFeedLogged: () => void;
}

export default function FeedingLogModal({
  user,
  isOpen,
  onClose,
  onFeedLogged,
}: FeedingLogModalProps) {
  useBodyScrollLock(isOpen);

  const [animalType, setAnimalType] = useState('Street Dogs');
  const [animalCount, setAnimalCount] = useState('');
  const [foodType, setFoodType] = useState('');
  const [quantityDesc, setQuantityDesc] = useState('');
  const [approxLocation, setApproxLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'COMMUNITY' | 'PRIVATE'>('PUBLIC');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🍲</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--brand-primary)' }}>Sign In to Log Feeding</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            Keep track of daily feeding rounds, document street animal health, and coordinate with nearby feeders in your zone.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <a href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sign In to Continue</a>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const parsedCount = parseInt(animalCount || '1', 10);

    // If device is offline, save directly to offline IndexedDB queue
    if (typeof window !== 'undefined' && !navigator.onLine) {
      try {
        await OfflineFeedingQueue.saveLog({
          food_type: `${foodType} (${animalType})`,
          animals_count: parsedCount,
          notes: `${quantityDesc ? `Quantity: ${quantityDesc}. ` : ''}${notes}`,
          photo_url: photoUrl,
          approx_location_name: approxLocation,
        });
        onFeedLogged();
        onClose();
      } catch (err: any) {
        setError('Failed to store offline log: ' + err.message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/feeding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animalType,
          animalCount: parsedCount,
          foodType,
          quantityDesc,
          approxLocationName: approxLocation,
          notes,
          photoUrl: photoUrl || undefined,
          visibility,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onFeedLogged();
        onClose();
      } else {
        setError(data.error || 'Failed to log feeding round');
      }
    } catch (err: any) {
      // If network fails during request, fallback to offline queue
      try {
        await OfflineFeedingQueue.saveLog({
          food_type: `${foodType} (${animalType})`,
          animals_count: parsedCount,
          notes: `${quantityDesc ? `Quantity: ${quantityDesc}. ` : ''}${notes}`,
          photo_url: photoUrl,
          approx_location_name: approxLocation,
        });
        onFeedLogged();
        onClose();
      } catch {
        setError(err.message || 'Error occurred while saving feeding log');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: '#d1fae5', borderBottom: '1px solid #a7f3d0' }}>
          <div className="modal-title" style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Utensils size={20} />
            <span>Log Daily Animal Feeding</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '10px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div className="form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Animal Category</label>
                <select
                  className="form-select"
                  value={animalType}
                  onChange={(e) => setAnimalType(e.target.value)}
                >
                  <option value="Street Dogs">🐕 Street Dogs (Indies)</option>
                  <option value="Community Cats">🐈 Community Cats / Colony</option>
                  <option value="Birds & Pigeons">🕊️ City Birds / Pigeons</option>
                  <option value="Cattle / Cows">🐄 Street Cattle / Cows</option>
                  <option value="Other Rescued Animals">🐾 Mixed / Other Animals</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Animals Fed (Approx Count)</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={animalCount}
                  onChange={(e) => setAnimalCount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Food Distributed</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Boiled chicken & rice"
                  value={foodType}
                  onChange={(e) => setFoodType(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantity / Weight (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 5 kg, 4 packets"
                  value={quantityDesc}
                  onChange={(e) => setQuantityDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Approximate Area / Landmark</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  value={approxLocation}
                  onChange={(e) => setApproxLocation(e.target.value)}
                  required
                />
                <MapPin size={16} color="var(--brand-primary)" style={{ position: 'absolute', right: '12px', top: '12px' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Feeding Notes & Observations</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Note health conditions, wounds treated, hydration bowl status, or pregnant dogs noticed..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Photo URL (Optional)</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://images.unsplash.com/... or image link"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Log Visibility</label>
              <select
                className="form-select"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
              >
                <option value="PUBLIC">🌍 Public Feed (Inspire community & earn badges)</option>
                <option value="COMMUNITY">👥 Joined Communities Only</option>
                <option value="PRIVATE">🔒 Private (Personal record only)</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : '🐾 Save Feeding Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

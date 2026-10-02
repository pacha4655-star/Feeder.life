'use client';

import React, { useState } from 'react';
import { X, MapPin, Utensils, CheckCircle2, Loader2 } from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface FeedingSpotModalProps {
  user: UserSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSpotCreated: () => void;
}

export default function FeedingSpotModal({
  user,
  isOpen,
  onClose,
  onSpotCreated,
}: FeedingSpotModalProps) {
  useBodyScrollLock(isOpen);

  const [name, setName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [animalCount, setAnimalCount] = useState(4);
  const [animalType, setAnimalType] = useState('Dogs');
  const [preferredFood, setPreferredFood] = useState('Boiled Chicken & Rice / Dog Kibble');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !areaName.trim()) {
      setError('Please provide a spot name and neighborhood area.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/feeding/rosters/spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          areaName: areaName.trim(),
          animalCount,
          animalType,
          preferredFood,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSpotCreated();
        onClose();
      } else {
        setError(data.error || 'Failed to create feeding spot');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', padding: '24px', borderRadius: '16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Add Community Feeding Spot</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Spot Name *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Green Glen Park Gate 2 / Indiranagar Metro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Neighborhood / Area *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Indiranagar Sector 4, Bangalore"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Est. Animal Count
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className="input"
                value={animalCount}
                onChange={(e) => setAnimalCount(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Animal Type
              </label>
              <input
                type="text"
                className="input"
                value={animalType}
                onChange={(e) => setAnimalType(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Preferred Food / Special Notes
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Fresh water bowl refill, Pedigree gravy & rice"
              value={preferredFood}
              onChange={(e) => setPreferredFood(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Spot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  Plus,
  Heart,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import RegisterAnimalModal from './RegisterAnimalModal';

interface AnimalsClientProps {
  user: UserSession | null;
}

export default function AnimalsClient({ user }: AnimalsClientProps) {
  const [animals, setAnimals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [adoptableOnly, setAdoptableOnly] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const fetchAnimals = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSpecies !== 'ALL') params.set('species', selectedSpecies);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (adoptableOnly) params.set('adoptable', 'true');
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/animals?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAnimals(data.animals || []);
      }
    } catch {
      setAnimals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnimals();
  }, [selectedSpecies, selectedStatus, adoptableOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnimals();
  };

  const speciesOptions = [
    { label: 'All Species', value: 'ALL' },
    { label: '🐕 Dogs', value: 'dog' },
    { label: '🐈 Cats', value: 'cat' },
    { label: '🐦 Birds', value: 'bird' },
    { label: '🐄 Cattle', value: 'cattle' },
  ];

  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Street / Stray', value: 'active' },
    { label: 'Rescued', value: 'rescued' },
    { label: 'Fostered', value: 'fostered' },
    { label: 'Adopted', value: 'adopted' },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* 1. Header & Register Hero */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
          border: '1px solid #A7F3D0',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  background: 'var(--brand-primary)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.04em',
                }}
              >
                REGISTRY & PASSPORTS
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              Animal Registry & Digital Passports
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '600px', lineHeight: 1.4 }}>
              Track local community animals, vaccination schedules, sterilization (ABC) history, and adoption profiles.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => {
              if (!user) {
                window.location.href = '/login';
              } else {
                setIsRegisterOpen(true);
              }
            }}
            style={{ padding: '10px 18px', fontSize: '14px', fontWeight: 700 }}
          >
            <Plus size={18} />
            <span>Register Animal</span>
          </button>
        </div>

        {/* Search & Quick Filters Bar */}
        <form onSubmit={handleSearchSubmit} className="animal-registry-search-row">
          <div className="animal-registry-input-wrap">
            <Search
              size={20}
              className="animal-registry-search-icon"
            />
            <input
              type="text"
              className="animal-registry-input"
              placeholder="Search by animal name, breed, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search animals by name, breed, or area"
            />
          </div>

          <div className="animal-registry-search-actions">
            <button type="submit" className="animal-registry-search-btn">
              Search
            </button>

            {/* Adoptable Pill Toggle */}
            <button
              type="button"
              onClick={() => setAdoptableOnly(!adoptableOnly)}
              className="animal-registry-adoptable-btn"
              style={{
                border: adoptableOnly ? '1.5px solid #EC4899' : '1px solid var(--border-subtle)',
                background: adoptableOnly ? '#FDF2F8' : 'var(--bg-card)',
                color: adoptableOnly ? '#DB2777' : 'var(--text-primary)',
              }}
              aria-pressed={adoptableOnly}
            >
              <Heart size={18} fill={adoptableOnly ? '#DB2777' : 'none'} color="#DB2777" />
              <span>Adoptable Only</span>
            </button>
          </div>
        </form>

        {/* Species & Status Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {speciesOptions.map((sp) => (
              <button
                key={sp.value}
                type="button"
                onClick={() => setSelectedSpecies(sp.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: selectedSpecies === sp.value ? 700 : 500,
                  border: 'none',
                  background: selectedSpecies === sp.value ? 'var(--brand-primary)' : 'var(--bg-card)',
                  color: selectedSpecies === sp.value ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: selectedSpecies === sp.value ? '0 2px 6px rgba(16, 185, 129, 0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  minHeight: '36px',
                  transition: 'all 0.15s ease',
                }}
              >
                {sp.label}
              </button>
            ))}
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter animals by status"
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {statusOptions.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Privacy Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '10px',
          fontSize: '12.5px',
          color: '#1E40AF',
          marginBottom: '20px',
        }}
      >
        <Info size={18} style={{ flexShrink: 0 }} />
        <span>
          <strong>Location Privacy Protection:</strong> Exact GPS coordinates of street animals are masked to shield vulnerable packs. Only approximate neighborhood areas are displayed publicly.
        </span>
      </div>

      {/* 3. Animals Grid / Loading / Empty State */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={32} className="spin" color="var(--brand-primary)" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading animal registry...</div>
        </div>
      ) : animals.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🐾</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Animals Found
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 18px auto' }}>
            No animal profiles match your current filter criteria. Be the first to register a community stray, foster pet, or rescued animal.
          </p>
          <button className="btn-primary" onClick={() => setIsRegisterOpen(true)}>
            <Plus size={16} />
            <span>Register First Animal</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '18px',
          }}
        >
          {animals.map((animal) => {
            const isSterilized = animal.medical_data?.is_sterilized;
            const vaccinations = animal.medical_data?.vaccinations || [];
            const isVaccinated = vaccinations.length > 0;
            const isAdoptable = animal.adoption_data?.is_adoptable || animal.status === 'adopted';
            const photo =
              animal.avatar_url ||
              (animal.media && animal.media[0]?.url) ||
              'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400&auto=format&fit=crop&q=80';

            return (
              <div
                key={animal.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Photo & Badges */}
                <div style={{ position: 'relative', width: '100%', height: '170px', background: '#F3F4F6' }}>
                  <img
                    src={photo}
                    alt={animal.name || 'Animal'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Status Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background:
                        animal.status === 'active'
                          ? 'rgba(16, 185, 129, 0.92)'
                          : animal.status === 'rescued'
                          ? 'rgba(59, 130, 246, 0.92)'
                          : animal.status === 'fostered'
                          ? 'rgba(245, 158, 11, 0.92)'
                          : 'rgba(107, 114, 128, 0.92)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {animal.status === 'active' ? 'Stray / Community' : animal.status}
                  </div>

                  {isAdoptable && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(236, 72, 153, 0.95)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <Heart size={12} fill="#fff" />
                      <span>Adoptable</span>
                    </div>
                  )}
                </div>

                {/* Content Details */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {animal.name || 'Unnamed Guardian'}
                    </h3>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'capitalize' }}>
                      {animal.species}
                    </span>
                  </div>

                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {animal.breed || 'Indie / Mix'} • {animal.profile_data?.approx_age || 'Adult'}
                  </div>

                  {/* Medical / Passport Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {isSterilized ? (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#059669',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={12} /> ABC Sterilized
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#DC2626',
                        }}
                      >
                        Not Neutered
                      </span>
                    )}

                    {isVaccinated && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShieldCheck size={12} /> Vaccinated
                      </span>
                    )}
                  </div>

                  {/* Territory / Area */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      marginBottom: '14px',
                      marginTop: 'auto',
                    }}
                  >
                    <MapPin size={14} color="var(--brand-primary)" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {animal.profile_data?.area_name || animal.city || 'Local Area'}
                    </span>
                  </div>

                  {/* Passport CTA */}
                  <Link
                    href={`/animals/${animal.id}`}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      textAlign: 'center',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <ShieldCheck size={16} color="var(--brand-primary)" />
                    <span>Digital Passport</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Animal Modal */}
      <RegisterAnimalModal
        user={user}
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onAnimalCreated={fetchAnimals}
      />
    </div>
  );
}

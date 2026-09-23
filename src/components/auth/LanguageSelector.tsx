'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';
import { ChevronDown, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  className?: string;
  useGlobeAsset?: boolean;
}

export default function LanguageSelector({ className = '', useGlobeAsset = true }: LanguageSelectorProps) {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === locale) || SUPPORTED_LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`feeder-language-selector-container ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="feeder-language-selector-pill"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <span className="feeder-lang-globe-icon" aria-hidden="true">
          {useGlobeAsset ? (
            <Image
              src="/assets/feeder-login/globe-icon-reference.webp"
              alt=""
              width={16}
              height={16}
              className="feeder-lang-globe-img"
            />
          ) : (
            <Globe size={15} />
          )}
        </span>
        <span className="feeder-lang-current-label">
          {locale === 'en' ? 'English' : (currentLang.nativeName || 'English')}
        </span>
        <ChevronDown size={14} className={`feeder-lang-chevron ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="feeder-language-selector-menu" role="listbox">
          <div className="feeder-language-menu-inner">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = locale === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`feeder-language-menu-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setLocale(lang.code);
                    setIsOpen(false);
                  }}
                >
                  <span className="feeder-lang-native-name">{lang.nativeName}</span>
                  {lang.name !== lang.nativeName && (
                    <span className="feeder-lang-english-name">({lang.name})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

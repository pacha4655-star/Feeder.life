'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES, Language } from '@/lib/i18n/languages';
import { Search, X, Check, Globe } from 'lucide-react';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LanguageSelectorModal({
  isOpen,
  onClose,
}: LanguageSelectorModalProps) {
  const { locale, setLocale, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredLanguages = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div
      className="feeder-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="feeder-lang-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('modal.selectLanguage')}
      >
        {/* Header */}
        <div className="feeder-lang-modal-header">
          <div className="feeder-lang-modal-title-row">
            <div className="feeder-lang-modal-icon">
              <Globe size={18} />
            </div>
            <h2 className="feeder-lang-modal-title">
              {t('modal.selectLanguage')}
            </h2>
          </div>
          <button
            type="button"
            className="feeder-lang-modal-close"
            onClick={onClose}
            aria-label={t('modal.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="feeder-lang-search-wrap">
          <Search size={16} className="feeder-lang-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="feeder-lang-search-input"
            placeholder={t('modal.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search languages"
          />
          {searchTerm && (
            <button
              type="button"
              className="feeder-lang-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Languages Grid */}
        <div className="feeder-lang-modal-body">
          {filteredLanguages.length === 0 ? (
            <div className="feeder-lang-empty">
              <p>No languages found matching &quot;{searchTerm}&quot;</p>
            </div>
          ) : (
            <div className="feeder-lang-grid" role="list">
              {filteredLanguages.map((lang: Language) => {
                const isActive =
                  locale.toLowerCase() === lang.code.toLowerCase() ||
                  locale.split('-')[0] === lang.code.split('-')[0];

                return (
                  <button
                    key={lang.code}
                    type="button"
                    className={`feeder-lang-item-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setLocale(lang.code);
                      onClose();
                    }}
                    role="listitem"
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <div className="feeder-lang-item-content">
                      <span className="feeder-lang-native-name">
                        {lang.nativeName}
                      </span>
                      <span className="feeder-lang-english-name">
                        {lang.name}
                      </span>
                    </div>
                    {isActive && (
                      <Check size={16} className="feeder-lang-check-icon" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="feeder-lang-modal-footer">
          <button
            type="button"
            className="feeder-lang-done-btn"
            onClick={onClose}
          >
            {t('modal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

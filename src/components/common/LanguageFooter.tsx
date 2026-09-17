'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES, INITIAL_FOOTER_LANGUAGE_CODES, Language } from '@/lib/i18n/languages';
import LanguageSelectorModal from './LanguageSelectorModal';
import { Plus } from 'lucide-react';

interface LanguageFooterProps {
  className?: string;
  hideLinks?: boolean;
}

export default function LanguageFooter({ className = '', hideLinks = false }: LanguageFooterProps) {
  const { locale, setLocale, t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter initial visible languages
  const initialLanguages = INITIAL_FOOTER_LANGUAGE_CODES.map((code) =>
    SUPPORTED_LANGUAGES.find((l) => l.code === code)
  ).filter(Boolean) as Language[];

  // If current selected language is not in initial list (e.g. Arabic, Spanish), show it as active in the row
  const isSelectedInInitial = initialLanguages.some((l) => l.code === locale);
  const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === locale);

  return (
    <footer className={`feeder-global-lang-footer ${className}`} aria-label="Language and navigation footer">
      <div className="feeder-footer-inner-container">
        
        {/* Row 1: Languages Selection Bar */}
        <div className="feeder-footer-lang-row" role="navigation" aria-label="Languages">
          <ul className="feeder-footer-lang-list">
            {initialLanguages.map((lang) => {
              const isActive = locale === lang.code;
              return (
                <li key={lang.code} className="feeder-footer-lang-item">
                  <button
                    type="button"
                    onClick={() => setLocale(lang.code)}
                    className={`feeder-footer-lang-btn ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {lang.nativeName}
                  </button>
                </li>
              );
            })}

            {/* If currently selected language is not in initial list, display it */}
            {!isSelectedInInitial && activeLangObj && (
              <li key={activeLangObj.code} className="feeder-footer-lang-item">
                <button
                  type="button"
                  onClick={() => setLocale(activeLangObj.code)}
                  className="feeder-footer-lang-btn active"
                  aria-current="true"
                >
                  {activeLangObj.nativeName}
                </button>
              </li>
            )}

            {/* "More languages..." Action Button */}
            <li className="feeder-footer-lang-item">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="feeder-footer-more-lang-btn"
                aria-haspopup="dialog"
                aria-expanded={isModalOpen}
                aria-label={t('footer.moreLanguages')}
              >
                <Plus size={13} className="shrink-0" />
                <span>{t('footer.moreLanguages')}</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Separator Divider */}
        <div className="feeder-footer-divider-line" aria-hidden="true" />

        {/* Row 2: Feeder Navigation Links (if not hidden) */}
        {!hideLinks && (
          <nav className="feeder-footer-nav-row" aria-label="Secondary navigation">
            <ul className="feeder-footer-nav-list">
              <li>
                <Link href="/signup" className="feeder-footer-nav-link">
                  {t('footer.signUp')}
                </Link>
              </li>
              <li>
                <Link href="/login" className="feeder-footer-nav-link">
                  {t('footer.logIn')}
                </Link>
              </li>
              <li>
                <Link href="/communities" className="feeder-footer-nav-link">
                  {t('footer.communities')}
                </Link>
              </li>
              <li>
                <Link href="/animals" className="feeder-footer-nav-link">
                  {t('footer.animals')}
                </Link>
              </li>
              <li>
                <Link href="/feeding" className="feeder-footer-nav-link">
                  {t('footer.feeding')}
                </Link>
              </li>
              <li>
                <Link href="/sos" className="feeder-footer-nav-link">
                  {t('footer.sos')}
                </Link>
              </li>
              <li>
                <Link href="/nearby" className="feeder-footer-nav-link">
                  {t('footer.nearby')}
                </Link>
              </li>
              <li>
                <Link href="/ask-feeder" className="feeder-footer-nav-link">
                  {t('footer.askFeeder')}
                </Link>
              </li>
              <li>
                <a href="#about" onClick={(e) => { e.preventDefault(); alert("Feeder.life is a social animal welfare network connecting community feeders, volunteers, and rescuers worldwide."); }} className="feeder-footer-nav-link">
                  {t('footer.about')}
                </a>
              </li>
              <li>
                <a href="#guidelines" onClick={(e) => { e.preventDefault(); alert("Feeder.life Community Guidelines: Treat all animals and fellow volunteers with compassion, verify rescue reports, and prioritize humane animal welfare."); }} className="feeder-footer-nav-link">
                  {t('footer.guidelines')}
                </a>
              </li>
              <li>
                <a href="#welfare" onClick={(e) => { e.preventDefault(); alert("Animal Welfare Standards: Ensure clean food and fresh water, promote ABC (Animal Birth Control) vaccination, and respond promptly to emergency SOS alerts."); }} className="feeder-footer-nav-link">
                  {t('footer.animalWelfare')}
                </a>
              </li>
              <li>
                <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Feeder.life Privacy Policy: Your data and location coordinates are protected and used strictly for animal rescue and community feeding coordination."); }} className="feeder-footer-nav-link">
                  {t('footer.privacy')}
                </a>
              </li>
              <li>
                <a href="#terms" onClick={(e) => { e.preventDefault(); alert("Feeder.life Terms of Service: By using Feeder.life, you agree to uphold ethical animal welfare practices and respectful community conduct."); }} className="feeder-footer-nav-link">
                  {t('footer.terms')}
                </a>
              </li>
              <li>
                <a href="#help" onClick={(e) => { e.preventDefault(); alert("Feeder Support: Email help@feeder.life for volunteer assistance, verified shelter badges, or platform queries."); }} className="feeder-footer-nav-link">
                  {t('footer.help')}
                </a>
              </li>
            </ul>
          </nav>
        )}

        {/* Row 3: Copyright */}
        <div className="feeder-footer-copyright-row">
          <p className="feeder-footer-copyright-text">
            {t('footer.copyright')}
          </p>
        </div>

      </div>

      {/* More Languages Modal */}
      <LanguageSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </footer>
  );
}

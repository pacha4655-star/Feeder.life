'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Language,
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  detectBrowserLocale,
  isRtlLocale,
} from './languages';

// Statically import core message catalogs
import en from '@/messages/en.json';
import ta from '@/messages/ta.json';
import hi from '@/messages/hi.json';
import te from '@/messages/te.json';
import kn from '@/messages/kn.json';
import ml from '@/messages/ml.json';
import bn from '@/messages/bn.json';
import ar from '@/messages/ar.json';

type MessageCatalog = Record<string, any>;

const MESSAGE_CATALOGS: Record<string, MessageCatalog> = {
  en,
  ta,
  hi,
  te,
  kn,
  ml,
  bn,
  ar,
};

interface LanguageContextType {
  locale: string;
  language: Language;
  dir: 'ltr' | 'rtl';
  setLocale: (code: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

function getInitialLocale(): string {
  if (typeof window === 'undefined') return 'en';

  // 1. Saved localStorage preference
  try {
    const saved = localStorage.getItem('feeder_locale');
    if (saved) return saved;
  } catch {}

  // 2. Cookie preference
  try {
    const match = document.cookie.match(/(?:^|;\s*)feeder_locale=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {}

  // 3. Browser detection
  try {
    return detectBrowserLocale();
  } catch {}

  // 4. Default fallback
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>('en');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Initialize on mount in browser
  useEffect(() => {
    const initial = getInitialLocale();
    setLocaleState(initial);
    setIsInitialized(true);

    const langObj = getLanguageByCode(initial);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = langObj.code;
      document.documentElement.dir = langObj.dir;
    }
  }, []);

  const currentLanguage = useMemo(() => getLanguageByCode(locale), [locale]);
  const dir = currentLanguage.dir;

  const setLocale = useCallback((code: string) => {
    const langObj = getLanguageByCode(code);
    const targetCode = langObj.code;

    setLocaleState(targetCode);

    try {
      localStorage.setItem('feeder_locale', targetCode);
    } catch {}

    try {
      document.cookie = `feeder_locale=${encodeURIComponent(targetCode)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}

    if (typeof document !== 'undefined') {
      document.documentElement.lang = targetCode;
      document.documentElement.dir = langObj.dir;
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const activeCatalog = MESSAGE_CATALOGS[locale] || MESSAGE_CATALOGS['en'];
      let val = getNestedValue(activeCatalog, key);

      // Fallback to English if translation is missing in selected locale
      if (val === undefined && locale !== 'en') {
        val = getNestedValue(MESSAGE_CATALOGS['en'], key);
      }

      if (val === undefined) {
        return key;
      }

      if (params) {
        return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
          return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        }, val);
      }

      return val;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      language: currentLanguage,
      dir,
      setLocale,
      t,
    }),
    [locale, currentLanguage, dir, setLocale, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback safe context if rendered outside provider
    const fallbackLang = getLanguageByCode('en');
    return {
      locale: 'en',
      language: fallbackLang,
      dir: 'ltr' as const,
      setLocale: () => {},
      t: (key: string) => {
        const val = getNestedValue(MESSAGE_CATALOGS['en'], key);
        return val || key;
      },
    };
  }
  return context;
}

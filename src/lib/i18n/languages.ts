export interface Language {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  isInitialVisible?: boolean;
}

export const INITIAL_FOOTER_LANGUAGE_CODES = ['en', 'ta', 'te', 'kn', 'hi', 'ml', 'bn'];

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English (US)', dir: 'ltr', isInitialVisible: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', isInitialVisible: true },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', isInitialVisible: true },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr', isInitialVisible: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', isInitialVisible: true },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr', isInitialVisible: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', isInitialVisible: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português (Brasil)', dir: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', dir: 'ltr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr' },
];

export const RTL_LOCALES = new Set(['ar', 'ur', 'fa', 'he']);

export function getLanguageByCode(code: string): Language {
  const normalized = code.toLowerCase().trim();
  const match = SUPPORTED_LANGUAGES.find(
    (l) => l.code.toLowerCase() === normalized || l.code.split('-')[0] === normalized.split('-')[0]
  );
  return match || SUPPORTED_LANGUAGES[0];
}

export function isRtlLocale(code: string): boolean {
  const lang = getLanguageByCode(code);
  return lang.dir === 'rtl';
}

export function detectBrowserLocale(): string {
  if (typeof window === 'undefined' || !navigator.language) {
    return 'en';
  }
  const browserCode = navigator.language.toLowerCase();
  
  // Direct exact match
  const exact = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === browserCode);
  if (exact) return exact.code;

  // Prefix match (e.g. "ta-IN" -> "ta", "hi-IN" -> "hi")
  const prefix = browserCode.split('-')[0];
  const matched = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === prefix);
  if (matched) return matched.code;

  return 'en';
}

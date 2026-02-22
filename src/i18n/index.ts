import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: { translation: en },
  'zh-CN': { translation: zhCN },
} as const;

export type SupportedLocale = keyof typeof SUPPORTED_LANGUAGES;

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: SUPPORTED_LANGUAGES,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already prevents XSS
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

// Helper to get browser locale
export function getBrowserLocale(): SupportedLocale {
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
}

// Helper to set locale
export function setLocale(locale: SupportedLocale) {
  i18n.changeLanguage(locale);
  localStorage.setItem('locale', locale);
}

// Helper to get saved locale
export function getSavedLocale(): SupportedLocale {
  const saved = localStorage.getItem('locale');
  if (saved && saved in SUPPORTED_LANGUAGES) {
    return saved as SupportedLocale;
  }
  return getBrowserLocale();
}

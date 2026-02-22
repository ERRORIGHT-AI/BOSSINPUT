import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores';

/**
 * Hook to use translation with locale switching
 */
export function useT() {
  const { t, i18n } = useTranslation();
  const { currentLocale, setLocale } = useAppStore();

  const changeLocale = (locale: string) => {
    setLocale(locale);
    i18n.changeLanguage(locale);
  };

  return {
    t,
    locale: currentLocale,
    changeLocale,
  };
}

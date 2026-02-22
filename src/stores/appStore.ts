import { create } from 'zustand';
import type { AppState } from '@/types';
import { getAppVersion, getOnboardingState, setOnboardingComplete } from '@/lib/tauri';

interface AppStore extends AppState {
  // Actions
  init: () => Promise<void>;
  setLocale: (locale: string) => void;
  completeOnboarding: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  isOnboardingComplete: false,
  currentLocale: 'en',
  appVersion: '0.0.0',

  init: async () => {
    try {
      const [version, onboardingState] = await Promise.all([
        getAppVersion(),
        getOnboardingState(),
      ]);

      set({
        appVersion: version,
        isOnboardingComplete: onboardingState.completed,
        currentLocale: navigator.language.startsWith('zh') ? 'zh-CN' : 'en',
      });
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  },

  setLocale: (locale: string) => {
    set({ currentLocale: locale });
    localStorage.setItem('locale', locale);
  },

  completeOnboarding: async () => {
    await setOnboardingComplete();
    set({ isOnboardingComplete: true });
  },
}));

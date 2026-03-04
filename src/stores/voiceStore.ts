import { create } from 'zustand';
import type {
  VoiceSettings,
  VoiceStatus,
  TranscriptionResult,
} from '@/types';
import {
  voiceStartRecording,
  voiceStopRecording,
  voiceGetStatus,
  voiceGetSettings,
  voiceUpdateSettings,
  voiceTestMicrophone,
  hotkeySetShortcut,
} from '@/lib/tauri';
import { DEFAULT_VOICE_SETTINGS } from '@/lib/constants';

interface VoiceStore extends VoiceSettings {
  // State
  status: VoiceStatus;
  transcriptionHistory: TranscriptionResult[];
  isRecording: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<TranscriptionResult>;
  updateSettings: (settings: Partial<VoiceSettings>) => Promise<void>;
  updateModel: (modelId: string) => void;
  testMicrophone: () => Promise<{ success: boolean; level: number }>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  // Initialize with defaults
  triggerMode: DEFAULT_VOICE_SETTINGS.triggerMode,
  voiceShortcut: DEFAULT_VOICE_SETTINGS.voiceShortcut,
  currentModel: DEFAULT_VOICE_SETTINGS.currentModel,
  language: DEFAULT_VOICE_SETTINGS.language,
  pasteMethod: DEFAULT_VOICE_SETTINGS.pasteMethod,
  autoPunctuation: DEFAULT_VOICE_SETTINGS.autoPunctuation,
  showPreview: DEFAULT_VOICE_SETTINGS.showPreview,

  // Additional state
  status: {
    state: 'idle',
    modelLoaded: false,
    lastTranscription: null,
  },
  transcriptionHistory: [],
  isRecording: false,
  error: null,

  init: async () => {
    try {
      const [settings, status] = await Promise.all([
        voiceGetSettings(),
        voiceGetStatus(),
      ]);

      set({ ...settings, status });

      // Set initial shortcut in backend
      try {
        await hotkeySetShortcut(settings.voiceShortcut);
      } catch (e) {
        console.warn('Failed to set hotkey shortcut:', e);
      }
    } catch (error) {
      console.error('Failed to initialize voice:', error);
      // Use defaults if failed
      set({ ...DEFAULT_VOICE_SETTINGS });
    }
  },

  startRecording: async () => {
    set({ error: null });
    try {
      await voiceStartRecording();
      set({ isRecording: true, status: { ...get().status, state: 'recording' } });
    } catch (error) {
      const errorMsg = `Failed to start recording: ${error}`;
      set({ error: errorMsg });
      throw new Error(errorMsg);
    }
  },

  stopRecording: async () => {
    set({ error: null });
    try {
      set({ status: { ...get().status, state: 'processing' } });
      const result = await voiceStopRecording();

      set({
        isRecording: false,
        status: {
          state: 'idle',
          modelLoaded: get().status.modelLoaded,
          lastTranscription: result.text,
        },
        transcriptionHistory: [result, ...get().transcriptionHistory.slice(0, 99)],
      });

      return result;
    } catch (error) {
      const errorMsg = `Failed to stop recording: ${error}`;
      set({ error: errorMsg, isRecording: false, status: { ...get().status, state: 'idle' } });
      throw new Error(errorMsg);
    }
  },

  updateSettings: async (settings: Partial<VoiceSettings>) => {
    set({ error: null });
    try {
      await voiceUpdateSettings(settings);
      set({ ...settings });

      // Update hotkey shortcut if changed
      if (settings.voiceShortcut) {
        try {
          await hotkeySetShortcut(settings.voiceShortcut);
        } catch (e) {
          console.warn('Failed to update hotkey shortcut:', e);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to update settings: ${error}`;
      set({ error: errorMsg });
      throw new Error(errorMsg);
    }
  },

  updateModel: (modelId: string) => {
    set({ currentModel: modelId });
  },

  testMicrophone: async () => {
    try {
      return await voiceTestMicrophone();
    } catch (error) {
      set({ error: `Microphone test failed: ${error}` });
      return { success: false, level: 0 };
    }
  },

  refreshStatus: async () => {
    try {
      const status = await voiceGetStatus();
      set({ status, isRecording: status.state === 'recording' });
    } catch (error) {
      console.error('Failed to refresh voice status:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setError: (error: string) => {
    set({ error });
  },
}));

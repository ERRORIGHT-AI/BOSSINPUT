import { create } from 'zustand';
import type {
  KeyboardConfig,
  KeyboardState,
  Layer,
  KeyMapping,
  EncoderMapping,
} from '@/types';
import {
  keyboardLoadConfig,
  keyboardSaveConfig,
  keyboardGetState,
  keyboardTestKey,
  keyboardReset,
} from '@/lib/tauri';
import { DEFAULT_LAYERS } from '@/lib/constants';

interface KeyboardStore {
  // State
  state: KeyboardState;
  config: KeyboardConfig;
  currentLayer: string;
  selectedKey: number | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshState: () => Promise<void>;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  setCurrentLayer: (layer: string) => void;
  updateKeyMapping: (keyIndex: number, keycode: string) => void;
  updateEncoderMapping: (mapping: EncoderMapping) => void;
  selectKey: (keyIndex: number | null) => void;
  addLayer: (name: string) => void;
  removeLayer: (layerId: string) => void;
  resetToDefault: () => Promise<void>;
  testKey: (keyIndex: number) => Promise<string>;
  setError: (error: string | null) => void;
}

export const useKeyboardStore = create<KeyboardStore>((set, get) => ({
  state: {
    isConnected: false,
    deviceId: null,
    firmwareVersion: '',
    productId: null,
    vendorId: null,
  },
  config: {
    layers: [...DEFAULT_LAYERS],
    keyMappings: [],
    encoderMapping: {
      rotateLeft: '',
      rotateRight: '',
      press: '',
    },
  },
  currentLayer: 'base',
  selectedKey: null,
  isLoading: false,
  error: null,

  refreshState: async () => {
    try {
      const state = await keyboardGetState();
      set({ state });
    } catch (error) {
      set({ error: `Failed to get keyboard state: ${error}` });
    }
  },

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await keyboardLoadConfig();
      set({ config, isLoading: false });
    } catch (error) {
      set({ error: `Failed to load config: ${error}`, isLoading: false });
    }
  },

  saveConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const { config } = get();
      await keyboardSaveConfig(config);
      set({ isLoading: false });
    } catch (error) {
      set({ error: `Failed to save config: ${error}`, isLoading: false });
      throw error;
    }
  },

  setCurrentLayer: (layer: string) => {
    set({ currentLayer: layer, selectedKey: null });
  },

  updateKeyMapping: (keyIndex: number, keycode: string) => {
    const { config, currentLayer } = get();
    const existingIndex = config.keyMappings.findIndex(
      (m) => m.layer === currentLayer && m.keyIndex === keyIndex
    );

    let newMappings: KeyMapping[];
    if (existingIndex >= 0) {
      newMappings = [...config.keyMappings];
      newMappings[existingIndex] = { layer: currentLayer, keyIndex, keycode };
    } else {
      newMappings = [...config.keyMappings, { layer: currentLayer, keyIndex, keycode }];
    }

    set({
      config: { ...config, keyMappings: newMappings },
    });
  },

  updateEncoderMapping: (mapping: EncoderMapping) => {
    const { config } = get();
    set({ config: { ...config, encoderMapping: mapping } });
  },

  selectKey: (keyIndex: number | null) => {
    set({ selectedKey: keyIndex });
  },

  addLayer: (name: string) => {
    const { config } = get();
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name,
      index: config.layers.length,
    };
    set({ config: { ...config, layers: [...config.layers, newLayer] } });
  },

  removeLayer: (layerId: string) => {
    const { config, currentLayer } = get();
    if (config.layers.length <= 1) {
      set({ error: 'Cannot remove the last layer' });
      return;
    }

    const newLayers = config.layers.filter((l) => l.id !== layerId);
    const newKeyMappings = config.keyMappings.filter((m) => m.layer !== layerId);

    set({
      config: { ...config, layers: newLayers, keyMappings: newKeyMappings },
      currentLayer: currentLayer === layerId ? 'base' : currentLayer,
    });
  },

  resetToDefault: async () => {
    set({ isLoading: true, error: null });
    try {
      await keyboardReset();
      await get().loadConfig();
      set({ isLoading: false });
    } catch (error) {
      set({ error: `Failed to reset: ${error}`, isLoading: false });
    }
  },

  testKey: async (keyIndex: number) => {
    try {
      return await keyboardTestKey(keyIndex);
    } catch (error) {
      set({ error: `Failed to test key: ${error}` });
      return '';
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

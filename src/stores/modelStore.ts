import { create } from 'zustand';
import type { VoiceModel } from '@/types';
import {
  modelGetList,
  modelSetActive,
  modelGetActive,
  modelDownload,
  modelCancelDownload,
  modelGetDownloadProgress,
  modelDelete,
} from '@/lib/tauri';
import { AVAILABLE_MODELS } from '@/lib/constants';
import { useVoiceStore } from './voiceStore';
import { useUIStore } from './uiStore';

interface ModelStore {
  // State
  models: VoiceModel[];
  activeModelId: string | null;
  downloadQueue: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  refreshModels: () => Promise<void>;
  setActiveModel: (modelId: string) => Promise<void>;
  downloadModel: (modelId: string) => Promise<void>;
  cancelDownload: (modelId: string) => Promise<void>;
  deleteModel: (modelId: string) => Promise<void>;
  updateModelProgress: (modelId: string, progress: number) => void;
  setError: (error: string | null) => void;
}

const initializeModels = (): VoiceModel[] => {
  return AVAILABLE_MODELS.map((model) => ({
    ...model,
    languages: [...model.languages] as string[],
    features: [...model.features] as string[],
    status: 'not-downloaded' as const,
    downloadProgress: 0,
  }));
};

export const useModelStore = create<ModelStore>((set, get) => ({
  models: initializeModels(),
  activeModelId: null,
  downloadQueue: new Set(),
  isLoading: false,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const [backendModels, activeId] = await Promise.all([
        modelGetList(),
        modelGetActive(),
      ]);

      // Merge backend status into our model list based on AVAILABLE_MODELS
      const defaultModels = initializeModels();
      const mergedModels = defaultModels.map((model) => {
        const backendMatch = backendModels.find((bm) => bm.id === model.id);
        if (backendMatch) {
          return {
            ...model,
            status: backendMatch.status || model.status,
            downloadProgress: backendMatch.downloadProgress ?? model.downloadProgress,
          };
        }
        return model;
      });

      set({
        models: mergedModels,
        activeModelId: activeId || 'parakeet-v3-cpu',
        isLoading: false,
      });
    } catch (error) {
      // If backend fails, use default models
      console.error('Failed to load models, using defaults:', error);
      set({
        models: initializeModels(),
        activeModelId: 'parakeet-v3-cpu',
        isLoading: false,
      });
    }
  },

  refreshModels: async () => {
    try {
      const models = await modelGetList();
      set({ models });
    } catch (error) {
      set({ error: `Failed to refresh models: ${error}` });
    }
  },

  setActiveModel: async (modelId: string) => {
    set({ error: null });
    try {
      await modelSetActive(modelId);

      // Get model name for display
      const model = get().models.find((m) => m.id === modelId);

      // Update local state
      set((state) => ({
        activeModelId: modelId,
        models: state.models.map((m) => ({
          ...m,
          status: m.id === modelId ? 'active' : m.status === 'active' ? 'downloaded' : m.status,
        })),
      }));

      // Sync to voiceStore (update currentModel)
      const voiceStore = useVoiceStore.getState();
      if (voiceStore.currentModel !== modelId) {
        voiceStore.updateSettings({ currentModel: modelId }).catch(console.error);
      }

      // Sync to uiStore status bar
      const uiStore = useUIStore.getState();
      uiStore.updateStatusBarInfo({
        currentModel: model?.name || modelId,
      });
    } catch (error) {
      set({ error: `Failed to set active model: ${error}` });
      throw error;
    }
  },

  downloadModel: async (modelId: string) => {
    const { models, downloadQueue } = get();

    // Check if already downloading
    if (downloadQueue.has(modelId)) {
      return;
    }

    set({
      models: models.map((m) =>
        m.id === modelId ? { ...m, status: 'downloading', downloadProgress: 0 } : m
      ),
      downloadQueue: new Set([...downloadQueue, modelId]),
    });

    try {
      // Start download in background
      modelDownload(modelId).catch(() => {
        // Handle error in catch block
      });

      // Poll for progress
      const pollProgress = setInterval(async () => {
        try {
          const progress = await modelGetDownloadProgress(modelId);
          get().updateModelProgress(modelId, progress);

          if (progress >= 100) {
            clearInterval(pollProgress);
            set((state) => {
              const newQueue = new Set(state.downloadQueue);
              newQueue.delete(modelId);
              return {
                downloadQueue: newQueue,
                models: state.models.map((m) =>
                  m.id === modelId
                    ? { ...m, status: 'downloaded', downloadProgress: 100 }
                    : m
                ),
              };
            });
          }
        } catch (error) {
          clearInterval(pollProgress);
          set((state) => {
            const newQueue = new Set(state.downloadQueue);
            newQueue.delete(modelId);
            return {
              downloadQueue: newQueue,
              models: state.models.map((m) =>
                m.id === modelId ? { ...m, status: 'error', downloadProgress: 0 } : m
              ),
            };
          });
        }
      }, 500);
    } catch (error) {
      set((state) => {
        const newQueue = new Set(state.downloadQueue);
        newQueue.delete(modelId);
        return {
          downloadQueue: newQueue,
          models: state.models.map((m) =>
            m.id === modelId ? { ...m, status: 'error', downloadProgress: 0 } : m
          ),
          error: `Failed to start download: ${error}`,
        };
      });
    }
  },

  cancelDownload: async (modelId: string) => {
    try {
      await modelCancelDownload(modelId);
      set((state) => {
        const newQueue = new Set(state.downloadQueue);
        newQueue.delete(modelId);
        return {
          downloadQueue: newQueue,
          models: state.models.map((m) =>
            m.id === modelId ? { ...m, status: 'not-downloaded', downloadProgress: 0 } : m
          ),
        };
      });
    } catch (error) {
      set({ error: `Failed to cancel download: ${error}` });
    }
  },

  deleteModel: async (modelId: string) => {
    set({ error: null });
    try {
      await modelDelete(modelId);
      set((state) => ({
        models: state.models.map((m) =>
          m.id === modelId
            ? { ...m, status: 'not-downloaded', downloadProgress: 0 }
            : m
        ),
        activeModelId: state.activeModelId === modelId ? null : state.activeModelId,
      }));
    } catch (error) {
      set({ error: `Failed to delete model: ${error}` });
    }
  },

  updateModelProgress: (modelId: string, progress: number) => {
    set((state) => ({
      models: state.models.map((m) =>
        m.id === modelId ? { ...m, downloadProgress: progress } : m
      ),
    }));
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

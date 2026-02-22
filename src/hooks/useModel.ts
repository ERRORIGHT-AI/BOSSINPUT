/**
 * Custom hook for model-related operations
 * Provides a simplified interface to the model store
 */

import { useModelStore } from '@/stores';

export function useModel() {
  const store = useModelStore();

  return {
    // State
    models: store.models,
    activeModelId: store.activeModelId,
    downloadQueue: store.downloadQueue,
    isLoading: store.isLoading,
    error: store.error,

    // Computed
    activeModel: store.models.find((m) => m.id === store.activeModelId) || null,
    downloadingModels: Array.from(store.downloadQueue),

    // Actions
    init: store.init,
    refreshModels: store.refreshModels,
    setActiveModel: store.setActiveModel,
    downloadModel: store.downloadModel,
    cancelDownload: store.cancelDownload,
    deleteModel: store.deleteModel,
    updateModelProgress: store.updateModelProgress,
    setError: store.setError,

    // Helpers
    getModelById: (modelId: string) =>
      store.models.find((m) => m.id === modelId),
    isModelDownloading: (modelId: string) =>
      store.downloadQueue.has(modelId),
    isModelActive: (modelId: string) =>
      store.activeModelId === modelId,
  };
}

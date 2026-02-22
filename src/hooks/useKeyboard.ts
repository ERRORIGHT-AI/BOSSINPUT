/**
 * Custom hook for keyboard-related operations
 * Provides a simplified interface to the keyboard store
 */

import { useKeyboardStore } from '@/stores';

export function useKeyboard() {
  const store = useKeyboardStore();

  return {
    // State
    isConnected: store.state.isConnected,
    deviceId: store.state.deviceId,
    firmwareVersion: store.state.firmwareVersion,
    layers: store.config.layers,
    keyMappings: store.config.keyMappings,
    encoderMapping: store.config.encoderMapping,
    currentLayer: store.currentLayer,
    selectedKey: store.selectedKey,
    isLoading: store.isLoading,
    error: store.error,

    // Computed
    currentLayerName: store.config.layers.find((l) => l.id === store.currentLayer)?.name || '',

    // Actions
    refreshState: store.refreshState,
    loadConfig: store.loadConfig,
    saveConfig: store.saveConfig,
    setCurrentLayer: store.setCurrentLayer,
    selectKey: store.selectKey,
    updateKeyMapping: store.updateKeyMapping,
    updateEncoderMapping: store.updateEncoderMapping,
    addLayer: store.addLayer,
    removeLayer: store.removeLayer,
    resetToDefault: store.resetToDefault,
    testKey: store.testKey,
    setError: store.setError,

    // Helpers
    getKeyMapping: (keyIndex: number) =>
      store.config.keyMappings.find((m) => m.layer === store.currentLayer && m.keyIndex === keyIndex),
    hasCustomMapping: (keyIndex: number) =>
      !!store.config.keyMappings.find((m) => m.layer === store.currentLayer && m.keyIndex === keyIndex),
  };
}

/**
 * Custom hook for voice-related operations
 * Provides a simplified interface to the voice store
 */

import { useVoiceStore } from '@/stores';

export function useVoice() {
  const store = useVoiceStore();

  return {
    // State
    triggerMode: store.triggerMode,
    voiceShortcut: store.voiceShortcut,
    currentModel: store.currentModel,
    language: store.language,
    pasteMethod: store.pasteMethod,
    autoPunctuation: store.autoPunctuation,
    showPreview: store.showPreview,
    status: store.status,
    transcriptionHistory: store.transcriptionHistory,
    isRecording: store.isRecording,
    error: store.error,

    // Actions
    init: store.init,
    startRecording: store.startRecording,
    stopRecording: store.stopRecording,
    updateSettings: store.updateSettings,
    testMicrophone: store.testMicrophone,
    refreshStatus: store.refreshStatus,
    clearError: store.clearError,
    setError: store.setError,
  };
}

/**
 * Tauri API Command Definitions
 *
 * This file defines all Tauri commands that will be called from the frontend.
 * The Rust backend must implement these commands.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  KeyboardConfig,
  KeyboardState,
  VoiceSettings,
  TranscriptionResult,
  VoiceStatus,
  VoiceModel,
  OnboardingState,
} from '@/types';

// ============================================================
// Keyboard Commands
// ============================================================

/**
 * Get the current keyboard configuration
 */
export async function keyboardGetConfig(): Promise<KeyboardConfig> {
  return invoke('keyboard_get_config');
}

/**
 * Save keyboard configuration to device
 */
export async function keyboardSaveConfig(config: KeyboardConfig): Promise<void> {
  return invoke('keyboard_save_config', { config });
}

/**
 * Load keyboard configuration from device
 */
export async function keyboardLoadConfig(): Promise<KeyboardConfig> {
  return invoke('keyboard_load_config');
}

/**
 * Get keyboard connection state
 */
export async function keyboardGetState(): Promise<KeyboardState> {
  return invoke('keyboard_get_state');
}

/**
 * Test a specific key and return its keycode
 */
export async function keyboardTestKey(keyIndex: number): Promise<string> {
  return invoke('keyboard_test_key', { keyIndex });
}

/**
 * Reset keyboard to default configuration
 */
export async function keyboardReset(): Promise<void> {
  return invoke('keyboard_reset');
}

// ============================================================
// Voice Commands
// ============================================================

/**
 * Start voice recording
 */
export async function voiceStartRecording(): Promise<void> {
  return invoke('voice_start_recording');
}

/**
 * Stop voice recording and return transcription
 */
export async function voiceStopRecording(): Promise<TranscriptionResult> {
  return invoke('voice_stop_recording');
}

/**
 * Get current voice status
 */
export async function voiceGetStatus(): Promise<VoiceStatus> {
  return invoke('voice_get_status');
}

/**
 * Get voice settings
 */
export async function voiceGetSettings(): Promise<VoiceSettings> {
  return invoke('voice_get_settings');
}

/**
 * Update voice settings
 */
export async function voiceUpdateSettings(settings: Partial<VoiceSettings>): Promise<void> {
  return invoke('voice_update_settings', { settings });
}

/**
 * Test microphone
 */
export async function voiceTestMicrophone(): Promise<{ success: boolean; level: number }> {
  return invoke('voice_test_microphone');
}

// ============================================================
// Model Commands
// ============================================================

/**
 * Get list of available and installed models
 */
export async function modelGetList(): Promise<VoiceModel[]> {
  return invoke('model_get_list');
}

/**
 * Set active model
 */
export async function modelSetActive(modelId: string): Promise<void> {
  return invoke('model_set_active', { modelId });
}

/**
 * Get currently active model
 */
export async function modelGetActive(): Promise<string | null> {
  return invoke('model_get_active');
}

/**
 * Download a model
 * Returns a promise that resolves when download completes
 * Use model_get_download_progress for progress updates
 */
export async function modelDownload(modelId: string): Promise<void> {
  return invoke('model_download', { modelId });
}

/**
 * Cancel model download
 */
export async function modelCancelDownload(modelId: string): Promise<void> {
  return invoke('model_cancel_download', { modelId });
}

/**
 * Get download progress for a model
 */
export async function modelGetDownloadProgress(modelId: string): Promise<number> {
  return invoke('model_get_download_progress', { modelId });
}

/**
 * Delete a downloaded model
 */
export async function modelDelete(modelId: string): Promise<void> {
  return invoke('model_delete', { modelId });
}

/**
 * Add a custom model from file (for future use)
 */
export async function modelAddCustom(filepath: string): Promise<VoiceModel> {
  return invoke('model_add_custom', { filepath });
}

// ============================================================
// Audio Device Commands
// ============================================================

export interface AudioDevice {
  name: string;
  isDefault: boolean;
  isSelected: boolean;
}

/**
 * List all available audio input devices
 */
export async function audioListDevices(): Promise<AudioDevice[]> {
  return invoke('audio_list_devices');
}

/**
 * Set the active audio input device by name
 */
export async function audioSetDevice(deviceName: string): Promise<void> {
  return invoke('audio_set_device', { deviceName });
}

// ============================================================
// System Commands
// ============================================================

/**
 * Open system settings for specific permission type
 */
export async function systemOpenSettings(type: 'microphone' | 'accessibility'): Promise<void> {
  return invoke('system_open_settings', { type });
}

/**
 * Get app version
 */
export async function getAppVersion(): Promise<string> {
  return invoke('get_app_version');
}

/**
 * Check if onboarding is complete
 */
export async function getOnboardingState(): Promise<OnboardingState> {
  return invoke('get_onboarding_state');
}

/**
 * Mark onboarding as complete
 */
export async function setOnboardingComplete(): Promise<void> {
  return invoke('set_onboarding_complete');
}

// ============================================================
// Event Listeners
// ============================================================

/**
 * Listen to keyboard state changes
 */
export function onKeyboardStateChange(_callback: (state: KeyboardState) => void) {
  return invoke('plugin:keyboard|on_state_change').then((unlisten) => {
    // Setup listener
    return unlisten;
  });
}

/**
 * Listen to voice state changes
 */
export function onVoiceStateChange(_callback: (status: VoiceStatus) => void) {
  return invoke('plugin:voice|on_state_change').then((unlisten) => {
    // Setup listener
    return unlisten;
  });
}

/**
 * Listen to model download progress updates
 */
export function onModelDownloadProgress(_callback: (progress: { modelId: string; progress: number }) => void) {
  return invoke('plugin:model|on_download_progress').then((unlisten) => {
    // Setup listener
    return unlisten;
  });
}

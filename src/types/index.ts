// ============================================================
// Keyboard Types
// ============================================================

export interface Layer {
  id: string;
  name: string;
  index: number;
}

export interface KeyMapping {
  layer: string;
  keyIndex: number;
  keycode: string;
  label?: string;
}

export interface EncoderMapping {
  rotateLeft: string;
  rotateRight: string;
  press: string;
  appRules?: Record<string, EncoderMapping>;
}

export interface KeyboardConfig {
  layers: Layer[];
  keyMappings: KeyMapping[];
  encoderMapping: EncoderMapping;
  metadata?: {
    version: string;
    lastModified: number;
  };
}

export interface KeyboardState {
  isConnected: boolean;
  deviceId: string | null;
  firmwareVersion: string;
  productId: number | null;
  vendorId: number | null;
}

// ============================================================
// Voice Types
// ============================================================

export type RecordingState = 'idle' | 'recording' | 'processing';
export type TriggerMode = 'toggle' | 'hold';
export type PasteMethod = 'clipboard' | 'direct';

export interface VoiceSettings {
  triggerMode: TriggerMode;
  voiceShortcut: string; // e.g., "F13"
  currentModel: string; // Model ID
  language: string; // "auto", "en", "zh-CN", etc.
  pasteMethod: PasteMethod;
  autoPunctuation: boolean;
  showPreview: boolean;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  timestamp: number;
}

export interface VoiceStatus {
  state: RecordingState;
  modelLoaded: boolean;
  lastTranscription: string | null;
}

// ============================================================
// Model Types
// ============================================================

export type ModelType = 'cpu' | 'gpu';
export type ModelStatus = 'active' | 'downloaded' | 'downloading' | 'not-downloaded' | 'error';

export interface VoiceModel {
  id: string;
  name: string;
  size: number; // in bytes
  type: ModelType;
  languages: string[];
  speed: number; // realtime multiplier, e.g., 5 for 5x realtime
  status: ModelStatus;
  downloadProgress: number; // 0-100
  features: string[];
  url?: string; // download URL
}

export interface ModelInfo {
  id: string;
  name: string;
  sizeBytes: number;
  type: ModelType;
  languages: string[];
  speedMultiplier: number;
  version: string;
}

// ============================================================
// UI Types
// ============================================================

export type Page = 'keyboard' | 'voice' | 'models' | 'logs' | 'settings';
export type ModalType = 'none' | 'add-key' | 'import' | 'export' | 'custom-model' | 'error';
export type Theme = 'dark' | 'light';

export interface StatusBarInfo {
  status: 'ready' | 'recording' | 'processing' | 'error';
  keyboardConnected: boolean;
  currentModel: string | null;
  voiceShortcut: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// ============================================================
// Onboarding Types
// ============================================================

export type OnboardingStep = 'welcome' | 'connect-keyboard' | 'download-model' | 'permissions' | 'test' | 'complete';

export interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  keyboardConnected: boolean;
  modelDownloaded: boolean;
  permissionsGranted: {
    microphone: boolean;
    accessibility: boolean;
  };
}

// ============================================================
// App State Types
// ============================================================

export interface AppState {
  isOnboardingComplete: boolean;
  currentLocale: string;
  appVersion: string;
}

// ============================================================
// Log Types
// ============================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  source?: string;
}

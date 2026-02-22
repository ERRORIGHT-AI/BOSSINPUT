/**
 * Application Constants
 */

// ============================================================
// Keyboard Constants
// ============================================================

export const DEFAULT_LAYERS = [
  { id: 'base', name: 'Base', index: 0 },
  { id: 'layer1', name: 'Layer 1', index: 1 },
  { id: 'layer2', name: 'Layer 2', index: 2 },
] as const;

export const KEYCODES = [
  // Letters
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  // Numbers
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  // Symbols
  'space', 'enter', 'tab', 'backspace', 'escape', 'delete',
  'minus', 'equal', 'bracket_left', 'bracket_right', 'backslash',
  'semicolon', 'quote', 'comma', 'period', 'slash',
  // Modifiers
  'lctrl', 'lshift', 'lalt', 'lmeta', 'rctrl', 'rshift', 'ralt', 'rmeta',
  // Function keys
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13', 'f14', 'f15', 'f16', 'f17', 'f18', 'f19', 'f20', 'f21', 'f22', 'f23', 'f24',
  // Special
  'print_screen', 'scroll_lock', 'pause', 'insert', 'home', 'page_up', 'delete_forward', 'end', 'page_down',
  // Arrows
  'up', 'down', 'left', 'right',
  // Media
  'audio_mute', 'audio_vol_down', 'audio_vol_up', 'media_play_pause', 'media_next', 'media_prev',
  // Voice key (reserved)
  'voice',
] as const;

export type KeyCode = typeof KEYCODES[number];

// ============================================================
// Voice Constants
// ============================================================

export const DEFAULT_VOICE_SETTINGS = {
  triggerMode: 'toggle' as const,
  voiceShortcut: 'F13',
  currentModel: 'parakeet-v3-cpu',
  language: 'auto',
  pasteMethod: 'clipboard' as const,
  autoPunctuation: true,
  showPreview: true,
} as const;

export const SUPPORTED_LANGUAGES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
] as const;

export const TRIGGER_MODES = [
  { value: 'toggle', label: 'Toggle Mode', description: 'Press once to start, again to stop' },
  { value: 'hold', label: 'Hold to Talk', description: 'Hold key to record, release to stop' },
] as const;

// ============================================================
// Model Constants
// ============================================================

export const AVAILABLE_MODELS = [
  {
    id: 'parakeet-v3-cpu',
    name: 'Parakeet V3 (CPU)',
    size: 478 * 1024 * 1024, // ~478 MB
    type: 'cpu' as const,
    languages: ['auto', 'en', 'zh-CN', 'zh-TW', 'ja', 'ko'],
    speed: 5,
    features: ['Auto-detect', 'CPU Optimized', 'x5 Realtime'],
    url: 'https://blob.handy.computer/parakeet-tdt-0.6b-v3-int8.tar.gz',
  },
  {
    id: 'parakeet-v2-cpu',
    name: 'Parakeet V2 (CPU)',
    size: 473 * 1024 * 1024, // ~473 MB
    type: 'cpu' as const,
    languages: ['auto', 'en', 'zh-CN'],
    speed: 4,
    features: ['Auto-detect', 'CPU Optimized', 'x4 Realtime'],
  },
  {
    id: 'whisper-small-gpu',
    name: 'Whisper Small (GPU)',
    size: 487 * 1024 * 1024, // ~487 MB
    type: 'gpu' as const,
    languages: ['en', 'zh-CN', 'es', 'fr', 'de', 'ja', 'ko'],
    speed: 10,
    features: ['Multi-language', 'GPU Required', 'x10 Realtime'],
  },
] as const;

// ============================================================
// UI Constants
// ============================================================

export const PAGES = [
  { id: 'keyboard', label: 'Keyboard', icon: '⌨️' },
  { id: 'voice', label: 'Voice Settings', icon: '🎤' },
  { id: 'models', label: 'Models', icon: '🧠' },
  { id: 'logs', label: 'Logs', icon: '📋' },
] as const;

export const STATUS_COLORS = {
  ready: '#4ec9b0',
  recording: '#f48771',
  processing: '#dcdcaa',
  error: '#f48771',
  disconnected: '#858585',
} as const;

// ============================================================
// App Constants
// ============================================================

export const APP_NAME = 'BOSSINPUT';
export const APP_VERSION = '0.1.0';

export const SUPPORTED_LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
] as const;

// ============================================================
// File Paths
// ============================================================

export const CONFIG_DIR = 'config';
export const LOGS_DIR = 'logs';
export const MODELS_DIR = 'models';

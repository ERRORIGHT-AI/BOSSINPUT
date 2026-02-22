# BOSSINPUT Frontend Design Document

**Version**: 1.0
**Date**: 2025-02-21
**Language**: English (default), supports i18n

---

## Table of Contents

1. [Design Overview](#1-design-overview)
2. [Layout & Navigation](#2-layout--navigation)
3. [Pages](#3-pages)
4. [Components](#4-components)
5. [State Management](#5-state-management)
6. [i18n](#6-i18n)
7. [Design Tokens](#7-design-tokens)

---

## 1. Design Overview

### 1.1 Design Philosophy

- **IDE-inspired**: Dark theme, compact layout, high information density
- **Developer-focused**: Efficient workflows, clear status feedback
- **Minimal friction**: Quick access to core features
- **System-native feel**: Respects platform conventions while maintaining consistency

### 1.2 Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| Zustand | State Management |
| React Router | Navigation |
| Tauri | Desktop Bridge |

---

## 2. Layout & Navigation

### 2.1 Main Window Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  BOSSINPUT                    □  -  ▀                   ⚙️  ?   │  ← Title Bar
├──────┬──────────────────────────────────────────────────────────┤
│      │                                                           │
│ Nav  │  Main Content Area                                       │
│ Bar  │  (Current Page)                                          │
│      │                                                           │
│      │                                                           │
│      │                                                           │
├──────┴──────────────────────────────────────────────────────────┤
│  ● Ready │ F13: Voice │ Model: Parakeet V3 │ Keyboard: ●        │  ← Status Bar
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Window Specifications

| Property | Value |
|----------|-------|
| Default Size | 1000 × 650 px |
| Minimum Size | 800 × 500 px |
| Resizable | Yes |
| Fullscreen | Supported |

### 2.3 Sidebar Navigation

| Item | Route | i18n Key |
|------|-------|----------|
| Keyboard | `/keyboard` | `nav.keyboard` |
| Voice Settings | `/voice` | `nav.voice` |
| Models | `/models` | `nav.models` |
| Logs | `/logs` | `nav.logs` |

### 2.4 Status Bar

| Section | Content | Description |
|---------|---------|-------------|
| Status | ● Ready | Current app state with color indicator |
| Shortcut | F13: Voice | Current voice trigger shortcut |
| Model | Model: Parakeet V3 | Active STT model |
| Keyboard | Keyboard: ● | Connection status |

**Status States:**

| State | Icon | Color | Description |
|-------|------|-------|-------------|
| Ready | ● | `#4ec9b0` | Ready to record |
| Recording | 🔴 | `#f48771` | Currently recording |
| Processing | ⏳ | `#dcdcaa` | Transcribing |
| Error | ⚠️ | `#f48771` | Error occurred |
| Disconnected | ○ | `#858585` | Keyboard disconnected |

---

## 3. Pages

### 3.1 Keyboard Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│  Keyboard Configuration                   Layer: [Base     ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  KEY MAPPINGS                                            │   │
│   │                                                         │   │
│   │  ┌─────────────────────────────────────────────────┐    │   │
│   │  │  ┌───┬───┬───┐                                │    │   │
│   │  │  │ 1 │ 2 │ 3 │    ┌── Key Config ──────────┐   │    │   │
│   │  │  ├───┼───┼───┤    │                         │   │    │   │
│   │  │  │ 4 │ 5 │ 6 │    │ Keycode:                │   │    │   │
│   │  │  ├───┼───┼───┤    │ [space              ▼]  │   │    │   │
│   │  │  │ 7 │ 8 │🎤 │    │                         │   │    │   │
│   │  │  └───┴───┴───┘    │ Layer:                  │   │    │   │
│   │  │       🎛️          │ [Base              ▼]  │   │    │   │
│   │  │  Selected: Key 5  │                         │   │    │   │
│   │  └───────────────────│ [Reset] [Apply]        │   │    │   │
│   │                      └─────────────────────────┘   │    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  LAYERS                                                 │   │
│   │                                                         │   │
│   │  [● Base]  [○ Layer 1]  [○ Layer 2]  [+ Add Layer]    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  ACTIONS                                                │   │
│   │                                                         │   │
│   │  [Import Config...]  [Export Config...]  [Reset All]  │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Interactions:**
- Click key: Select and show config panel
- Drag key: Swap mappings
- Right-click: Context menu (copy, paste, reset)
- Hover: Show keycode tooltip

**Key States:**

| State | Style |
|-------|-------|
| Default | Bg: `#333`, Text: White |
| Hovered | Border: `#007acc` |
| Selected | Bg: `#37373d`, Border: `#007acc` |
| Customized | Dot indicator: `#4ec9b0` |
| Voice Key | Icon 🎤 with glow |

### 3.2 Voice Settings

```
┌─────────────────────────────────────────────────────────────────┐
│  Voice Settings                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  TRANSCRIPTION                                          │    │
│  │                                                         │    │
│  │  Trigger Mode     [Toggle Mode                   ▼]    │    │
│  │                   (Press once to start, again to stop) │    │
│  │                                                         │    │
│  │  Voice Shortcut   [F13                           ]     │    │
│  │                   (Global shortcut to start recording)│    │
│  │                                                         │    │
│  │  Current Model    [Parakeet V3 (CPU)             ▼]    │    │
│  │                   Status: Ready ●                     │    │
│  │                                                         │    │
│  │  Language        [Auto-detect                   ▼]    │    │
│  │                   (Detects Chinese/English automatically)│   │
│  │                                                         │    │
│  │  [Test Recording]  (Press Voice Key or click to test)  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  OUTPUT                                                 │    │
│  │                                                         │    │
│  │  Paste Method     [Clipboard                    ▼]    │    │
│  │                   (Most compatible across apps)        │    │
│  │                                                         │    │
│  │  Auto-punctuation [✓]                                  │    │
│  │                   (Add punctuation automatically)       │    │
│  │                                                         │    │
│  │  Show preview     [✓]                                  │    │
│  │                   (Brief flash of transcribed text)     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Models

```
┌─────────────────────────────────────────────────────────────────┐
│  Models                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ACTIVE MODEL                                           │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  Parakeet V3 (CPU)                        ●     │    │    │
│  │  │  ~478 MB • Auto-detect • x5 Realtime          │    │    │
│  │  │  Last used: Just now                            │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  [Reload Model]  [Unload]                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AVAILABLE MODELS                                       │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  Whisper Small (GPU)                     ○     │    │    │
│  │  │  ~487 MB • Multi-language • GPU Required       │    │    │
│  │  │  Status: Not downloaded    [Download 487 MB]   │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │  [+ Add Custom Model]  (Coming soon)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Model Card States:**

| Status | Visual | Actions |
|--------|--------|---------|
| Active | Blue border ● | Reload, Unload |
| Downloaded | Gray border ○ | Load, Delete |
| Not Downloaded | Dashed border | Download |
| Downloading | Progress bar | Pause, Cancel |
| Error | Red border ⚠️ | Retry |

### 3.4 Onboarding Flow

**Step 1/4: Connect Keyboard**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1 of 4                              Skip →                 │
│  ━━━━░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                                                  │
│  Connect Your Keyboard                                           │
│                                                                  │
│  Use a USB-C cable to connect your BOSSINPUT keypad              │
│                                                                  │
│              ⟳ Detecting keyboard...                            │
│                  ✓ Keyboard detected!                          │
│                                                                  │
│                                          [← Back]  [Next →]     │
└─────────────────────────────────────────────────────────────────┘
```

**Step 2/4: Download Voice Model**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 2 of 4                              Skip →                 │
│  ░░░░━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                  │
│  Download Voice Model                                           │
│                                                                  │
│  ████████████░░░░░░░░░░░░░░░░ 65% • ~2 min remaining            │
│                                                                  │
│                                          [← Back]  [Next →]     │
└─────────────────────────────────────────────────────────────────┘
```

**Step 3/4: Grant Permissions**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 3 of 4                              Skip →                 │
│  ░░░░░░░░░━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                  │
│  System Permissions                                             │
│                                                                  │
│  🎤 Microphone          [Open System Settings]                  │
│  ♿ Accessibility       [Open System Settings]                  │
│                                                                  │
│  ✓ Microphone granted    ○ Accessibility needed                │
│                                                                  │
│                                          [← Back]  [Next →]     │
└─────────────────────────────────────────────────────────────────┘
```

**Step 4/4: Test Voice Key**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 4 of 4                                                     │
│  ░░░░░░░░░░░░━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                  │
│  Test Voice Key                                                  │
│                                                                  │
│         ┌─────────────────┐                                     │
│         │   [🎤]          │                                     │
│         │   Test Record   │                                     │
│         └─────────────────┘                                     │
│                                                                  │
│  Your voice: "Hello World"                                      │
│  ✓ Test successful!                                             │
│                                                                  │
│                                          [← Back]  [Finish]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Components

### 4.1 Recording Float Window

**Recording State:**
```
┌──────────────────────────────────────────┐
│         🔴 Recording...                  │
│         00:03 ━━━━━━━━━━━━━━━            │
│            [■ Stop & Transcribe]         │
└──────────────────────────────────────────┘
```

**Processing State:**
```
┌──────────────────────────────────────────┐
│         ⏳ Processing...                 │
│              (waveform animation)         │
└──────────────────────────────────────────┘
```

**Preview (2-3s flash):**
```
┌──────────────────────────────────────────┐
│         ✓ Transcribed                   │
│      "Hello World, this is a test"      │
└──────────────────────────────────────────┘
```

**Specifications:**
| Property | Value |
|----------|-------|
| Size | 280 × 140 px |
| Background | `rgba(30, 30, 30, 0.95)` |
| Border Radius | 12 px |
| Border | `1px solid rgba(255,255,255,0.1)` |
| Shadow | `0 8px 32px rgba(0,0,0,0.4)` |
| Position | Bottom center, 80px from bottom |
| Show Animation | Fade in + slide up, 200ms |
| Hide Animation | Fade out, 150ms |

### 4.2 Modal Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│  [Title]                                         [×]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Content]                                                      │
│                                                                  │
│  [Cancel]                                    [Primary Action]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Toast Notification

```
┌──────────────────────────────────────────┐
│  ✓ Configuration saved successfully     │
└──────────────────────────────────────────┘
```

| Variant | Icon | Color |
|---------|------|-------|
| Success | ✓ | `#4ec9b0` |
| Error | ⚠️ | `#f48771` |
| Info | ℹ️ | `#007acc` |
| Warning | ⚠️ | `#dcdcaa` |

---

## 5. State Management

### 5.1 Store Structure

```
src/stores/
├── index.ts
├── appStore.ts
├── keyboardStore.ts
├── voiceStore.ts
├── modelStore.ts
└── uiStore.ts
```

### 5.2 Store Definitions

**appStore.ts**
```typescript
interface AppState {
  isOnboardingComplete: boolean;
  currentLocale: string;
  appVersion: string;

  setOnboardingComplete: (complete: boolean) => void;
  setLocale: (locale: string) => void;
}
```

**keyboardStore.ts**
```typescript
interface KeyMapping {
  layer: string;
  keyIndex: number;
  keycode: string;
  label?: string;
}

interface KeyboardState {
  isConnected: boolean;
  deviceId: string | null;
  layers: string[];
  currentLayer: string;
  keyMappings: KeyMapping[];

  setCurrentLayer: (layer: string) => void;
  updateKeyMapping: (keyIndex: number, keycode: string) => void;
  saveToKeyboard: () => Promise<void>;
  loadFromKeyboard: () => Promise<void>;
}
```

**voiceStore.ts**
```typescript
type RecordingState = 'idle' | 'recording' | 'processing';
type TriggerMode = 'toggle' | 'hold';

interface VoiceState {
  recordingState: RecordingState;
  triggerMode: TriggerMode;
  voiceShortcut: string;
  currentModel: string;
  language: string;
  pasteMethod: 'clipboard' | 'direct';
  autoPunctuation: boolean;
  showPreview: boolean;
  lastTranscription: string;

  startRecording: () => void;
  stopRecording: () => Promise<string>;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
}
```

**modelStore.ts**
```typescript
type ModelStatus = 'active' | 'downloaded' | 'downloading' | 'not-downloaded' | 'error';

interface VoiceModel {
  id: string;
  name: string;
  size: number;
  type: 'cpu' | 'gpu';
  languages: string[];
  speed: number;
  status: ModelStatus;
  downloadProgress: number;
}

interface ModelState {
  availableModels: VoiceModel[];
  activeModelId: string | null;
  downloadQueue: string[];

  setActiveModel: (modelId: string) => Promise<void>;
  downloadModel: (modelId: string) => Promise<void>;
  cancelDownload: (modelId: string) => void;
  deleteModel: (modelId: string) => Promise<void>;
}
```

**uiStore.ts**
```typescript
type Page = 'keyboard' | 'voice' | 'models' | 'logs' | 'settings';
type Modal = 'none' | 'add-key' | 'import' | 'export';

interface UIState {
  currentPage: Page;
  sidebarCollapsed: boolean;
  activeModal: Modal;
  showStatusBar: boolean;
  theme: 'dark' | 'light';

  setCurrentPage: (page: Page) => void;
  toggleSidebar: () => void;
  openModal: (modal: Modal) => void;
  closeModal: () => void;
}
```

### 5.3 Usage Example

```tsx
import { useVoiceStore } from '@/stores/voiceStore';

function VoiceSettings() {
  const {
    recordingState,
    startRecording,
    stopRecording
  } = useVoiceStore();

  const isRecording = recordingState === 'recording';

  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? 'Stop' : 'Start'}
    </button>
  );
}
```

---

## 6. i18n

### 6.1 Locale Files

```
src/i18n/
├── locales/
│   ├── en.json
│   └── zh-CN.json
├── config.ts
└── hook.ts
```

### 6.2 Translation Keys

| Key | English | 中文 (zh-CN) |
|-----|---------|-------------|
| `nav.keyboard` | Keyboard | 键盘配置 |
| `nav.voice` | Voice Settings | 语音设置 |
| `nav.models` | Models | 模型管理 |
| `nav.logs` | Logs | 日志 |
| `voice.triggerMode` | Trigger Mode | 触发模式 |
| `voice.mode.toggle` | Toggle Mode | 开关模式 |
| `voice.shortcut` | Voice Shortcut | 语音快捷键 |
| `voice.model` | Current Model | 当前模型 |
| `voice.language` | Language | 语言 |
| `voice.testMic` | Test Recording | 测试录音 |

### 6.3 Usage

```tsx
import { useTranslation } from '@/i18n/hook';

function Component() {
  const { t } = useTranslation();
  return <label>{t('voice.triggerMode')}</label>;
}
```

---

## 7. Design Tokens

### 7.1 Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#1e1e1e` | Main background |
| `--bg-secondary` | `#252526` | Secondary background |
| `--bg-sidebar` | `#1a1a1a` | Sidebar background |
| `--bg-hover` | `#2a2d2e` | Hover state |
| `--bg-selected` | `#37373d` | Selected state |
| `--border-default` | `#333333` | Borders |
| `--text-primary` | `#cccccc` | Primary text |
| `--text-secondary` | `#858585` | Secondary text |
| `--color-accent` | `#007acc` | Accent color |
| `--color-success` | `#4ec9b0` | Success state |
| `--color-warning` | `#dcdcaa` | Warning state |
| `--color-error` | `#f48771` | Error state |

### 7.2 Typography

| Token | Value |
|-------|-------|
| `--font-family` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| `--font-size-xs` | `11px` |
| `--font-size-sm` | `12px` |
| `--font-size-base` | `14px` |
| `--font-size-md` | `16px` |
| `--font-size-lg` | `18px` |
| `--font-size-xl` | `24px` |

### 7.3 Spacing

| Token | Value |
|-------|-------|
| `--spacing-xs` | `4px` |
| `--spacing-sm` | `8px` |
| `--spacing-md` | `16px` |
| `--spacing-lg` | `24px` |
| `--spacing-xl` | `32px` |

### 7.4 Border Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |

---

## Appendix

### File Structure

```
src/
├── components/          # Reusable components
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   ├── Key.tsx          # Keyboard key component
│   ├── KeyPicker.tsx    # Keycode picker
│   ├── LayerSelector.tsx
│   └── StatusBar.tsx
├── pages/               # Page components
│   ├── Keyboard.tsx
│   ├── Voice.tsx
│   ├── Models.tsx
│   ├── Logs.tsx
│   └── Onboarding.tsx
├── stores/              # Zustand stores
│   ├── index.ts
│   ├── appStore.ts
│   ├── keyboardStore.ts
│   ├── voiceStore.ts
│   ├── modelStore.ts
│   └── uiStore.ts
├── i18n/                # Internationalization
│   ├── locales/
│   │   ├── en.json
│   │   └── zh-CN.json
│   ├── config.ts
│   └── hook.ts
├── hooks/               # Custom hooks
│   ├── useKeyboard.ts
│   ├── useVoice.ts
│   └── useModel.ts
├── lib/                 # Utilities
│   ├── tauri.ts         # Tauri IPC wrappers
│   └── constants.ts     # App constants
├── App.tsx
└── main.tsx
```

---

**Document Version**: 1.0
**Last Updated**: 2025-02-21

<div align="center">

# BOSSINPUT

**Voice Input Keypad Software for Developers**

[![License](https://img.shields.io/badge/License-GPL%20-blue.svg)](https://www.gnu.org/licenses/gpl-2.0)
[![Tauri](https://img.shields.io/badge/Tauri-v2.10.2-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.85-orange.svg)](https://www.rust-lang.org/)

A privacy-first voice-to-text application with custom keypad configuration, designed for developers using AI programming assistants.

</div>

---

## Features

- **Local Voice Transcription** - All processing done on-device, no cloud required
- **Multiple STT Models** - Parakeet V3 (CPU-optimized) and SenseVoice (CJK-optimized)
- **Global Hotkey Support** - Trigger recording with customizable keyboard shortcuts
- **Custom Keypad Configuration** - Vial protocol support for compatible keyboards
- **Multi-language Support** - Chinese, English, Japanese, Korean, Cantonese
- **Dark Theme** - IDE-inspired dark interface
- **Cross-Platform** - macOS, Windows, Linux support

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Zustand, React Router, i18next |
| **Backend** | Rust, Tauri v2, transcribe-rs, cpal, ONNX Runtime |
| **Build** | Vite, npm |
| **Testing** | Vitest, Testing Library |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Rust** (latest stable)
- **System Dependencies**
  - macOS: Xcode Command Line Tools
  - Windows: Microsoft Visual Studio Build Tools
  - Linux: `build-essential`, `libgtk-3-dev`, `libwebkit2gtk-4.0-dev`

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/bossinput.git
cd bossinput

# Install dependencies
npm install

# Development mode
npm run tauri dev

# Production build
npm run tauri build
```

---

## Project Structure

```
bossinput/
├── src/                          # Frontend source code
│   ├── components/           # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── i18n/                 # Internationalization
│   ├── lib/                 # Utilities and Tauri IPC
│   ├── pages/               # Page components
│   ├── stores/              # Zustand state management
│   ├── styles/              # CSS styles
│   ├── test/                # Test files
│   └── types/               # TypeScript definitions
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── audio.rs           # Audio recording (cpal)
│   │   ├── clipboard.rs       # Clipboard operations
│   │   ├── hotkey.rs          # Global hotkey management
│   │   ├── keyboard.rs        # HID keyboard communication
│   │   ├── lib.rs             # Tauri command handlers
│   │   ├── main.rs            # Entry point
│   │   └── stt.rs             # Speech-to-text engine
│   ├── icons/               # Application icons
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
│
├── docs/                          # Documentation
├── dist/                          # Build output
├── index.html                   # HTML entry point
├── package.json                 # npm configuration
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
└── tsconfig.json                # TypeScript configuration
```

---

## Usage

### Voice Recording

1. Configure your preferred STT model in **Models** page
2. Set up microphone and trigger hotkey in **Voice** page
3. Press the hotkey to start recording
4. Speak your text
5. Press the hotkey again to stop and transcribe
6. Text is automatically pasted to your active application

### Keyboard Configuration

1. Connect a Vial-compatible keyboard
2. Navigate to **Keyboard** page
3. Configure key mappings across layers
4. Save configuration to device

---

## Supported Models

| Model | Size | Languages | Speed |
|-------|------|-----------|-------|
| **Parakeet V3** | ~478MB | Multi-language | ~5x realtime |
| **SenseVoice** | ~160MB | CJK optimized | ~10x realtime |

Models are stored at:
- macOS: `~/Library/Application Support/com.bossinput.app/models/`
- Windows: `%APPDATA%/bossinput/models/`
- Linux: `~/.local/share/bossinput/models/`

---

## Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build frontend only
npm run build

# Run Tauri in development mode
npm run tauri dev

# Build production release
npm run tauri build

# Run tests
npm run test

# Run tests with UI
npm run test:ui
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  Pages   │  │Components│  │  Hooks  │  │ Stores  │       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│       │           │           │           │                 │
│       └───────────┴───────────┴───────────┘                 │
│                       │ Tauri IPC                              │
└───────────────────────┼─────────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────────┐
│                      Backend (Rust)                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  Audio   │  │   STT   │  │Keyboard │  │Hotkey  │       │
│  │ (cpal)  │  │(transcribe)│  │ (hidapi) │  │ (rdev)  │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Voice Commands

| Command | Description |
|---------|-------------|
| `voice_start_recording` | Start audio capture |
| `voice_stop_recording` | Stop and return transcription |
| `voice_test_microphone` | Test microphone level |
| `voice_update_settings` | Update voice settings |

### Model Commands

| Command | Description |
|---------|-------------|
| `model_get_list` | List available STT models |
| `model_set_active` | Load model into memory |
| `model_get_active` | Get active model ID |

### Keyboard Commands

| Command | Description |
|---------|-------------|
| `keyboard_get_config` | Get keyboard configuration |
| `keyboard_save_config` | Save configuration to device |
| `keyboard_list_devices` | List connected Vial keyboards |

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Roadmap

- [ ] Auto-updater
- [ ] More STT model support
- [ ] Custom model import
- [ ] Audio visualization
- [ ] Plugin system for extensions

---

## License

This project is licensed under the [GPL-2.0 License](LICENSE).

---

## Acknowledgments

- [Tauri](https://tauri.app/) - Desktop application framework
- [transcribe-rs](https://github.com/thewh1te Stall/transcribe-rs) - STT engine
- [Vial](https://get.vial.today/) - Keyboard firmware

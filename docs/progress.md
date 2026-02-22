# BOSSINPUT Project Development Progress

## Overview

BOSSINPUT is a voice input keypad software combining Vial keyboard management with Handy's STT (Speech-to-Text) functionality.

**Primary Goals:**
- Port Handy's STT core functionality to BOSSINPUT
- Use Parakeet V3 model for speech transcription
- Implement keyboard HID communication
- Implement clipboard management and text injection
- Create Tauri 2.0 backend application

---

## Current Status

### Completed Components

| Component | Status | Notes |
|-----------|--------|-------|
| STT Engine (transcribe-rs 0.2.5) | ✅ Complete | Parakeet V3 integration working |
| Audio Recording (cpal 0.16.0) | ✅ Complete | Microphone capture implemented |
| Keyboard HID (hidapi 2.6) | ✅ Complete | Vial protocol communication |
| Clipboard Manager (arboard 3.4) | ✅ Complete | Cross-platform clipboard |
| Model Status Detection | ✅ Complete | Checks model availability |
| Tauri Commands | ✅ Complete | All commands defined |
| Build System | ✅ Complete | Compiles without errors |

### Critical Issue

**macOS Application Crash** - Application crashes on launch

```
thread 'main' panicked at library/core/src/panicking.rs:225:5:
panic in a function that cannot unwind
[objc] a method implementation was set dynamically
```

**Location:** `tao::platform_impl::platform::app_delegate::did_finish_launching`

This is blocking all testing and development.

---

## File Structure

```
BOSSINPUT/
├── src/                          # React frontend
│   ├── components/
│   ├── pages/
│   ├── stores/
│   └── hooks/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Tauri command handlers
│   │   ├── main.rs               # Binary entry point
│   │   ├── stt.rs                # Speech-to-Text engine
│   │   ├── audio.rs              # Audio recording
│   │   ├── keyboard.rs           # HID communication
│   │   └── clipboard.rs          # Clipboard management
│   ├── Cargo.toml                # Dependencies
│   └── tauri.conf.json           # Tauri config
└── docs/
    └── progress.md               # This file
```

---

## Key Dependencies

```toml
[dependencies]
tauri = { version = "2.9", features = [] }
tauri-plugin-shell = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.40", features = ["full"] }

# Audio & STT (matching Handy)
cpal = "0.16.0"
anyhow = "1.0.95"
rubato = "0.16.2"
log = "0.4.25"
ort = "=2.0.0-rc.10"           # IMPORTANT: Must use rc.10 for compatibility
transcribe-rs = { version = "0.2.5", features = ["parakeet"] }

# Global hotkey & injection
rdev = "0.5"

# HID communication
hidapi = { version = "2.6", features = ["linux-native"] }

# Cross-platform clipboard
arboard = "3.4"

# Handy's Tauri patches for macOS compatibility
[patch.crates-io]
tauri-runtime = { git = "https://github.com/cjpais/tauri.git", branch = "handy-2.9.1" }
tauri-runtime-wry = { git = "https://github.com/cjpais/tauri.git", branch = "handy-2.9.1" }
tauri-utils = { git = "https://github.com/cjpais/tauri.git", branch = "handy-2.9.1" }
```

---

## Tauri Commands

### Voice Commands
- `voice_start_recording()` - Start audio capture
- `voice_stop_recording()` - Stop and transcribe
- `voice_test_microphone()` - Test microphone access
- `voice_get_status()` - Get recording state
- `voice_update_settings()` - Update voice settings

### Keyboard Commands
- `keyboard_get_config()` - Get keyboard configuration
- `keyboard_save_config()` - Save configuration to keyboard
- `keyboard_list_devices()` - List Vial-compatible keyboards

### Model Commands
- `model_get_list()` - List available models
- `model_download()` - Download model files
- `model_set_active()` - Load model into memory

### Clipboard Commands
- `clipboard_set_text()` - Set clipboard text
- `clipboard_get_text()` - Get clipboard text
- `clipboard_paste()` - Simulate Cmd+V / Ctrl+V

---

## macOS Crash Troubleshooting

### Attempted Fixes (All Unsuccessful)

1. **Removed objc/cocoa dependencies** - Switched clipboard.rs to use arboard
2. **Removed cdylib from crate-type** - Changed to `["staticlib", "rlib"]`
3. **Removed macos-private-api feature** - Simplified Tauri config
4. **Upgraded Tauri** - From 2.1 to 2.9
5. **Moved windows_subsystem attribute** - From lib.rs to main.rs
6. **Made HID API initialization lazy** - Defer HidApi::new() until first use
7. **Added Handy's Tauri patches** - Version mismatch prevented usage

### Error Details

```
Process:               bossinput
Path:                  /Users/bobby/Desktop/Project/BOSSINPUT/src-tauri/target/debug/bossinput.app
Identifier:            com.bossinput.app
Version:               0.1.0
Code Type:             ARM-64 (Native)
Parent Process:        zsh

Exception Type:        EXC_BAD_INSTRUCTION (SIGILL)
Exception Codes:       0x0000000000000001, 0x0000000000000000

Termination Reason:    Namespace SIGNAL, Code 4 Ill instruction: 4
Terminating Process:   exc handler type

Application Specific Information:
panic in a function that cannot unwind
[objc] a method implementation was set dynamically

Thread 0 Crashed:
0   libsystem_kernel.dylib         0x18c3f0628 __pthread_kill + 8
1   libsystem_pthread.dylib        0x18c3e97e0 pthread_kill + 288
2   libsystem_c.dylib              0x18c3410f8 abort + 168
3   core                           0x102bc8f64 panicking::panic::he824945d153e65f1
4   bossinput_app_lib              0x102b65a18 tao::platform_impl::platform::app_delegate::did_finish_launching
```

### Possible Solutions

1. **Fully apply Handy's Tauri patches** - Need matching version
2. **Check for simpler config issues** - May be environment-specific
3. **Test on different macOS version** - Rule out environment problems
4. **Compare with Handy's working config** - Use as reference

---

## Model Path

Parakeet V3 model expected at:
```
/Users/bobby/Library/Application Support/com.pais.handy/models/parakeet-tdt-0.6b-v3-int8
```

This matches Handy's model location for compatibility.

---

## Next Steps

1. **Fix macOS crash** (Highest priority)
   - Investigate Handy's Tauri patches more deeply
   - Consider using exact Handy dependencies

2. **Test end-to-end voice input** (Blocked by crash)
   - Verify audio recording works
   - Verify STT transcription
   - Verify clipboard paste

3. **Implement hotkey system** (Pending)
   - Global keyboard shortcut for voice trigger
   - Using rdev for hotkey detection

4. **Verify keyboard HID communication** (Pending)
   - Test with actual Vial-compatible keyboard
   - Implement Vial protocol read/write

---

## Build Commands

```bash
# Clean build
cd /Users/bobby/Desktop/Project/BOSSINPUT
rm -rf src-tauri/target

# Development mode
npm run tauri dev

# Release build
npm run tauri build

# Kill processes on port 1420
lsof -ti:1420 | xargs kill -9
```

---

## Notes

- The project uses Handy's patched Tauri version for macOS compatibility
- ort crate must be pinned to rc.10 for transcribe-rs compatibility
- Model files are reused from Handy's installation
- All Rust code compiles successfully - only runtime crash remains

---

*Last updated: 2025-02-22*

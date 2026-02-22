#![cfg_attr(mobile, tauri::mobile_entry_point)]

mod audio;
mod clipboard;
mod hotkey;
mod keyboard;
mod stt;

use audio::AudioManager;
use clipboard::ClipboardManager;
use hotkey::HotkeyManager;
use keyboard::KeyboardManager;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use stt::SttEngine;

// Import Manager trait for .manage() method
use tauri::Manager;

// Application state shared across Tauri commands
#[derive(Debug, Serialize, Deserialize)]
pub struct VoiceSettings {
    pub trigger_mode: String,
    pub voice_shortcut: String,
    pub current_model: String,
    pub language: String,
    pub paste_method: String,
    pub auto_punctuation: bool,
    pub show_preview: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub confidence: f32,
    pub duration_ms: u64,
}

pub struct AppState {
    audio: Mutex<AudioManager>,
    stt: Mutex<SttEngine>,
    keyboard: Mutex<KeyboardManager>,
    clipboard: Mutex<ClipboardManager>,
    hotkey: Mutex<HotkeyManager>,
}

impl AppState {
    /// Lock audio mutex, recovering from poison if a previous operation panicked
    fn audio(&self) -> std::sync::MutexGuard<'_, AudioManager> {
        self.audio.lock().unwrap_or_else(|e| {
            tracing::warn!("Audio mutex was poisoned, recovering");
            e.into_inner()
        })
    }
}

// Voice Commands

#[tauri::command]
async fn voice_start_recording(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.audio().start_recording()
}

#[tauri::command]
async fn voice_stop_recording(
    state: tauri::State<'_, AppState>,
) -> Result<TranscriptionResult, String> {
    let audio_data = state.audio().stop_recording()?;

    state
        .stt
        .lock()
        .map_err(|e| format!("STT lock error: {}", e))?
        .transcribe(&audio_data)
}

#[tauri::command]
async fn voice_test_microphone(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let result = state.audio().test_microphone()?;
    Ok(result)
}

#[tauri::command]
async fn voice_get_status(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let is_recording = state.audio().is_recording();
    let model_loaded = state
        .stt
        .lock()
        .map_err(|e| format!("STT lock error: {}", e))?
        .is_model_loaded();
    Ok(serde_json::json!({
        "state": if is_recording { "recording" } else { "idle" },
        "modelLoaded": model_loaded,
        "lastTranscription": null
    }))
}

#[tauri::command]
async fn voice_update_settings(settings: VoiceSettings) -> Result<(), String> {
    // TODO: Store settings persistently
    tracing::info!("Voice settings updated: {:?}", settings);
    Ok(())
}

// Keyboard Commands

#[tauri::command]
async fn keyboard_get_config(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    state
        .keyboard
        .lock()
        .map_err(|e| format!("Keyboard lock error: {}", e))?
        .get_config()
}

#[tauri::command]
async fn keyboard_save_config(
    config: serde_json::Value,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state
        .keyboard
        .lock()
        .map_err(|e| format!("Keyboard lock error: {}", e))?
        .save_config(config)
}

#[tauri::command]
async fn keyboard_list_devices(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    state
        .keyboard
        .lock()
        .map_err(|e| format!("Keyboard lock error: {}", e))?
        .list_devices()
}

// Model Commands

#[tauri::command]
async fn model_get_list(state: tauri::State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    // Check which engine is currently loaded
    let stt = state
        .stt
        .lock()
        .map_err(|e| format!("STT lock error: {}", e))?;
    let is_loaded = stt.is_model_loaded();
    let active_id = stt.active_model_id();
    drop(stt);

    // Helper: determine status for a model
    let status_for = |model_id: &str| -> &str {
        let downloaded = stt::SttEngine::is_model_downloaded(model_id);
        if is_loaded && active_id == model_id {
            "active"
        } else if downloaded {
            "downloaded"
        } else {
            "not-downloaded"
        }
    };

    Ok(vec![
        serde_json::json!({
            "id": "parakeet-v3-cpu",
            "name": "Parakeet V3 (CPU)",
            "size": 478 * 1024 * 1024,
            "type": "cpu",
            "languages": ["auto", "en", "zh-CN", "zh-TW", "ja", "ko"],
            "speed": 5,
            "features": ["Auto-detect", "CPU Optimized", "x5 Realtime"],
            "status": status_for("parakeet-v3-cpu"),
            "downloadProgress": 0
        }),
        serde_json::json!({
            "id": "sense-voice-int8",
            "name": "SenseVoice (CPU)",
            "size": 160 * 1024 * 1024,
            "type": "cpu",
            "languages": ["auto", "zh-CN", "zh-TW", "en", "ja", "ko", "yue"],
            "speed": 10,
            "features": ["CJK Optimized", "CPU Optimized", "x10 Realtime", "ITN"],
            "status": status_for("sense-voice-int8"),
            "downloadProgress": 0
        }),
    ])
}

#[tauri::command]
async fn model_download(_model_id: String) -> Result<(), String> {
    // TODO: Implement model download
    Ok(())
}

#[tauri::command]
async fn model_set_active(model_id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Setting active model to: {}", model_id);
    state
        .stt
        .lock()
        .map_err(|e| format!("STT lock error: {}", e))?
        .load_model_by_id(&model_id)
}

// Keyboard Additional Commands

#[tauri::command]
async fn keyboard_load_config(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    state
        .keyboard
        .lock()
        .map_err(|e| format!("Keyboard lock error: {}", e))?
        .get_config()
}

#[tauri::command]
async fn keyboard_get_state(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let kb = state
        .keyboard
        .lock()
        .map_err(|e| format!("Keyboard lock error: {}", e))?;
    let devices = kb.list_devices().unwrap_or_default();
    let is_connected = !devices.is_empty();
    Ok(serde_json::json!({
        "isConnected": is_connected,
        "deviceId": if is_connected { devices.first().and_then(|d| d.get("id")).and_then(|v| v.as_str()).map(String::from) } else { None::<String> },
        "firmwareVersion": "1.0.0",
        "productId": null,
        "vendorId": null,
    }))
}

#[tauri::command]
async fn keyboard_test_key(_key_index: u32) -> Result<String, String> {
    // TODO: Implement actual key test via HID
    Ok("KC_NO".to_string())
}

#[tauri::command]
async fn keyboard_reset(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let default_config = serde_json::json!({
        "layers": [{"id": "layer-0", "name": "Layer 0", "index": 0}],
        "keyMappings": [],
        "encoderMapping": {"rotateLeft": "KC_VOLD", "rotateRight": "KC_VOLU", "press": "KC_MUTE"},
    });
    state
        .keyboard
        .lock()
        .map_err(|e| format!("Keyboard lock error: {}", e))?
        .save_config(default_config)
}

// Voice Additional Commands

#[tauri::command]
async fn voice_get_settings() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "triggerMode": "toggle",
        "voiceShortcut": "Fn+Space",
        "currentModel": "parakeet-v3-cpu",
        "language": "auto",
        "pasteMethod": "clipboard",
        "autoPunctuation": true,
        "showPreview": true,
    }))
}

// Model Additional Commands

#[tauri::command]
async fn model_get_active(state: tauri::State<'_, AppState>) -> Result<Option<String>, String> {
    let id = state
        .stt
        .lock()
        .map_err(|e| format!("STT lock error: {}", e))?
        .active_model_id();
    Ok(Some(id))
}

#[tauri::command]
async fn model_cancel_download(_model_id: String) -> Result<(), String> {
    // TODO: Implement actual download cancellation
    Ok(())
}

#[tauri::command]
async fn model_get_download_progress(_model_id: String) -> Result<f64, String> {
    // TODO: Implement actual progress tracking
    Ok(0.0)
}

#[tauri::command]
async fn model_delete(_model_id: String) -> Result<(), String> {
    // TODO: Implement model file deletion
    Ok(())
}

// System / App Commands

#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

#[tauri::command]
async fn get_onboarding_state() -> Result<serde_json::Value, String> {
    // Check if onboarding was previously completed via a marker file
    let home = std::env::var("HOME").unwrap_or_default();
    let marker = format!("{}/.bossinput_onboarding_complete", home);
    let completed = std::path::Path::new(&marker).exists();
    Ok(serde_json::json!({
        "completed": completed,
        "currentStep": if completed { "complete" } else { "welcome" },
        "keyboardConnected": false,
        "modelDownloaded": false,
        "permissionsGranted": {
            "microphone": false,
            "accessibility": false,
        }
    }))
}

#[tauri::command]
async fn set_onboarding_complete() -> Result<(), String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let marker = format!("{}/.bossinput_onboarding_complete", home);
    std::fs::write(&marker, "1").map_err(|e| format!("Failed to write onboarding marker: {}", e))?;
    Ok(())
}

// Permission Commands

#[tauri::command]
async fn request_microphone_permission(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    // Use AVCaptureDevice.requestAccess via Swift to trigger macOS permission dialog.
    // This is required because cpal/CoreAudio alone does NOT trigger the TCC prompt,
    // especially for dev/ad-hoc signed builds.
    #[cfg(target_os = "macos")]
    {
        let swift_code = r#"
import AVFoundation
import Foundation
let semaphore = DispatchSemaphore(value: 0)
var result = false
AVCaptureDevice.requestAccess(for: .audio) { granted in
    result = granted
    semaphore.signal()
}
semaphore.wait()
print(result ? "granted" : "denied")
"#;
        let output = std::process::Command::new("swift")
            .arg("-e")
            .arg(swift_code)
            .output()
            .map_err(|e| format!("Failed to run Swift permission request: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        tracing::info!("Microphone permission request result: {}", stdout);

        if stdout == "granted" {
            // Permission granted — refresh device list
            let devices = state.audio().list_input_devices().unwrap_or_default();

            return Ok(serde_json::json!({
                "granted": true,
                "devices": devices,
            }));
        } else {
            return Ok(serde_json::json!({
                "granted": false,
                "error": "Microphone access denied. Please enable in System Settings > Privacy & Security > Microphone.",
            }));
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        // On non-macOS, try cpal directly
        let result = state.audio().request_permission();
        match result {
            Ok(info) => Ok(info),
            Err(e) => Ok(serde_json::json!({ "granted": false, "error": e })),
        }
    }
}

#[tauri::command]
async fn open_privacy_settings(setting_type: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let url = match setting_type.as_str() {
            "microphone" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
            "accessibility" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
            _ => return Err(format!("Unknown setting type: {}", setting_type)),
        };
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| format!("Failed to open system settings: {}", e))?;
    }
    Ok(())
}

// Audio Device Commands

#[tauri::command]
async fn audio_list_devices(state: tauri::State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    state.audio().list_input_devices()
}

#[tauri::command]
async fn audio_set_device(device_name: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.audio().set_input_device(device_name)
}

// Clipboard Commands

#[tauri::command]
async fn clipboard_set_text(text: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .clipboard
        .lock()
        .map_err(|e| format!("Clipboard lock error: {}", e))?
        .set_text(&text)
}

#[tauri::command]
async fn clipboard_get_text(state: tauri::State<'_, AppState>) -> Result<String, String> {
    state
        .clipboard
        .lock()
        .map_err(|e| format!("Clipboard lock error: {}", e))?
        .get_text()
}

#[tauri::command]
async fn clipboard_paste(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .clipboard
        .lock()
        .map_err(|e| format!("Clipboard lock error: {}", e))?
        .paste()
}

// Hotkey Commands

#[tauri::command]
async fn hotkey_start_listening(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .hotkey
        .lock()
        .map_err(|e| format!("Hotkey lock error: {}", e))?
        .start_listening();
    Ok(())
}

#[tauri::command]
async fn hotkey_stop_listening(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .hotkey
        .lock()
        .map_err(|e| format!("Hotkey lock error: {}", e))?
        .stop_listening();
    Ok(())
}

#[tauri::command]
async fn hotkey_set_shortcut(shortcut: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .hotkey
        .lock()
        .map_err(|e| format!("Hotkey lock error: {}", e))?
        .set_shortcut(&shortcut);
    Ok(())
}

#[tauri::command]
async fn hotkey_is_recording(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    Ok(state.hotkey.lock().map_err(|e| format!("Hotkey lock error: {}", e))?.is_recording())
}

pub fn run() {
    // Create dist directory for Tauri
    std::fs::create_dir_all("../dist").ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize app state in the setup handler, which runs after NSApp is fully initialized
            let audio = AudioManager::new().expect("Failed to initialize audio manager");
            let stt = SttEngine::new().expect("Failed to initialize STT engine");
            let keyboard = KeyboardManager::new().expect("Failed to initialize keyboard manager");
            let clipboard = ClipboardManager::new().expect("Failed to initialize clipboard manager");
            let mut hotkey = HotkeyManager::try_new().expect("Failed to initialize hotkey manager");

            // Set default shortcut and start listening
            hotkey.set_shortcut("Fn+Space");
            hotkey.start_listening();

            app.manage(AppState {
                audio: Mutex::new(audio),
                stt: Mutex::new(stt),
                keyboard: Mutex::new(keyboard),
                clipboard: Mutex::new(clipboard),
                hotkey: Mutex::new(hotkey),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            voice_start_recording,
            voice_stop_recording,
            voice_test_microphone,
            voice_get_status,
            voice_update_settings,
            voice_get_settings,
            keyboard_get_config,
            keyboard_save_config,
            keyboard_list_devices,
            keyboard_load_config,
            keyboard_get_state,
            keyboard_test_key,
            keyboard_reset,
            model_get_list,
            model_download,
            model_set_active,
            model_get_active,
            model_cancel_download,
            model_get_download_progress,
            model_delete,
            request_microphone_permission,
            open_privacy_settings,
            audio_list_devices,
            audio_set_device,
            clipboard_set_text,
            clipboard_get_text,
            clipboard_paste,
            hotkey_start_listening,
            hotkey_stop_listening,
            hotkey_set_shortcut,
            hotkey_is_recording,
            get_app_version,
            get_onboarding_state,
            set_onboarding_complete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

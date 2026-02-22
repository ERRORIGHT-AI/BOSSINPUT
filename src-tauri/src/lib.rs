#![cfg_attr(mobile, tauri::mobile_entry_point)]

mod audio;
mod clipboard;
mod keyboard;
mod stt;

use audio::AudioManager;
use clipboard::ClipboardManager;
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
}

// Voice Commands

#[tauri::command]
async fn voice_start_recording(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.audio
        .lock()
        .map_err(|e| format!("Audio lock error: {}", e))?
        .start_recording()
}

#[tauri::command]
async fn voice_stop_recording(
    state: tauri::State<'_, AppState>,
) -> Result<TranscriptionResult, String> {
    let audio_data = state
        .audio
        .lock()
        .map_err(|e| format!("Audio lock error: {}", e))?
        .stop_recording()?;

    state
        .stt
        .lock()
        .map_err(|e| format!("STT lock error: {}", e))?
        .transcribe(&audio_data)
}

#[tauri::command]
async fn voice_test_microphone(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let result = state
        .audio
        .lock()
        .map_err(|e| format!("Audio lock error: {}", e))?
        .test_microphone()?;
    Ok(result)
}

#[tauri::command]
async fn voice_get_status(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let is_recording = state
        .audio
        .lock()
        .map_err(|e| format!("Audio lock error: {}", e))?
        .is_recording();
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
    // Check if Parakeet V3 model is available on disk
    let model_path = "/Users/bobby/Library/Application Support/com.pais.handy/models/parakeet-tdt-0.6b-v3-int8";
    let model_exists = std::path::Path::new(model_path).exists();

    // Check if STT engine has model loaded
    let is_loaded = state
        .stt
        .lock()
        .map_err(|e| format!("STT lock error: {}", e))?
        .is_model_loaded();

    // Determine parakeet-v3 status using frontend-expected values
    let parakeet_status = if is_loaded {
        "active"
    } else if model_exists {
        "downloaded"
    } else {
        "not-downloaded"
    };

    // Return all 3 models matching AVAILABLE_MODELS in frontend constants
    Ok(vec![
        serde_json::json!({
            "id": "parakeet-v3-cpu",
            "name": "Parakeet V3 (CPU)",
            "size": 478 * 1024 * 1024,
            "type": "cpu",
            "languages": ["auto", "en", "zh-CN", "zh-TW", "ja", "ko"],
            "speed": 5,
            "features": ["Auto-detect", "CPU Optimized", "x5 Realtime"],
            "status": parakeet_status,
            "downloadProgress": 0
        }),
        serde_json::json!({
            "id": "parakeet-v2-cpu",
            "name": "Parakeet V2 (CPU)",
            "size": 473 * 1024 * 1024,
            "type": "cpu",
            "languages": ["auto", "en", "zh-CN"],
            "speed": 4,
            "features": ["Auto-detect", "CPU Optimized", "x4 Realtime"],
            "status": "not-downloaded",
            "downloadProgress": 0
        }),
        serde_json::json!({
            "id": "whisper-small-gpu",
            "name": "Whisper Small (GPU)",
            "size": 487 * 1024 * 1024,
            "type": "gpu",
            "languages": ["en", "zh-CN", "es", "fr", "de", "ja", "ko"],
            "speed": 10,
            "features": ["Multi-language", "GPU Required", "x10 Realtime"],
            "status": "not-downloaded",
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
async fn model_set_active(_model_id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .stt
        .lock()
        .map_err(|e| format!("STT lock error: {}", e))?
        .load_model()
        .map_err(|e| format!("Failed to load model: {}", e))?;
    Ok(())
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
        "voiceShortcut": "F13",
        "currentModel": "parakeet-v3-cpu",
        "language": "auto",
        "pasteMethod": "clipboard",
        "autoPunctuation": true,
        "showPreview": true,
    }))
}

// Model Additional Commands

#[tauri::command]
async fn model_get_active() -> Result<Option<String>, String> {
    // Always return the default model as the active selection
    // The model status (loaded/downloaded/not-downloaded) is tracked in model_get_list
    Ok(Some("parakeet-v3-cpu".to_string()))
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

// Audio Device Commands

#[tauri::command]
async fn audio_list_devices(state: tauri::State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    state
        .audio
        .lock()
        .map_err(|e| format!("Audio lock error: {}", e))?
        .list_input_devices()
}

#[tauri::command]
async fn audio_set_device(device_name: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state
        .audio
        .lock()
        .map_err(|e| format!("Audio lock error: {}", e))?
        .set_input_device(device_name)
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

            app.manage(AppState {
                audio: Mutex::new(audio),
                stt: Mutex::new(stt),
                keyboard: Mutex::new(keyboard),
                clipboard: Mutex::new(clipboard),
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
            audio_list_devices,
            audio_set_device,
            clipboard_set_text,
            clipboard_get_text,
            clipboard_paste,
            get_app_version,
            get_onboarding_state,
            set_onboarding_complete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

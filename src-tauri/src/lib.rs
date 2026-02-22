#![cfg_attr(mobile, tauri::mobile_entry_point)]

mod audio;
mod clipboard;
mod keyboard;
mod stt;

use audio::AudioManager;
use clipboard::ClipboardManager;
use keyboard::KeyboardManager;
use once_cell::sync::Lazy;
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
async fn voice_test_microphone(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    state
        .audio
        .lock()
        .map_err(|e| format!("Audio lock error: {}", e))?
        .test_microphone()
}

#[tauri::command]
async fn voice_get_status(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let is_recording = state
        .audio
        .lock()
        .map_err(|e| format!("Audio lock error: {}", e))?
        .is_recording();
    Ok(if is_recording {
        "recording".to_string()
    } else {
        "idle".to_string()
    })
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
    // Check if Parakeet model is available
    let model_path = "/Users/bobby/Library/Application Support/com.pais.handy/models/parakeet-tdt-0.6b-v3-int8";
    let model_exists = std::path::Path::new(model_path).exists();

    // Check if STT engine has model loaded
    let is_loaded = state
        .stt
        .lock()
        .map_err(|e| format!("STT lock error: {}", e))?
        .is_model_loaded();

    Ok(vec![serde_json::json!({
        "id": "parakeet-v3-cpu",
        "name": "Parakeet V3 (CPU)",
        "size": 478 * 1024 * 1024,
        "type": "cpu",
        "languages": ["auto", "en", "zh-CN", "zh-TW", "ja", "ko"],
        "speed": 5,
        "features": ["Auto-detect", "CPU Optimized", "x5 Realtime"],
        "status": if is_loaded { "loaded" } else if model_exists { "ready" } else { "not-downloaded" }
    })])
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

    let mut builder = tauri::Builder::default();

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
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
            keyboard_get_config,
            keyboard_save_config,
            keyboard_list_devices,
            model_get_list,
            model_download,
            model_set_active,
            clipboard_set_text,
            clipboard_get_text,
            clipboard_paste,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

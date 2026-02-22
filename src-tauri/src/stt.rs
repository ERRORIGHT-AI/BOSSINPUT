//! Speech-to-Text transcription module
//! Supports multiple engines: Parakeet (auto-detect) and SenseVoice (CJK-optimized)

use crate::TranscriptionResult;
use anyhow::Result;
use std::path::PathBuf;
use std::sync::Mutex;
use transcribe_rs::TranscriptionEngine;
use transcribe_rs::engines::parakeet::{
    ParakeetEngine, ParakeetInferenceParams, ParakeetModelParams, TimestampGranularity,
};
use transcribe_rs::engines::sense_voice::{
    Language as SenseVoiceLanguage, SenseVoiceEngine, SenseVoiceInferenceParams,
    SenseVoiceModelParams,
};

/// Engine type identifier — matches frontend model IDs
#[derive(Debug, Clone, PartialEq)]
pub enum EngineType {
    Parakeet,
    SenseVoice,
}

/// Loaded engine variant
enum LoadedEngine {
    Parakeet(ParakeetEngine),
    SenseVoice(SenseVoiceEngine),
}

/// Known model definitions with their paths and engine types
struct ModelDef {
    engine_type: EngineType,
    dir_name: &'static str,
}

/// Map frontend model IDs to engine type + directory name
fn model_def(model_id: &str) -> Option<ModelDef> {
    match model_id {
        "parakeet-v3-cpu" => Some(ModelDef {
            engine_type: EngineType::Parakeet,
            dir_name: "parakeet-tdt-0.6b-v3-int8",
        }),
        "sense-voice-int8" => Some(ModelDef {
            engine_type: EngineType::SenseVoice,
            dir_name: "sense-voice-int8",
        }),
        _ => None,
    }
}

/// Base directory where models are stored
fn models_base_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    // Share model directory with Handy
    PathBuf::from(format!(
        "{}/Library/Application Support/com.pais.handy/models",
        home
    ))
}

pub struct SttEngine {
    engine: Mutex<Option<LoadedEngine>>,
    active_model_id: Mutex<String>,
    language: Mutex<String>,
}

impl SttEngine {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            engine: Mutex::new(None),
            active_model_id: Mutex::new("parakeet-v3-cpu".to_string()),
            language: Mutex::new("auto".to_string()),
        })
    }

    /// Get the model path for a given model ID
    pub fn model_path(model_id: &str) -> Option<PathBuf> {
        model_def(model_id).map(|def| models_base_dir().join(def.dir_name))
    }

    /// Check if model files exist on disk
    pub fn is_model_downloaded(model_id: &str) -> bool {
        Self::model_path(model_id)
            .map(|p| p.exists())
            .unwrap_or(false)
    }

    /// Load a specific model by ID
    pub fn load_model_by_id(&self, model_id: &str) -> Result<(), String> {
        let def = model_def(model_id)
            .ok_or_else(|| format!("Unknown model: {}", model_id))?;

        let path = models_base_dir().join(def.dir_name);
        if !path.exists() {
            return Err(format!(
                "Model '{}' not found at: {}",
                model_id,
                path.display()
            ));
        }

        let loaded = match def.engine_type {
            EngineType::Parakeet => {
                let mut engine = ParakeetEngine::new();
                engine
                    .load_model_with_params(&path, ParakeetModelParams::int8())
                    .map_err(|e| format!("Failed to load Parakeet model: {}", e))?;
                tracing::info!("Parakeet model loaded from: {}", path.display());
                LoadedEngine::Parakeet(engine)
            }
            EngineType::SenseVoice => {
                let mut engine = SenseVoiceEngine::new();
                engine
                    .load_model_with_params(&path, SenseVoiceModelParams::int8())
                    .map_err(|e| format!("Failed to load SenseVoice model: {}", e))?;
                tracing::info!("SenseVoice model loaded from: {}", path.display());
                LoadedEngine::SenseVoice(engine)
            }
        };

        *self.engine.lock().unwrap() = Some(loaded);
        *self.active_model_id.lock().unwrap() = model_id.to_string();
        Ok(())
    }

    /// Legacy load — loads whatever active_model_id is set
    pub fn load_model(&self) -> Result<(), String> {
        let model_id = self.active_model_id.lock().unwrap().clone();
        self.load_model_by_id(&model_id)
    }

    /// Set the language for transcription
    pub fn set_language(&self, language: &str) {
        *self.language.lock().unwrap() = language.to_string();
    }

    /// Get the currently active model ID
    pub fn active_model_id(&self) -> String {
        self.active_model_id.lock().unwrap().clone()
    }

    /// Ensure model is loaded, load if needed
    fn ensure_loaded(&self) -> Result<(), String> {
        let guard = self.engine.lock().unwrap();
        if guard.is_none() {
            drop(guard);
            self.load_model()?;
        }
        Ok(())
    }

    /// Transcribe audio data to text
    pub fn transcribe(&self, audio_data: &[f32]) -> Result<TranscriptionResult, String> {
        self.ensure_loaded()?;

        if audio_data.is_empty() {
            tracing::warn!("transcribe() called with empty audio data!");
            return Ok(TranscriptionResult {
                text: String::new(),
                confidence: 0.0,
                duration_ms: 0,
            });
        }

        let duration_ms = (audio_data.len() as f64 / 16000.0 * 1000.0) as u64;
        let language = self.language.lock().unwrap().clone();

        tracing::info!(
            "STT input: {} samples @ 16kHz = {} ms, language='{}'",
            audio_data.len(),
            duration_ms,
            language
        );

        // Log audio statistics
        let max_amp = audio_data.iter().fold(0.0f32, |a, &b| a.max(b.abs()));
        tracing::info!("STT audio max amplitude: {:.4}", max_amp);

        let mut engine_guard = self.engine.lock().unwrap();
        let engine = engine_guard
            .as_mut()
            .ok_or_else(|| "Engine not loaded".to_string())?;

        let result = match engine {
            LoadedEngine::Parakeet(parakeet) => {
                let params = ParakeetInferenceParams {
                    timestamp_granularity: TimestampGranularity::Segment,
                    ..Default::default()
                };
                parakeet
                    .transcribe_samples(audio_data.to_vec(), Some(params))
                    .map_err(|e| format!("Parakeet transcription failed: {}", e))?
            }
            LoadedEngine::SenseVoice(sv) => {
                let sv_lang = match language.as_str() {
                    "zh" | "zh-CN" | "zh-Hans" | "zh-Hant" | "zh-TW" => {
                        SenseVoiceLanguage::Chinese
                    }
                    "en" => SenseVoiceLanguage::English,
                    "ja" => SenseVoiceLanguage::Japanese,
                    "ko" => SenseVoiceLanguage::Korean,
                    "yue" => SenseVoiceLanguage::Cantonese,
                    _ => SenseVoiceLanguage::Auto,
                };
                let params = SenseVoiceInferenceParams {
                    language: sv_lang,
                    use_itn: true,
                };
                sv.transcribe_samples(audio_data.to_vec(), Some(params))
                    .map_err(|e| format!("SenseVoice transcription failed: {}", e))?
            }
        };

        tracing::info!(
            "Transcribed {} samples -> '{}' ({}ms)",
            audio_data.len(),
            result.text,
            duration_ms
        );

        Ok(TranscriptionResult {
            text: result.text,
            confidence: 0.95,
            duration_ms,
        })
    }

    /// Check if model is loaded
    pub fn is_model_loaded(&self) -> bool {
        self.engine.lock().unwrap().is_some()
    }

    /// Unload the model to free memory
    pub fn unload_model(&self) -> Result<(), String> {
        let mut guard = self.engine.lock().unwrap();
        if let Some(ref mut engine) = *guard {
            match engine {
                LoadedEngine::Parakeet(e) => e.unload_model(),
                LoadedEngine::SenseVoice(e) => e.unload_model(),
            }
            tracing::info!("Model unloaded");
        }
        *guard = None;
        Ok(())
    }
}

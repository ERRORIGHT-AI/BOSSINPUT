//! Speech-to-Text transcription module
//! Processes audio data and returns transcribed text using transcribe-rs Parakeet engine

use crate::TranscriptionResult;
use anyhow::Result;
use log::{info, warn};
use std::path::PathBuf;
use std::sync::Mutex;
use transcribe_rs::TranscriptionEngine;
use transcribe_rs::engines::parakeet::{
    ParakeetEngine, ParakeetInferenceParams, ParakeetModelParams, TimestampGranularity,
};

// Default model path pointing to Handy's models
const DEFAULT_MODEL_PATH: &str =
    "/Users/bobby/Library/Application Support/com.pais.handy/models/parakeet-tdt-0.6b-v3-int8";

pub struct SttEngine {
    engine: Mutex<Option<ParakeetEngine>>,
    model_path: PathBuf,
}

impl SttEngine {
    pub fn new() -> Result<Self, String> {
        let model_path = PathBuf::from(DEFAULT_MODEL_PATH);

        // Check if model exists
        if !model_path.exists() {
            warn!("Parakeet model not found at: {}", model_path.display());
            return Ok(Self {
                engine: Mutex::new(None),
                model_path,
            });
        }

        Ok(Self {
            engine: Mutex::new(None),
            model_path,
        })
    }

    /// Load the Parakeet V3 model
    pub fn load_model(&self) -> Result<(), String> {
        let mut engine = ParakeetEngine::new();
        engine
            .load_model_with_params(&self.model_path, ParakeetModelParams::int8())
            .map_err(|e| format!("Failed to load Parakeet model: {}", e))?;

        *self.engine.lock().unwrap() = Some(engine);
        info!("Parakeet V3 model loaded from: {}", self.model_path.display());
        Ok(())
    }

    /// Ensure model is loaded, load if needed
    fn ensure_loaded(&self) -> Result<(), String> {
        let engine_guard = self.engine.lock().unwrap();
        if engine_guard.is_none() {
            drop(engine_guard);
            self.load_model()?;
        }
        Ok(())
    }

    /// Transcribe audio data to text
    pub fn transcribe(&self, audio_data: &[f32]) -> Result<TranscriptionResult, String> {
        // Ensure model is loaded
        self.ensure_loaded()?;

        if audio_data.is_empty() {
            return Ok(TranscriptionResult {
                text: String::new(),
                confidence: 0.0,
                duration_ms: 0,
            });
        }

        // Calculate duration from sample count (16kHz)
        let duration_ms = (audio_data.len() as f64 / 16000.0 * 1000.0) as u64;

        let mut engine_guard = self.engine.lock().unwrap();
        let engine = engine_guard
            .as_mut()
            .ok_or_else(|| "Engine not loaded".to_string())?;

        // Prepare inference parameters
        let params = ParakeetInferenceParams {
            timestamp_granularity: TimestampGranularity::Segment,
            ..Default::default()
        };

        // Transcribe
        let result = engine
            .transcribe_samples(audio_data.to_vec(), Some(params))
            .map_err(|e| format!("Transcription failed: {}", e))?;

        info!(
            "Transcribed {} samples -> '{}' ({}ms)",
            audio_data.len(),
            result.text,
            duration_ms
        );

        Ok(TranscriptionResult {
            text: result.text,
            confidence: 0.95, // Parakeet doesn't provide per-word confidence
            duration_ms,
        })
    }

    /// Check if model is loaded
    pub fn is_model_loaded(&self) -> bool {
        self.engine.lock().unwrap().is_some()
    }

    /// Unload the model to free memory
    pub fn unload_model(&self) -> Result<(), String> {
        let mut engine_guard = self.engine.lock().unwrap();
        if let Some(ref mut engine) = *engine_guard {
            engine.unload_model();
            info!("Parakeet model unloaded");
        }
        *engine_guard = None;
        Ok(())
    }

    /// Set custom model path
    pub fn set_model_path(&mut self, path: PathBuf) {
        self.model_path = path;
        // Unload current model if loaded
        let _ = self.unload_model();
    }
}

//! Audio recording module using cpal
//! Captures microphone input and returns raw audio data for STT processing

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, SupportedStreamConfig};
use std::sync::Arc;
use tokio::sync::Mutex;

const SAMPLE_RATE: u32 = 16000; // 16kHz for STT
const CHANNELS: u16 = 1; // Mono

pub struct AudioManager {
    is_recording: Arc<Mutex<bool>>,
    audio_data: Arc<Mutex<Vec<f32>>>,
    selected_device: Option<String>,
}

impl AudioManager {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            is_recording: Arc::new(Mutex::new(false)),
            audio_data: Arc::new(Mutex::new(Vec::new())),
            selected_device: None,
        })
    }

    /// Get the input device — either user-selected or system default
    fn get_input_device(&self) -> Result<Device, String> {
        let host = cpal::default_host();

        if let Some(ref selected_name) = self.selected_device {
            // Try to find the user-selected device by name
            if let Ok(devices) = host.input_devices() {
                for device in devices {
                    if let Ok(name) = device.name() {
                        if name == *selected_name {
                            return Ok(device);
                        }
                    }
                }
            }
            tracing::warn!("Selected device '{}' not found, falling back to default", selected_name);
        }

        host.default_input_device()
            .ok_or_else(|| "No audio input device found".to_string())
    }

    /// Get the supported stream config for the device
    fn get_device_config(device: &Device) -> Result<SupportedStreamConfig, String> {
        device.default_input_config()
            .map_err(|e| format!("Failed to get device config: {}", e))
    }

    /// List all available audio input devices
    pub fn list_input_devices(&self) -> Result<Vec<serde_json::Value>, String> {
        let host = cpal::default_host();
        let default_device_name = host
            .default_input_device()
            .and_then(|d| d.name().ok());

        let devices = host
            .input_devices()
            .map_err(|e| format!("Failed to enumerate input devices: {}", e))?;

        let mut result = Vec::new();
        for device in devices {
            if let Ok(name) = device.name() {
                let is_default = default_device_name
                    .as_ref()
                    .map(|d| d == &name)
                    .unwrap_or(false);
                let is_selected = self.selected_device
                    .as_ref()
                    .map(|s| s == &name)
                    .unwrap_or(is_default);

                result.push(serde_json::json!({
                    "name": name,
                    "isDefault": is_default,
                    "isSelected": is_selected,
                }));
            }
        }

        Ok(result)
    }

    /// Set the active input device by name
    pub fn set_input_device(&mut self, device_name: String) -> Result<(), String> {
        // Verify the device exists
        let host = cpal::default_host();
        let devices = host
            .input_devices()
            .map_err(|e| format!("Failed to enumerate devices: {}", e))?;

        let found = devices
            .into_iter()
            .any(|d| d.name().map(|n| n == device_name).unwrap_or(false));

        if !found {
            return Err(format!("Device '{}' not found", device_name));
        }

        tracing::info!("Audio input device set to: {}", device_name);
        self.selected_device = Some(device_name);
        Ok(())
    }

    /// Start recording audio from the selected input device
    pub fn start_recording(&self) -> Result<(), String> {
        let device = self.get_input_device()?;
        let config = Self::get_device_config(&device)?;

        tracing::info!("Starting recording with config: {:?}", config);

        match config.sample_format() {
            SampleFormat::F32 => self.record_stream::<f32>(device, config.into()),
            SampleFormat::I16 => self.record_stream::<i16>(device, config.into()),
            SampleFormat::U16 => self.record_stream::<u16>(device, config.into()),
            _ => Err("Unsupported sample format".to_string()),
        }
    }

    /// Record audio stream with specified sample format
    fn record_stream<T>(&self, device: Device, config: cpal::StreamConfig) -> Result<(), String>
    where
        T: cpal::Sample + cpal::SizedSample + Into<f32>,
    {
        let is_recording = self.is_recording.clone();
        let audio_data = self.audio_data.clone();

        // Reset previous recording
        let audio_data_reset = audio_data.clone();
        tokio::spawn(async move {
            *audio_data_reset.lock().await = Vec::new();
        });

        let err_fn = move |err| {
            tracing::error!("Audio stream error: {}", err);
        };

        // Clone Arc for the closure
        let audio_data_clone = audio_data.clone();
        let stream = device.build_input_stream(
            &config,
            move |data: &[T], _: &cpal::InputCallbackInfo| {
                // Convert samples to f32 and store
                let samples: Vec<f32> = data.iter().map(|&s| s.into()).collect();

                let audio_data = audio_data_clone.clone();
                tokio::spawn(async move {
                    let mut data = audio_data.lock().await;
                    data.extend(samples);
                });
            },
            err_fn,
            None,
        ).map_err(|e| format!("Failed to build input stream: {}", e))?;

        stream.play().map_err(|e| format!("Failed to play stream: {}", e))?;

        // Set recording flag
        tokio::spawn(async move {
            *is_recording.lock().await = true;
        });

        // Keep the stream alive
        std::mem::forget(stream);

        Ok(())
    }

    /// Stop recording and return the captured audio data
    pub fn stop_recording(&self) -> Result<Vec<f32>, String> {
        tracing::info!("Stopping recording");

        let audio_data = self.audio_data.clone();
        let is_recording = self.is_recording.clone();

        let data = tokio::runtime::Handle::try_current()
            .map(|handle| {
                handle.block_on(async {
                    *is_recording.lock().await = false;
                    audio_data.lock().await.clone()
                })
            })
            .unwrap_or_default();

        Ok(data)
    }

    /// Test if microphone is working, return JSON with success, level, and device name
    pub fn test_microphone(&self) -> Result<serde_json::Value, String> {
        let device = self.get_input_device()?;
        let device_name = device.name()
            .map_err(|e| format!("Failed to get device name: {}", e))?;

        // Try to build an input stream to verify the device actually works
        let config = Self::get_device_config(&device)?;

        // Record a short sample to measure audio level
        let level_data: Arc<std::sync::Mutex<Vec<f32>>> = Arc::new(std::sync::Mutex::new(Vec::new()));
        let level_data_clone = level_data.clone();

        let stream = device.build_input_stream(
            &config.clone().into(),
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                if let Ok(mut buf) = level_data_clone.lock() {
                    // Keep only ~500ms worth of samples at the device's sample rate
                    let max_samples = (config.sample_rate().0 / 2) as usize;
                    if buf.len() < max_samples {
                        buf.extend_from_slice(data);
                    }
                }
            },
            |err| {
                tracing::error!("Mic test stream error: {}", err);
            },
            None,
        ).map_err(|e| format!("Failed to build test stream: {}", e))?;

        stream.play().map_err(|e| format!("Failed to play test stream: {}", e))?;

        // Record for ~500ms
        std::thread::sleep(std::time::Duration::from_millis(500));
        drop(stream);

        // Compute RMS level
        let samples = level_data.lock().unwrap();
        let level = if samples.is_empty() {
            0.0
        } else {
            let sum_sq: f32 = samples.iter().map(|s| s * s).sum();
            let rms = (sum_sq / samples.len() as f32).sqrt();
            // Normalize to 0-100 range (RMS of speech is typically 0.01-0.3)
            (rms * 300.0).min(100.0)
        };

        tracing::info!("Microphone test: device='{}', level={:.1}", device_name, level);

        Ok(serde_json::json!({
            "success": true,
            "level": level,
            "deviceName": device_name,
        }))
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        let is_recording = self.is_recording.clone();
        tokio::runtime::Handle::try_current()
            .map(|handle| {
                handle.block_on(async {
                    *is_recording.lock().await
                })
            })
            .unwrap_or(false)
    }
}

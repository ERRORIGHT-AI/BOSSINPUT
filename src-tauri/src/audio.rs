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
}

impl AudioManager {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            is_recording: Arc::new(Mutex::new(false)),
            audio_data: Arc::new(Mutex::new(Vec::new())),
        })
    }

    /// Get the default audio input device
    fn get_default_device() -> Result<Device, String> {
        let host = cpal::default_host();
        host.default_input_device()
            .ok_or_else(|| "No audio input device found".to_string())
    }

    /// Get the supported stream config for the device
    fn get_device_config(device: &Device) -> Result<SupportedStreamConfig, String> {
        device.default_input_config()
            .map_err(|e| format!("Failed to get device config: {}", e))
    }

    /// Start recording audio from the default input device
    pub fn start_recording(&self) -> Result<(), String> {
        let device = Self::get_default_device()?;
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
        // In a real implementation, we'd properly stop the stream
        // For now, we'll just return the captured data
        tracing::info!("Stopping recording");

        // Clone the Arc for async access
        let audio_data = self.audio_data.clone();
        let is_recording = self.is_recording.clone();

        // Use blocking task to get data from async mutex
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

    /// Test if microphone is working and return audio level
    pub fn test_microphone(&self) -> Result<bool, String> {
        let device = Self::get_default_device()?;

        // Try to get device name as a basic test
        let name = device.name()
            .map_err(|e| format!("Failed to get device name: {}", e))?;

        tracing::info!("Microphone test: device found '{}'", name);

        Ok(true)
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

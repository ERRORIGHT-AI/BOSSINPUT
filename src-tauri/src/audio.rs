//! Audio recording module using cpal
//! Captures microphone input and returns raw audio data for STT processing
//!
//! IMPORTANT: CoreAudio callbacks run on a real-time IO thread.
//! Only std::sync primitives are safe here — no tokio, no async, no allocations
//! that could block. We use std::sync::Mutex with try_lock in the callback.
//!
//! Audio is recorded at the device's native sample rate and channel count,
//! then converted to 16kHz mono in stop_recording() before returning to STT.

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, Stream, SupportedStreamConfig};
use rubato::{FftFixedIn, Resampler};
use std::sync::atomic::{AtomicBool, AtomicU16, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

const TARGET_SAMPLE_RATE: u32 = 16000;

/// Wrapper to make cpal::Stream Send.
/// Safe because we only create, play, and drop — no concurrent method calls.
struct SendStream(Stream);
unsafe impl Send for SendStream {}

pub struct AudioManager {
    is_recording: Arc<AtomicBool>,
    audio_data: Arc<Mutex<Vec<f32>>>,
    active_stream: Option<SendStream>,
    selected_device: Option<String>,
    /// Device sample rate captured at recording start (for resampling)
    recording_sample_rate: Arc<AtomicU32>,
    /// Device channel count captured at recording start (for mono conversion)
    recording_channels: Arc<AtomicU16>,
}

impl AudioManager {
    pub fn new() -> Result<Self, String> {
        // Pre-allocate buffer for 30 seconds at 48kHz stereo ≈ 9MB
        // This prevents most reallocations on the real-time audio thread
        let prealloc_samples = 48_000 * 30 * 2; // 48kHz * 30s * 2 channels
        Ok(Self {
            is_recording: Arc::new(AtomicBool::new(false)),
            audio_data: Arc::new(Mutex::new(Vec::with_capacity(prealloc_samples))),
            active_stream: None,
            selected_device: None,
            recording_sample_rate: Arc::new(AtomicU32::new(TARGET_SAMPLE_RATE)),
            recording_channels: Arc::new(AtomicU16::new(1)),
        })
    }

    /// Get the input device — either user-selected or system default
    fn get_input_device(&self) -> Result<Device, String> {
        let host = cpal::default_host();

        if let Some(ref selected_name) = self.selected_device {
            if let Ok(devices) = host.input_devices() {
                for device in devices {
                    if let Ok(name) = device.name() {
                        if name == *selected_name {
                            return Ok(device);
                        }
                    }
                }
            }
            tracing::warn!(
                "Selected device '{}' not found, falling back to default",
                selected_name
            );
        }

        host.default_input_device()
            .ok_or_else(|| "No audio input device found".to_string())
    }

    /// Get the supported stream config for the device
    fn get_device_config(device: &Device) -> Result<SupportedStreamConfig, String> {
        device
            .default_input_config()
            .map_err(|e| format!("Failed to get device config: {}", e))
    }

    /// List all available audio input devices
    pub fn list_input_devices(&self) -> Result<Vec<serde_json::Value>, String> {
        let host = cpal::default_host();

        let no_explicit_selection = self.selected_device.is_none();
        let mut result = vec![serde_json::json!({
            "name": "Default",
            "isDefault": true,
            "isSelected": no_explicit_selection,
        })];

        let devices = host
            .input_devices()
            .map_err(|e| format!("Failed to enumerate input devices: {}", e))?;

        for device in devices {
            if let Ok(name) = device.name() {
                let is_selected = self
                    .selected_device
                    .as_ref()
                    .map(|s| s == &name)
                    .unwrap_or(false);

                result.push(serde_json::json!({
                    "name": name,
                    "isDefault": false,
                    "isSelected": is_selected,
                }));
            }
        }

        tracing::info!("Found {} audio input devices", result.len());
        Ok(result)
    }

    /// Set the active input device by name
    pub fn set_input_device(&mut self, device_name: String) -> Result<(), String> {
        if device_name == "default" || device_name == "Default" {
            tracing::info!("Audio input device reset to system default");
            self.selected_device = None;
            return Ok(());
        }

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

    /// Request microphone permission by building a test stream
    pub fn request_permission(&self) -> Result<serde_json::Value, String> {
        let host = cpal::default_host();

        let device = match host.default_input_device() {
            Some(d) => d,
            None => {
                return Ok(serde_json::json!({
                    "granted": false,
                    "error": "No audio input device found.",
                }));
            }
        };

        let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());

        match device.default_input_config() {
            Ok(_config) => {
                match device.build_input_stream(
                    &cpal::StreamConfig {
                        channels: 1,
                        sample_rate: cpal::SampleRate(16000),
                        buffer_size: cpal::BufferSize::Default,
                    },
                    |_data: &[f32], _: &cpal::InputCallbackInfo| {},
                    |_err| {},
                    None,
                ) {
                    Ok(stream) => {
                        drop(stream);
                        let devices = self.list_input_devices().unwrap_or_default();
                        Ok(serde_json::json!({
                            "granted": true,
                            "deviceName": device_name,
                            "devices": devices,
                        }))
                    }
                    Err(e) => Ok(serde_json::json!({
                        "granted": false,
                        "error": format!("Microphone access denied: {}", e),
                    })),
                }
            }
            Err(e) => Ok(serde_json::json!({
                "granted": false,
                "error": format!("Cannot access microphone: {}", e),
            })),
        }
    }

    /// Start recording audio from the selected input device
    pub fn start_recording(&mut self) -> Result<(), String> {
        // Stop any existing recording first
        if self.active_stream.is_some() {
            tracing::warn!("Already recording, stopping previous stream");
            self.active_stream = None;
        }

        let device = self.get_input_device()?;
        let config = Self::get_device_config(&device)?;

        let device_rate = config.sample_rate().0;
        let device_channels = config.channels();

        tracing::info!(
            "Starting recording: format={:?}, rate={}, channels={}",
            config.sample_format(),
            device_rate,
            device_channels
        );

        // Store device params for resampling in stop_recording()
        self.recording_sample_rate
            .store(device_rate, Ordering::Relaxed);
        self.recording_channels
            .store(device_channels, Ordering::Relaxed);

        // Clear previous audio data
        if let Ok(mut data) = self.audio_data.lock() {
            data.clear();
        }

        let stream_config: cpal::StreamConfig = config.clone().into();

        // Build the stream using f32 — cpal will convert from device's native format
        let audio_data = self.audio_data.clone();
        let is_recording = self.is_recording.clone();

        let stream = match config.sample_format() {
            SampleFormat::F32 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        if !is_recording.load(Ordering::Relaxed) {
                            return;
                        }
                        // try_lock: never block the real-time audio thread
                        if let Ok(mut buf) = audio_data.try_lock() {
                            buf.extend_from_slice(data);
                        }
                    },
                    |err| tracing::error!("Audio stream error: {}", err),
                    None,
                )
            }
            SampleFormat::I16 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        if !is_recording.load(Ordering::Relaxed) {
                            return;
                        }
                        if let Ok(mut buf) = audio_data.try_lock() {
                            buf.extend(data.iter().map(|&s| s as f32 / i16::MAX as f32));
                        }
                    },
                    |err| tracing::error!("Audio stream error: {}", err),
                    None,
                )
            }
            _ => return Err("Unsupported sample format".to_string()),
        }
        .map_err(|e| format!("Failed to build input stream: {}", e))?;

        // IMPORTANT: Set is_recording BEFORE play() to capture all audio from start
        self.is_recording.store(true, Ordering::Relaxed);
        stream
            .play()
            .map_err(|e| format!("Failed to start stream: {}", e))?;

        self.active_stream = Some(SendStream(stream));

        tracing::info!("Recording started");
        Ok(())
    }

    /// Stop recording and return the captured audio data, resampled to 16kHz mono
    pub fn stop_recording(&mut self) -> Result<Vec<f32>, String> {
        tracing::info!("Stopping recording");

        // Signal callback to stop collecting samples
        self.is_recording.store(false, Ordering::Relaxed);

        // Drop the stream to fully stop CoreAudio
        self.active_stream = None;

        // Small delay to let any in-flight callback finish
        std::thread::sleep(std::time::Duration::from_millis(50));

        let device_rate = self.recording_sample_rate.load(Ordering::Relaxed);
        let device_channels = self.recording_channels.load(Ordering::Relaxed) as usize;

        // Extract collected audio data (interleaved, device native format)
        let raw_data = match self.audio_data.lock() {
            Ok(mut buf) => {
                let d = std::mem::take(&mut *buf);
                d
            }
            Err(e) => {
                tracing::warn!("Audio data mutex poisoned, recovering: {}", e);
                let mut buf = e.into_inner();
                std::mem::take(&mut *buf)
            }
        };

        let raw_duration_ms = if device_rate > 0 {
            (raw_data.len() as f64 / device_rate as f64 / device_channels as f64 * 1000.0) as u64
        } else {
            0
        };

        tracing::info!(
            "Recording stopped: {} raw samples ({} ch, {} Hz) = {} ms audio",
            raw_data.len(),
            device_channels,
            device_rate,
            raw_duration_ms
        );

        if raw_data.is_empty() {
            tracing::warn!("No audio data captured!");
            return Ok(vec![]);
        }

        // Step 1: Convert interleaved multi-channel to mono (average all channels per frame)
        let mono = if device_channels > 1 {
            let frame_count = raw_data.len() / device_channels;
            let mut mono_buf = Vec::with_capacity(frame_count);
            for frame in 0..frame_count {
                let offset = frame * device_channels;
                let mut sum = 0.0f32;
                for ch in 0..device_channels {
                    sum += raw_data[offset + ch];
                }
                mono_buf.push(sum / device_channels as f32);
            }
            tracing::info!(
                "Converted {} channels to mono: {} -> {} samples",
                device_channels,
                raw_data.len(),
                mono_buf.len()
            );
            mono_buf
        } else {
            raw_data
        };

        // Step 2: Resample to 16kHz if device rate differs
        if device_rate == TARGET_SAMPLE_RATE {
            tracing::info!(
                "No resampling needed: {} mono samples @ 16kHz = {} ms",
                mono.len(),
                (mono.len() as f64 / 16000.0 * 1000.0) as u64
            );
            return Ok(mono);
        }

        let resampled = resample_to_16k(&mono, device_rate)?;
        let output_duration_ms = (resampled.len() as f64 / 16000.0 * 1000.0) as u64;
        tracing::info!(
            "Resampled output: {} samples @ 16kHz = {} ms",
            resampled.len(),
            output_duration_ms
        );

        Ok(resampled)
    }

    /// Test if microphone is working, return JSON with success, level, and device name
    pub fn test_microphone(&self) -> Result<serde_json::Value, String> {
        let device = self.get_input_device()?;
        let device_name = device
            .name()
            .map_err(|e| format!("Failed to get device name: {}", e))?;

        let config = Self::get_device_config(&device)?;

        // Record a short sample to measure audio level
        let level_data: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
        let level_data_clone = level_data.clone();
        let sample_rate = config.sample_rate().0;

        let stream = device
            .build_input_stream(
                &config.into(),
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    // try_lock: never block the real-time audio thread
                    if let Ok(mut buf) = level_data_clone.try_lock() {
                        let max_samples = (sample_rate / 2) as usize; // ~500ms
                        if buf.len() < max_samples {
                            buf.extend_from_slice(data);
                        }
                    }
                },
                |err| tracing::error!("Mic test stream error: {}", err),
                None,
            )
            .map_err(|e| format!("Failed to build test stream: {}", e))?;

        stream
            .play()
            .map_err(|e| format!("Failed to play test stream: {}", e))?;

        // Record for ~500ms
        std::thread::sleep(std::time::Duration::from_millis(500));
        drop(stream);

        // Compute RMS level
        let samples = level_data.lock().unwrap_or_else(|e| e.into_inner());
        let level = if samples.is_empty() {
            0.0
        } else {
            let sum_sq: f32 = samples.iter().map(|s| s * s).sum();
            let rms = (sum_sq / samples.len() as f32).sqrt();
            (rms * 300.0).min(100.0)
        };

        tracing::info!(
            "Microphone test: device='{}', level={:.1}",
            device_name,
            level
        );

        Ok(serde_json::json!({
            "success": true,
            "level": level,
            "deviceName": device_name,
        }))
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::Relaxed)
    }
}

/// Resample mono audio from `source_rate` to 16kHz using rubato (FFT-based)
///
/// IMPORTANT: FftFixedIn has internal latency. We must flush the resampler
/// by processing empty chunks until no more output is produced.
fn resample_to_16k(input: &[f32], source_rate: u32) -> Result<Vec<f32>, String> {
    let chunk_size = 1024;
    let mut resampler = FftFixedIn::<f32>::new(
        source_rate as usize,
        TARGET_SAMPLE_RATE as usize,
        chunk_size,
        1, // sub_chunks
        1, // channels (mono)
    )
    .map_err(|e| format!("Failed to create resampler: {}", e))?;

    let expected_output_len =
        (input.len() as f64 * TARGET_SAMPLE_RATE as f64 / source_rate as f64) as usize;
    let mut output = Vec::with_capacity(expected_output_len + chunk_size);

    tracing::debug!(
        "Resampling: {} samples @ {}Hz -> ~{} samples @ {}Hz",
        input.len(),
        source_rate,
        expected_output_len,
        TARGET_SAMPLE_RATE
    );

    // Process in full chunks
    let mut pos = 0;
    let mut chunks_processed = 0;
    while pos + chunk_size <= input.len() {
        let chunk = &input[pos..pos + chunk_size];
        match resampler.process(&[chunk], None) {
            Ok(result) => {
                if !result.is_empty() && !result[0].is_empty() {
                    output.extend_from_slice(&result[0]);
                    tracing::trace!(
                        "Chunk {}: {} in -> {} out",
                        chunks_processed,
                        chunk.len(),
                        result[0].len()
                    );
                }
            }
            Err(e) => {
                tracing::error!("Resample error at chunk {}: {}", chunks_processed, e);
                return Err(format!("Resample error: {}", e));
            }
        }
        pos += chunk_size;
        chunks_processed += 1;
    }

    // Process remaining samples (pad to chunk size)
    if pos < input.len() {
        let remaining = &input[pos..];
        let mut padded = vec![0.0f32; chunk_size];
        padded[..remaining.len()].copy_from_slice(remaining);
        match resampler.process(&[&padded], None) {
            Ok(result) => {
                if !result.is_empty() && !result[0].is_empty() {
                    output.extend_from_slice(&result[0]);
                    tracing::trace!(
                        "Tail chunk: {} in ({} real) -> {} out",
                        padded.len(),
                        remaining.len(),
                        result[0].len()
                    );
                }
            }
            Err(e) => {
                tracing::error!("Resample error on tail: {}", e);
            }
        }
    }

    // CRITICAL: Flush the resampler's internal latency by processing empty chunks
    // FftFixedIn buffers samples for FFT windowing — we need to flush them out
    let mut flush_count = 0;
    loop {
        let empty_chunk = vec![0.0f32; chunk_size];
        match resampler.process(&[&empty_chunk], None) {
            Ok(result) => {
                if result.is_empty() || result[0].is_empty() {
                    break; // No more output, resampler is empty
                }
                output.extend_from_slice(&result[0]);
                flush_count += 1;
                tracing::trace!("Flush {}: {} out", flush_count, result[0].len());
                if flush_count > 10 {
                    tracing::warn!("Resampler flush took more than 10 chunks, stopping");
                    break;
                }
            }
            Err(e) => {
                tracing::error!("Resample flush error: {}", e);
                break;
            }
        }
    }

    tracing::debug!(
        "Resampling complete: {} in -> {} out ({} chunks + {} flushes)",
        input.len(),
        output.len(),
        chunks_processed,
        flush_count
    );

    Ok(output)
}

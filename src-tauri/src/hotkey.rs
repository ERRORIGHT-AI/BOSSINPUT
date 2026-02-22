//! Global hotkey listener module
//! Uses rdev to listen for global keyboard shortcuts and trigger voice recording
//!
//! NOTE: rdev 0.5 only supports F1-F12 function keys. We use Space for "Fn+Space"
//! which on macOS with the Fn modifier works as the dictation/voice input key.

use rdev::{Event, EventType, Key};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

/// Thread-safe flag for recording state
pub type RecordingFlag = Arc<AtomicBool>;

/// Parse a shortcut string like "Space" into a key code
/// Supported: "Space", "F1" through "F12"
pub fn parse_shortcut(shortcut: &str) -> Option<usize> {
    let shortcut = shortcut.trim().to_lowercase();
    // Remove "fn+" prefix if present (macOS Fn+Space is just Space with Fn)
    let cleaned = shortcut.replace("fn+", "").replace("+", "");
    let key = cleaned.trim();

    match key {
        "space" => Some(1),
        "f1" => Some(11),
        "f2" => Some(12),
        "f3" => Some(13),
        "f4" => Some(14),
        "f5" => Some(15),
        "f6" => Some(16),
        "f7" => Some(17),
        "f8" => Some(18),
        "f9" => Some(19),
        "f10" => Some(20),
        "f11" => Some(21),
        "f12" => Some(22),
        _ => {
            tracing::warn!("Hotkey: Unsupported key: {}", shortcut);
            None
        }
    }
}

/// Convert key code to readable name
fn key_name(code: usize) -> &'static str {
    match code {
        1 => "Space",
        11 => "F1",
        12 => "F2",
        13 => "F3",
        14 => "F4",
        15 => "F5",
        16 => "F6",
        17 => "F7",
        18 => "F8",
        19 => "F9",
        20 => "F10",
        21 => "F11",
        22 => "F12",
        _ => "Unknown",
    }
}

/// Convert rdev Key to our key code
fn key_to_code(key: Key) -> Option<usize> {
    match key {
        Key::Space => Some(1),
        Key::F1 => Some(11),
        Key::F2 => Some(12),
        Key::F3 => Some(13),
        Key::F4 => Some(14),
        Key::F5 => Some(15),
        Key::F6 => Some(16),
        Key::F7 => Some(17),
        Key::F8 => Some(18),
        Key::F9 => Some(19),
        Key::F10 => Some(20),
        Key::F11 => Some(21),
        Key::F12 => Some(22),
        _ => None,
    }
}

/// Global hotkey manager
pub struct HotkeyManager {
    recording_flag: RecordingFlag,
    current_shortcut: Arc<AtomicUsize>,
    is_listening: Arc<AtomicBool>,
    // Store the thread handle
    listener_thread: Option<thread::JoinHandle<()>>,
}

impl HotkeyManager {
    pub fn new() -> Self {
        Self {
            recording_flag: Arc::new(AtomicBool::new(false)),
            current_shortcut: Arc::new(AtomicUsize::new(0)), // 0 = disabled
            is_listening: Arc::new(AtomicBool::new(false)),
            listener_thread: None,
        }
    }

    /// Create a new HotkeyManager, return Result for compatibility
    pub fn try_new() -> Result<Self, String> {
        Ok(Self::new())
    }

    /// Get the recording flag to share with the audio module
    pub fn recording_flag(&self) -> RecordingFlag {
        self.recording_flag.clone()
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        self.recording_flag.load(Ordering::Relaxed)
    }

    /// Start recording (returns previous state)
    pub fn start_recording(&self) -> bool {
        let prev = self.recording_flag.swap(true, Ordering::Relaxed);
        tracing::info!("Hotkey: Recording started (was recording: {})", prev);
        prev
    }

    /// Stop recording (returns previous state)
    pub fn stop_recording(&self) -> bool {
        let prev = self.recording_flag.swap(false, Ordering::Relaxed);
        tracing::info!("Hotkey: Recording stopped (was recording: {})", prev);
        prev
    }

    /// Toggle recording state
    pub fn toggle_recording(&self) -> bool {
        let prev = self.recording_flag.fetch_xor(true, Ordering::Relaxed);
        tracing::info!("Hotkey: Recording toggled (now recording: {})", !prev);
        !prev
    }

    /// Set the active shortcut (0 = disabled, otherwise encoding key)
    pub fn set_shortcut(&mut self, shortcut: &str) {
        if shortcut.is_empty() || shortcut == "disabled" {
            self.current_shortcut.store(0, Ordering::Relaxed);
            tracing::info!("Hotkey: Disabled");
            return;
        }

        let key_code = match parse_shortcut(shortcut) {
            Some(code) => code,
            None => {
                tracing::warn!("Hotkey: No valid keys in shortcut: {}", shortcut);
                self.current_shortcut.store(0, Ordering::Relaxed);
                return;
            }
        };

        self.current_shortcut.store(key_code, Ordering::Relaxed);
        tracing::info!("Hotkey: Set to '{}' (code {})", shortcut, key_code);

        // Restart listener if already running
        if self.is_listening.load(Ordering::Relaxed) {
            self.stop_listening();
            self.start_listening();
        }
    }

    /// Start the global hotkey listener thread
    pub fn start_listening(&mut self) {
        if self.is_listening.load(Ordering::Relaxed) {
            tracing::warn!("Hotkey: Already listening");
            return;
        }

        self.is_listening.store(true, Ordering::Relaxed);
        let flag = self.recording_flag.clone();
        let shortcut = self.current_shortcut.clone();
        let listening = self.is_listening.clone();

        let handle = thread::spawn(move || {
            tracing::info!("Hotkey listener thread started");

            // Track last key press to avoid rapid triggering
            let mut last_key_time = 0;
            const DEBOUNCE_MS: u128 = 300;

            let callback = move |event: Event| {
                if !listening.load(Ordering::Relaxed) {
                    return;
                }

                let target_shortcut = shortcut.load(Ordering::Relaxed);
                if target_shortcut == 0 {
                    return; // Disabled
                }

                match event.event_type {
                    EventType::KeyPress(key) => {
                        if let Some(key_code) = key_to_code(key) {
                            if key_code == target_shortcut {
                                let now = std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_millis();

                                if now.saturating_sub(last_key_time) < DEBOUNCE_MS {
                                    return; // Debounce
                                }
                                last_key_time = now;

                                // Toggle recording
                                let was_recording = flag.fetch_xor(true, Ordering::Relaxed);
                                let now_recording = !was_recording;

                                if now_recording {
                                    tracing::info!("Hotkey: START recording (pressed {})", key_name(key_code));
                                } else {
                                    tracing::info!("Hotkey: STOP recording (pressed {})", key_name(key_code));
                                }
                            }
                        }
                    }
                    _ => {}
                }
            };

            // Use rdev's listen function
            if let Err(error) = rdev::listen(callback) {
                tracing::error!("Hotkey listener error: {:?}", error);
            }

            tracing::info!("Hotkey listener thread stopped");
        });

        self.listener_thread = Some(handle);
        tracing::info!("Hotkey: Started listening");
    }

    /// Stop the global hotkey listener
    pub fn stop_listening(&mut self) {
        self.is_listening.store(false, Ordering::Relaxed);

        // Note: rdev::listen blocks until an error occurs
        // We set the flag and the thread should exit on next check
        // The thread handle will be dropped when self is dropped

        tracing::info!("Hotkey: Stopped listening");
    }
}

impl Drop for HotkeyManager {
    fn drop(&mut self) {
        self.stop_listening();
    }
}

/// Default implementation
impl Default for HotkeyManager {
    fn default() -> Self {
        Self::new()
    }
}

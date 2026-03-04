//! Hotkey configuration module
//!
//! This module stores the configured hotkey and provides a flag for checking
//! the recording state. The actual keyboard event listening happens in the frontend
//! via browser keyboard events, which then call the recording commands.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Thread-safe flag for recording state
pub type RecordingFlag = Arc<AtomicBool>;

/// Hotkey manager - stores configuration and recording state
pub struct HotkeyManager {
    recording_flag: RecordingFlag,
    shortcut_string: String,
}

impl HotkeyManager {
    pub fn new() -> Self {
        Self {
            recording_flag: Arc::new(AtomicBool::new(false)),
            shortcut_string: "Space".to_string(),
        }
    }

    /// Create a new HotkeyManager, return Result for compatibility
    pub fn try_new() -> Result<Self, String> {
        Ok(Self::new())
    }

    /// Get the recording flag
    pub fn recording_flag(&self) -> RecordingFlag {
        self.recording_flag.clone()
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        self.recording_flag.load(Ordering::Relaxed)
    }

    /// Set the recording state (called by frontend when hotkey is pressed)
    pub fn set_recording(&self, recording: bool) {
        let prev = self.recording_flag.swap(recording, Ordering::Relaxed);
        tracing::info!(
            "Hotkey: Recording {} (was: {})",
            if recording { "started" } else { "stopped" },
            prev
        );
    }

    /// Toggle recording state
    pub fn toggle_recording(&self) -> bool {
        let prev = self.recording_flag.fetch_xor(true, Ordering::Relaxed);
        tracing::info!(
            "Hotkey: Recording toggled to {} (was: {})",
            !prev,
            prev
        );
        !prev
    }

    /// Get the current shortcut string
    pub fn get_shortcut(&self) -> &str {
        &self.shortcut_string
    }

    /// Set the shortcut (e.g., "Space", "F13", "Control+Space", "Meta+Shift+V")
    pub fn set_shortcut(&mut self, shortcut: &str) {
        self.shortcut_string = shortcut.to_string();
        tracing::info!("Hotkey: Set to '{}'", shortcut);
    }
}

impl Drop for HotkeyManager {
    fn drop(&mut self) {
        self.recording_flag.store(false, Ordering::Relaxed);
    }
}

/// Default implementation
impl Default for HotkeyManager {
    fn default() -> Self {
        Self::new()
    }
}

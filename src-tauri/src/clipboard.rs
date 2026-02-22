//! Clipboard management module
//! Handles setting clipboard text and simulating paste (Cmd+V / Ctrl+V)

use rdev::{EventType, Key, simulate};

pub struct ClipboardManager;

impl ClipboardManager {
    pub fn new() -> Result<Self, String> {
        Ok(Self)
    }

    /// Set clipboard text
    pub fn set_text(&self, text: &str) -> Result<(), String> {
        // Use arboard crate for cross-platform clipboard access
        let mut clipboard = arboard::Clipboard::new()
            .map_err(|e| format!("Failed to access clipboard: {}", e))?;
        clipboard.set_text(text)
            .map_err(|e| format!("Failed to set clipboard text: {}", e))?;
        Ok(())
    }

    /// Get clipboard text
    pub fn get_text(&self) -> Result<String, String> {
        let mut clipboard = arboard::Clipboard::new()
            .map_err(|e| format!("Failed to access clipboard: {}", e))?;
        clipboard.get_text()
            .map_err(|e| format!("Failed to get clipboard text: {}", e))
    }

    /// Simulate paste keystroke (Cmd+V on macOS, Ctrl+V on others)
    pub fn paste(&self) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        let events = vec![
            EventType::KeyPress(Key::MetaLeft),
            EventType::KeyPress(Key::KeyV),
            EventType::KeyRelease(Key::KeyV),
            EventType::KeyRelease(Key::MetaLeft),
        ];

        #[cfg(not(target_os = "macos"))]
        let events = vec![
            EventType::KeyPress(Key::ControlLeft),
            EventType::KeyPress(Key::KeyV),
            EventType::KeyRelease(Key::KeyV),
            EventType::KeyRelease(Key::ControlLeft),
        ];

        for event in events {
            simulate(&event)
                .map_err(|e| format!("Failed to simulate paste: {}", e))?;
        }

        Ok(())
    }
}

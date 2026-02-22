//! Keyboard HID communication module
//! Handles Vial protocol communication with compatible keyboards

use hidapi::HidApi;
use serde_json::Value;
use std::ffi::CString;
use std::sync::Mutex;

const VIAL_USAGE_PAGE: u16 = 0xFF60;
const VIAL_USAGE: u16 = 0x61;

pub struct KeyboardManager {
    hid_api: Mutex<Option<HidApi>>,
}

impl KeyboardManager {
    pub fn new() -> Result<Self, String> {
        Ok(Self { hid_api: Mutex::new(None) })
    }

    /// Initialize HID API lazily
    fn ensure_hid_api(&self) -> Result<(), String> {
        let mut api = self.hid_api.lock().unwrap();
        if api.is_none() {
            *api = Some(HidApi::new()
                .map_err(|e| format!("Failed to initialize HID API: {}", e))?);
        }
        Ok(())
    }

    /// List all connected Vial-compatible keyboards
    pub fn list_devices(&self) -> Result<Vec<Value>, String> {
        self.ensure_hid_api()?;
        let mut devices = Vec::new();

        let api = self.hid_api.lock().unwrap();
        if let Some(hid_api) = api.as_ref() {
            for device in hid_api.device_list() {
                if device.usage_page() == VIAL_USAGE_PAGE && device.usage() == VIAL_USAGE {
                    devices.push(serde_json::json!({
                        "path": device.path().to_string_lossy(),
                        "vendor_id": device.vendor_id(),
                        "product_id": device.product_id(),
                        "manufacturer": device.manufacturer_string().unwrap_or("Unknown"),
                        "product": device.product_string().unwrap_or("Unknown"),
                    }));
                }
            }
        }

        Ok(devices)
    }

    /// Get keyboard configuration
    pub fn get_config(&self) -> Result<Value, String> {
        // TODO: Implement reading config from keyboard
        Ok(serde_json::json!({
            "layers": [
                {"id": "0", "name": "Base"},
                {"id": "1", "name": "Layer 1"},
                {"id": "2", "name": "Layer 2"},
            ],
            "keyMappings": [
                {"layer": "0", "keyIndex": 1, "keycode": "KC_A"},
                {"layer": "0", "keyIndex": 2, "keycode": "KC_B"},
                {"layer": "0", "keyIndex": 3, "keycode": "KC_C"},
            ]
        }))
    }

    /// Save keyboard configuration
    pub fn save_config(&self, _config: Value) -> Result<(), String> {
        // TODO: Implement writing config to keyboard via Vial protocol
        tracing::info!("Saving keyboard config");
        Ok(())
    }

    /// Open connection to a specific keyboard
    pub fn open_device(&self, path: &str) -> Result<hidapi::HidDevice, String> {
        self.ensure_hid_api()?;
        let api = self.hid_api.lock().unwrap();
        if let Some(hid_api) = api.as_ref() {
            let c_path = CString::new(path)
                .map_err(|e| format!("Failed to convert path: {}", e))?;
            return hid_api
                .open_path(&c_path)
                .map_err(|e| format!("Failed to open device: {}", e));
        }
        Err("HID API not initialized".to_string())
    }

    /// Read data from keyboard
    pub fn read_keyboard(&self, device: &hidapi::HidDevice, buf: &mut [u8]) -> Result<usize, String> {
        device
            .read_timeout(buf, 1000)
            .map_err(|e| format!("Read error: {}", e))
    }

    /// Write data to keyboard
    pub fn write_keyboard(&self, device: &hidapi::HidDevice, data: &[u8]) -> Result<(), String> {
        device
            .write(data)
            .map_err(|e| format!("Write error: {}", e))
            .map(|_| ())
    }
}

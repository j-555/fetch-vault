pub mod crypto;
pub mod error;
pub mod storage;
pub mod import;

use error::Error;
pub type Result<T> = std::result::Result<T, Error>;

// Re-export commonly used types
pub use import::{Importer, ImportResult, ImportedItem};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn init() -> Result<tauri::App> {
  tauri::Builder::default()
        .setup(|_app| {
            Ok(())
        })
        .build(tauri::generate_context!())
        .map_err(Into::into)
}

pub fn init_plugins<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
        .build()
}

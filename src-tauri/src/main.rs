use serde::{Deserialize, Serialize};
use tauri::State;
use log::{info, error};
use fetch::storage::VaultState;
use fetch::import::Importer;
use fetch::import::ImportResult;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportCsvArgs {
    pub file_path: String,
}

#[tauri::command]
async fn check_file_exists(path: String) -> Result<bool, String> {
    let path = std::path::Path::new(&path);
    Ok(path.exists())
}

#[tauri::command]
async fn import_csv(args: ImportCsvArgs, state: State<'_, VaultState>) -> Result<ImportResult, String> {
    info!("Importing CSV file: {}", args.file_path);
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot import data.");
        return Err("Vault is locked".to_string());
    }

    match Importer::import_csv(&args.file_path) {
        Ok((items, result)) => {
            info!("CSV import successful. Imported {} items, {} errors", 
                result.success_count, result.error_count);

            // Only add items to the vault if there were no errors
            if result.error_count == 0 {
                // Add all imported items to the vault
                for imported_item in items {
                    if let Err(e) = storage.add_item(&imported_item.vault_item, &crypto) {
                        error!("Failed to add item to vault: {}", e);
                        return Err(format!("Failed to add item to vault: {}", e));
                    }
                    
                    // If this is a password item, store the password data
                    if imported_item.vault_item.item_type == "key" {
                        if let Some(password_data) = imported_item.password_data {
                            match crypto.encrypt(password_data.to_string().as_bytes()) {
                                Ok(encrypted_data) => {
                                    if let Err(e) = storage.write_encrypted_file(&encrypted_data, &imported_item.vault_item.data_path) {
                                        error!("Failed to write encrypted file: {}", e);
                                        return Err(format!("Failed to write encrypted file: {}", e));
                                    }
                                }
                                Err(e) => {
                                    error!("Failed to encrypt password data: {}", e);
                                    return Err(format!("Failed to encrypt password data: {}", e));
                                }
                            }
                        }
                    }
                }
            }
            
            Ok(result)
        },
        Err(e) => {
            error!("CSV import failed: {}", e);
            Err(e.to_string())
        }
    }
}

// ... rest of the file ...

fn main() {
    tauri::Builder::default()
        .manage(VaultState::new())
        .invoke_handler(tauri::generate_handler![
            check_file_exists,
            import_csv,
            // ... other commands ...
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 
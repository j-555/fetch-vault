use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, Wry};
use walkdir::WalkDir;
use zip::write::{FileOptions, ZipWriter};
use chrono::Utc;
use log::{error, info, warn, debug, trace};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use rand::seq::SliceRandom;

use fetch::crypto::{Crypto, KeyDerivationStrength};
use fetch::error::{Error, Result};
use fetch::storage::{Storage, VaultItem, SortOrder};

pub struct VaultState {
    storage: Mutex<Storage>,
    crypto: Mutex<Crypto>,
}

#[derive(Deserialize)]
pub struct AddTextItemArgs {
    name: String,
    content: String,
    item_type: String,
    tags: Vec<String>,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
}

#[derive(Deserialize)]
pub struct AddFileItemArgs {
    name: String,
    file_path: String,
    tags: Vec<String>,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
}

#[derive(Deserialize)]
pub struct AddFolderArgs {
    name: String,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
    #[serde(rename = "folderType")]
    folder_type: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct InitializeVaultArgs {
    #[serde(rename = "masterKey")]
    master_key: String,
    strength: Option<KeyDerivationStrength>,
}

#[derive(serde::Deserialize)]
pub struct ExportVaultArgs {
    master_key: String,
}

#[derive(serde::Deserialize)]
pub struct DeleteVaultArgs {
    master_key: String,
}

#[derive(serde::Deserialize)]
pub struct UpdateMasterKeyArgs {
    #[serde(rename = "currentKey")]
    current_key: String,
    #[serde(rename = "newKey")]
    new_key: String,
    strength: Option<KeyDerivationStrength>,
}

#[derive(serde::Deserialize)]
pub struct RenameTagArgs {
    #[serde(rename = "oldTagName")]
    old_tag_name: String,
    #[serde(rename = "newTagName")]
    new_tag_name: String,
}

#[derive(serde::Deserialize)]
pub struct DeleteTagArgs {
    #[serde(rename = "tagName")]
    tag_name: String,
}

#[derive(Serialize)]
pub struct VaultStatus {
    initialized: bool,
    unlocked: bool,
    strength: Option<KeyDerivationStrength>,
}


fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Trace).build())
        .setup(|app| {
            let app_data_dir = app.path()
                .app_data_dir()
                .expect("Failed to get app data directory. Please check permissions.");
            
            let vault_path = app_data_dir.join("vault");
            if !vault_path.exists() {
                std::fs::create_dir_all(&vault_path).expect("Failed to create vault directory");
            }

            let storage = Storage::new(vault_path)?;
            let crypto = Crypto::new();
            let vault_state = VaultState {
                storage: Mutex::new(storage),
                crypto: Mutex::new(crypto),
            };

            app.manage(vault_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            is_vault_initialized,
            initialize_vault,
            unlock_vault,
            lock_vault,
            get_vault_items,
            add_text_item,
            add_file_item,
            add_folder,
            get_item_content,
            delete_item,
            update_master_key,
            export_decrypted_vault,
            export_encrypted_vault,
            delete_vault,
            get_vault_status,
            get_key_derivation_strength,
            get_all_tags,
            rename_tag,
            delete_tag,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_vault_status(state: State<'_, VaultState>) -> Result<VaultStatus> {
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    let strength = if storage.is_initialized() {
        Some(storage.get_key_derivation_strength()?)
    } else {
        None
    };
    Ok(VaultStatus {
        initialized: storage.is_initialized(),
        unlocked: crypto.is_unlocked(),
        strength,
    })
}

#[tauri::command]
fn get_key_derivation_strength(state: State<'_, VaultState>) -> Result<KeyDerivationStrength> {
    let storage = state.storage.lock().unwrap();
    if !storage.is_initialized() {
        return Err(Error::Internal("Vault not initialized".to_string()));
    }
    storage.get_key_derivation_strength()
}


#[tauri::command]
async fn is_vault_initialized(state: State<'_, VaultState>) -> Result<bool> {
    let storage = state.storage.lock().unwrap();
    Ok(storage.is_initialized())
}

#[tauri::command]
async fn initialize_vault(args: InitializeVaultArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Initializing vault.");
    let storage = state.storage.lock().unwrap();
    let mut crypto = state.crypto.lock().unwrap();

    if storage.is_initialized() {
        error!("Attempted to initialize an already initialized vault.");
        return Err(Error::VaultAlreadyInitialized);
    }
    
    let strength = args.strength.unwrap_or_default();
    info!("Generating salt and deriving key with strength: {:?}", strength);
    let salt = Crypto::generate_salt();
    let derived_key = crypto.derive_key(&args.master_key, &salt, strength)?;

    info!("Storing salt and strength.");
    storage.initialize(&salt, strength)?;

    info!("Unlocking crypto with new key.");
    crypto.unlock(&derived_key)?;

    info!("Creating and storing verification token.");
    let verification_data = Crypto::generate_verification_token();
    let encrypted_token = crypto.encrypt(&verification_data)?;
    storage.store_verification_token(&encrypted_token)?;

    info!("Vault initialized successfully.");
    Ok(())
}

#[tauri::command]
async fn unlock_vault(master_key: String, state: State<'_, VaultState>) -> Result<()> {
    info!("Attempting to unlock vault.");
    let storage = state.storage.lock().unwrap();
    let mut crypto = state.crypto.lock().unwrap();

    let salt = storage.get_salt()?;
    let strength = storage.get_key_derivation_strength()?;
    let verification_token = storage.get_verification_token()?;

    let derived_key = crypto.derive_key(&master_key, &salt, strength)?;
    crypto.unlock(&derived_key)?;

    if crypto.decrypt(&verification_token).is_ok() {
        info!("Vault unlocked successfully with strength {:?}", strength);
        return Ok(());
    }

    error!("Invalid master key provided during unlock attempt.");
    crypto.lock();
    Err(Error::InvalidMasterKey)
}

#[tauri::command]
async fn lock_vault(state: State<'_, VaultState>) -> Result<()> {
    info!("Locking vault.");
    state.crypto.lock().unwrap().lock();
    Ok(())
}

#[tauri::command]
async fn get_vault_items(
    parent_id: Option<String>,
    item_type: Option<String>,
    order_by: Option<SortOrder>,
    state: State<'_, VaultState>,
) -> Result<Vec<VaultItem>> {
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }
    storage.get_items(parent_id, item_type, order_by, &crypto)
}

#[tauri::command]
async fn add_text_item(args: AddTextItemArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Adding text item: {}", args.name);
    trace!("Received content length: {}", args.content.len());

    if args.name.trim().is_empty() || args.content.is_empty() {
        warn!("Attempted to add text item with empty name or content.");
        return Err(Error::InvalidInput("Item name and content cannot be empty".into()));
    }
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot add item.");
        return Err(Error::VaultLocked);
    }

    let now = Utc::now();
    let data_path = Uuid::new_v4().to_string(); 
    debug!("Generated data_path for text item: {}", data_path);

    let item = VaultItem {
        id: Uuid::new_v4().to_string(),
        parent_id: args.parent_id,
        name: args.name,
        data_path: data_path.clone(), 
        item_type: if args.item_type == "text" { "text/plain".to_string() } else { args.item_type }, 
        folder_type: None,
        tags: args.tags,
        created_at: now,
        updated_at: now,
    };

    let encrypted_content = crypto.encrypt(args.content.as_bytes())?;
    
    debug!("Encrypted content size for text item: {} bytes", encrypted_content.len());
    let full_file_path = storage.get_vault_path().join("data").join(&data_path);
    debug!("Attempting to write encrypted text content to: {}", full_file_path.display());

    storage.write_encrypted_file(&encrypted_content, &data_path)?;
    debug!("Successfully wrote encrypted file for text item ID: {}", item.id);

    storage.add_item(&item, &crypto)?;
    info!("Text item '{}' added successfully.", item.name);
    Ok(())
}

#[tauri::command]
async fn add_file_item(args: AddFileItemArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Adding file item: {}", args.name);

    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot add file item.");
        return Err(Error::VaultLocked);
    }

    let file_path = Path::new(&args.file_path);
    let file_content = fs::read(file_path)?;
    
    let guess = mime_guess::from_path(file_path).first_or_octet_stream();
    let mime_type = guess.to_string();
    
    let now = Utc::now();
    let data_path = Uuid::new_v4().to_string();

    let item = VaultItem {
        id: Uuid::new_v4().to_string(),
        parent_id: args.parent_id,
        name: args.name,
        data_path: data_path.clone(),
        item_type: mime_type,
        folder_type: None,
        tags: args.tags,
        created_at: now,
        updated_at: now,
    };

    let encrypted_content = crypto.encrypt(&file_content)?;
    
    debug!("Encrypted content size for file item: {} bytes", encrypted_content.len());
    let full_file_path = storage.get_vault_path().join("data").join(&data_path);
    debug!("Attempting to write encrypted file content to: {}", full_file_path.display());

    storage.write_encrypted_file(&encrypted_content, &data_path)?;
    debug!("Successfully wrote encrypted file for file item ID: {}", item.id);
    storage.add_item(&item, &crypto)?;
    
    info!("File item '{}' added successfully.", item.name);
    Ok(())
}

#[tauri::command]
async fn add_folder(args: AddFolderArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Adding folder: {}", args.name);

    if args.name.trim().is_empty() {
        warn!("Attempted to add folder with empty name.");
        return Err(Error::InvalidInput("Folder name cannot be empty".into()));
    }
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot add folder.");
        return Err(Error::VaultLocked);
    }

    let now = Utc::now();

    let item = VaultItem {
        id: Uuid::new_v4().to_string(),
        parent_id: args.parent_id,
        name: args.name,
        data_path: "".to_string(),
        item_type: "folder".to_string(),
        folder_type: args.folder_type,
        tags: vec![], 
        created_at: now,
        updated_at: now,
    };
    
    storage.add_item(&item, &crypto)?;

    info!("Folder '{}' added successfully.", item.name);
    Ok(())
}

#[tauri::command]
async fn get_item_content(id: String, state: State<'_, VaultState>) -> Result<Vec<u8>> {
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }

    let item = storage.get_item(&id, &crypto)?.ok_or_else(|| Error::ItemNotFound(id.clone()))?;
    storage.read_encrypted_file(&item.data_path, &crypto)
}

#[tauri::command]
async fn delete_item(id: String, state: State<'_, VaultState>) -> Result<bool> {
    info!("Recursively deleting item with id: {}", id);
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }
    storage.delete_item_and_descendants(&id, &crypto)?;
    Ok(true)
}

#[tauri::command]
async fn update_master_key(args: UpdateMasterKeyArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Starting master key update process.");
    let storage = state.storage.lock().unwrap();
    let mut crypto = state.crypto.lock().unwrap();

    let current_salt = storage.get_salt()?;
    let current_strength = storage.get_key_derivation_strength()?;
    let verification_token = storage.get_verification_token()?;
    let derived_key = crypto.derive_key(&args.current_key, &current_salt, current_strength)?;
    
    crypto.unlock(&derived_key)?;
    if crypto.decrypt(&verification_token).is_err() {
        crypto.lock();
        error!("Invalid current master key during update attempt.");
        return Err(Error::InvalidMasterKey);
    }
    info!("Current master key verified.");

    let new_strength = args.strength.unwrap_or(current_strength);
    let new_salt = Crypto::generate_salt();
    let new_derived_key = crypto.derive_key(&args.new_key, &new_salt, new_strength)?;
    let mut temp_crypto_for_reencrypt = Crypto::new();
    temp_crypto_for_reencrypt.unlock(&new_derived_key)?;

    let all_items = storage.get_all_items_recursive(&crypto)?;
    info!("Re-encrypting {} items with new master key...", all_items.len());

    for item in &all_items {
        storage.update_item_fields(item, &temp_crypto_for_reencrypt)?;

        if !item.data_path.is_empty() {
             let decrypted_content = storage.read_encrypted_file(&item.data_path, &crypto)?;
             let re_encrypted_content = temp_crypto_for_reencrypt.encrypt(&decrypted_content)?;
             storage.write_encrypted_file(&re_encrypted_content, &item.data_path)?;
        }
    }
    
    let decrypted_verification_token = crypto.decrypt(&verification_token)?;
    let new_encrypted_token = temp_crypto_for_reencrypt.encrypt(&decrypted_verification_token)?;
    storage.store_verification_token(&new_encrypted_token)?;

    storage.update_salt(&new_salt)?;
    storage.set_key_derivation_strength(new_strength)?;

    *crypto = temp_crypto_for_reencrypt;

    info!("Master key updated successfully.");
    Ok(())
}

#[tauri::command]
async fn export_decrypted_vault(args: ExportVaultArgs, state: State<'_, VaultState>) -> Result<String> {
    info!("Exporting decrypted vault.");

    let derived_key = {
        let storage = state.storage.lock().unwrap();
        let salt = storage.get_salt()?;
        let temp_crypto = Crypto::new();
        let strength = storage.get_key_derivation_strength()?;
        let verification_token = storage.get_verification_token()?;

        let key = temp_crypto.derive_key(&args.master_key, &salt, strength)?;
        let mut checker_crypto = Crypto::new();
        checker_crypto.unlock(&key)?;
        
        if checker_crypto.decrypt(&verification_token).is_err() {
            return Err(Error::InvalidMasterKey);
        }
        key
    };

    let mut crypto = state.crypto.lock().unwrap();
    crypto.unlock(&derived_key)?;
    
    let storage = state.storage.lock().unwrap();
    let items = storage.get_all_items_recursive(&crypto)?;
    let mut decrypted_items = Vec::new();

    for item in items {
         if !item.data_path.is_empty() {
            let content = storage.read_encrypted_file(&item.data_path, &crypto)?;
            let mut decrypted_item = serde_json::to_value(item)?;
            decrypted_item["content"] = serde_json::Value::String(STANDARD.encode(&content));
            decrypted_items.push(decrypted_item);
        } else {
             decrypted_items.push(serde_json::to_value(item)?);
        }
    }
    
    info!("Decrypted vault export successful.");
    Ok(serde_json::to_string_pretty(&decrypted_items)?)
}

#[tauri::command]
async fn export_encrypted_vault(state: State<'_, VaultState>) -> Result<Vec<u8>> {
    info!("Exporting encrypted vault as a zip archive.");
    let storage = state.storage.lock().unwrap();
    let vault_path = storage.get_vault_path();
    
    let buffer = {
        let buffer: Vec<u8> = Vec::new();
        let cursor = std::io::Cursor::new(buffer);
        let mut zip = ZipWriter::new(cursor);
        
        let options = FileOptions::default().compression_method(zip::CompressionMethod::Stored);

        let walkdir = WalkDir::new(vault_path);
        let it = walkdir.into_iter();

        for entry in it.filter_map(|e| e.ok()) {
            let path = entry.path();
            let name = path.strip_prefix(Path::new(vault_path)).unwrap();

            if path.is_file() {
                zip.start_file(name.to_str().unwrap(), options)?;
                let mut f = File::open(path)?;
                let mut contents = Vec::new();
                f.read_to_end(&mut contents)?;
                zip.write_all(&contents)?;
            } else if !name.as_os_str().is_empty() {
                zip.add_directory(name.to_str().unwrap(), options)?;
            }
        }
        
        let cursor = zip.finish()?;
        cursor.into_inner()
    };
    
    info!("Encrypted vault export successful.");
    Ok(buffer)
}

#[tauri::command]
async fn delete_vault(args: DeleteVaultArgs, app_handle: AppHandle<Wry>, state: State<'_, VaultState>) -> Result<()> {
    info!("Starting vault deletion process.");
    
    {
        let storage = state.storage.lock().unwrap();
        let salt = storage.get_salt()?;
        let strength = storage.get_key_derivation_strength()?;
        let temp_crypto = Crypto::new();
        let verification_token = storage.get_verification_token()?;

        let key = temp_crypto.derive_key(&args.master_key, &salt, strength)?;
        let mut checker_crypto = Crypto::new();
        checker_crypto.unlock(&key)?;
        
        if checker_crypto.decrypt(&verification_token).is_err() {
            return Err(Error::InvalidMasterKey);
        }
    }

    let vault_path = app_handle.path().app_data_dir().unwrap().join("vault");
    
    if vault_path.exists() {
        let mut crypto = state.crypto.lock().unwrap();
        crypto.lock();
        let _storage_lock = state.storage.lock().unwrap(); 
        
        fs::remove_dir_all(&vault_path)?;
        info!("Vault directory deleted successfully.");
    }
    
    Ok(())
}

#[tauri::command]
async fn get_all_tags(state: State<'_, VaultState>) -> Result<Vec<String>> {
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();
    if !crypto.is_unlocked() {
        return Err(Error::VaultLocked);
    }
    
    let all_items = storage.get_all_items_recursive(&crypto)?;
    let mut tags: Vec<String> = all_items.into_iter()
        .flat_map(|item| item.tags)
        .collect();
    
    tags.sort_unstable();
    tags.dedup(); // Remove duplicates
    
    Ok(tags)
}

#[tauri::command]
async fn rename_tag(args: RenameTagArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Renaming tag from '{}' to '{}'", args.old_tag_name, args.new_tag_name);
    if args.new_tag_name.trim().is_empty() {
        warn!("Attempted to rename tag to an empty string.");
        return Err(Error::InvalidInput("New tag name cannot be empty".into()));
    }
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot rename tag.");
        return Err(Error::VaultLocked);
    }
    
    storage.rename_tag_in_all_items(&args.old_tag_name, &args.new_tag_name, &crypto)?;
    info!("Tag '{}' successfully renamed to '{}'.", args.old_tag_name, args.new_tag_name);
    Ok(())
}

#[tauri::command]
async fn delete_tag(args: DeleteTagArgs, state: State<'_, VaultState>) -> Result<()> {
    info!("Deleting tag: {}", args.tag_name);
    
    let storage = state.storage.lock().unwrap();
    let crypto = state.crypto.lock().unwrap();

    if !crypto.is_unlocked() {
        error!("Vault is locked, cannot delete tag.");
        return Err(Error::VaultLocked);
    }
    
    storage.remove_tag_from_all_items(&args.tag_name, &crypto)?;
    info!("Tag '{}' successfully deleted from all items.", args.tag_name);
    Ok(())
}
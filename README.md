# Fetch: A Secure Digital Vault

Fetch is a modern, cross-platform desktop application designed to be a secure digital vault for your sensitive information, such as notes, files, and tokens. It leverages strong, modern encryption to ensure that all your data is kept private and safe, directly on your local machine.

## Key Features

* **End-to-End Encryption**: All vault contents are encrypted on disk using AES-256-GCM. The encryption key is derived from your master password using the memory-hard Argon2id algorithm.
* **Encrypted Metadata**: Sensitive metadata, including item names and tags, are individually encrypted within the database, protecting them from inspection even if the database file is accessed.
* **Local-First Security**: Your data never leaves your machine. Everything is stored and encrypted locally.
* **File & Text Storage**: Securely store both sensitive text notes and any type of file (images, documents, etc.).
* **Secure Vault Management**: Includes features for creating encrypted backups, secure vault deletion, and changing your master key.
* **Customizable Security**: Offers adjustable key derivation strength and an optional auto-locking mechanism.

## Tech Stack

* **Backend**: Rust
* **Framework**: Tauri
* **Encryption**: AES-256-GCM (from `aes-gcm`), Argon2id (from `argon2`)
* **Database**: SQLite (via `rusqlite`) (pending upgrade to SQLCipher for better overall security)
* **Frontend**: React, TypeScript, Tailwind CSS

## Building From Source

### Prerequisites

* Rust: [https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install)
* Node.js: [https://nodejs.org/](https://nodejs.org/)
* Tauri Prerequisites: Follow the guide for your OS at [https://tauri.app/](https://tauri.app/)

### Installation & Running

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/zbzyy/fetch-secure-vault.git]
    cd fetch-secure-vault
    ```

2.  **Install frontend dependencies:**
    ```sh
    npm install
    ```

3.  **Run the development server:**
    ```sh
    npm run tauri dev
    ```

4.  **Build the application:**
    ```sh
    npm run tauri build
    ```

## License

This project is currently unlicensed. Please consider adding an open-source license like MIT or GPLv3.

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useVaultManagement() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleUpdateMasterKey = async (currentKey: string, newKey: string, strength: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await invoke('update_master_key', { args: { currentKey, newKey, strength } });
            setIsSuccess(true);
            setTimeout(() => window.location.reload(), 3000);
        } catch (err: any) {
            console.error("Master key update failed:", err);
            const message = typeof err === 'string' ? err : err.message || "An unknown error occurred.";
            setError(message.includes('InvalidMasterKey') ? "The current master key you entered is incorrect." : "An unexpected error occurred.");
            setIsLoading(false);
            throw err;
        }
    };
    
    const handleExportDecrypted = async (masterKey: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const json = await invoke<string>('export_decrypted_vault', { master_key: masterKey });
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fetch-vault-decrypted-export-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setIsLoading(false);
            return true;
        } catch (err: any) {
            console.error("Decrypted export failed:", err);
            const message = typeof err === 'string' ? err : err.message || "An unknown error occurred.";
            setError(message);
            setIsLoading(false);
            throw err;
        }
    };

    const handleExportEncrypted = async () => {
        try {
            const data = await invoke<number[]>('export_encrypted_vault');
            const blob = new Blob([new Uint8Array(data)], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fetch-vault-encrypted-backup-${Date.now()}.zip`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Encrypted export failed:", err);
            alert("Error: Could not create backup file.");
        }
    };

    const handleDeleteVault = async (masterKey: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await invoke('delete_vault', { args: { masterKey } });
            window.location.reload();
        } catch (err) {
            console.error("Vault deletion failed:", err);
            setError("Failed to delete vault. Please check your master key.");
            setIsLoading(false);
            throw err;
        }
    };
    
    const clearError = () => setError(null);

    return { 
        isLoading, 
        error, 
        isSuccess,
        handleUpdateMasterKey,
        handleExportDecrypted,
        handleExportEncrypted,
        handleDeleteVault,
        clearError
    };
}
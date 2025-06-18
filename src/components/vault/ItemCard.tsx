import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  FolderIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { ItemDetailsModal } from './ItemDetailsModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal'; 
import { VaultItem } from '../../types';
import { typeIcons } from '../../utils/constants';
import { getExtensionFromMime } from '../../utils/helpers'; // Import the helper

interface ItemCardProps {
  item: VaultItem;
  onDelete: () => Promise<void>;
  onFolderClick: (item: VaultItem) => void;
}

export function ItemCard({ item, onDelete, onFolderClick }: ItemCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleCardClick = () => {
    if (item.type === 'folder') {
      onFolderClick(item);
    } else {
      setIsDetailsOpen(true);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localStorage.getItem('requireKeyOnAccess') === 'true') {
        setIsDetailsOpen(true);
        return;
    }
    try {
      const result = await invoke<number[]>('get_item_content', { id: item.id });
      const blob = new Blob([new Uint8Array(result)], { type: item.item_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Use getExtensionFromMime to determine download filename
      const extension = getExtensionFromMime(item.item_type);
      a.download = `${item.name}.${extension}`; // Ensure proper extension on download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download item');
      console.error('Error downloading item:', err);
    }
  };

  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await invoke('delete_item', { id: item.id });
      await onDelete();
      setIsDeleteModalOpen(false);
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error deleting item:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const Icon = typeIcons[item.type] || FolderIcon;
  const isFolder = item.type === 'folder';
  const date = new Date(item.created_at).toLocaleDateString();

  return (
    <>
      <div 
        className="relative group bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 hover:bg-gray-800 transition-colors border border-gray-700/50 hover:border-gray-600/50 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${isFolder ? 'bg-amber-600/20' : 'bg-indigo-600/20'}`}>
            <Icon className={`h-6 w-6 ${isFolder ? 'text-amber-400' : 'text-indigo-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white truncate">{item.name}</p>
              <div className="flex items-center space-x-2 ml-2">
                {!isFolder && (
                    <button
                        onClick={handleDownload}
                        disabled={isLoading}
                        className="p-1.5 text-gray-400 hover:text-white bg-gray-700/50 rounded-lg transition-colors hover:bg-gray-700"
                        title="Download"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-700/50 rounded-lg transition-colors hover:bg-red-500/10"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-1">{date}</p>
            {!isFolder && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-400">{error}</div>
        )}
      </div>

      <ItemDetailsModal
        item={item}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName={item.name}
        itemType={item.type}
        isLoading={isLoading}
      />
    </>
  );
}
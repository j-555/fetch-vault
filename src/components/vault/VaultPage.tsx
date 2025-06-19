import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface RawBackendItem {
  id: string;
  name: string;
  type: string;
  item_type: string;
  created_at: string;
  updated_at: string;
}

interface VaultItem extends Omit<RawBackendItem, 'created_at' | 'updated_at'> {
  created_at: number;
  updated_at: number;
}

function getSimplifiedType(item: RawBackendItem): string {
  if (item.type === 'folder') return 'folder';
  if (item.item_type.startsWith('image/')) return 'image';
  if (item.item_type.startsWith('video/')) return 'video';
  if (item.item_type.startsWith('audio/')) return 'audio';
  if (item.type === 'text') return 'text';
  if (item.type === 'key') return 'key';
  return 'file';
}

export function VaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('all');
  const [sortOrder, setSortOrder] = useState({ value: 'name_asc', label: 'Name (A-Z)' });
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'Root' }
  ]);
  const [vaultView, setVaultView] = useState(localStorage.getItem('vaultView') || 'grid');

  const loadItems = async () => {
    try {
      console.log('Starting to load vault items...');
      console.log('Current folder ID:', currentFolderId);
      console.log('Selected type:', selectedType);
      console.log('Sort order:', sortOrder);
      
      setIsLoading(true);
      setError(null);

      const fetchedItemsRaw = await invoke<RawBackendItem[]>('get_vault_items', {
        parentId: currentFolderId,
        itemType: selectedType === 'all' ? null : selectedType,
        orderBy: sortOrder.value,
      });

      console.log('Fetched raw items:', fetchedItemsRaw);
      
      const transformedItems: VaultItem[] = fetchedItemsRaw.map(rawItem => ({
        ...rawItem,
        item_type: rawItem.type,
        type: getSimplifiedType(rawItem),
        created_at: new Date(rawItem.created_at).getTime(),
        updated_at: new Date(rawItem.updated_at).getTime(),
      }));

      console.log('Transformed items:', transformedItems);
      setItems(transformedItems);
    } catch (err: any) {
      console.error('Error loading items:', err);
      const errorMessage = err.message ? `${err.message}\n${err.stack}` : String(err);
      console.error('Detailed error:', errorMessage);
      setError(`Failed to load items. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ... rest of the component code ...
} 
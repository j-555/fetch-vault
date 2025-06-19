import { useState, useEffect, Fragment } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './Sidebar';
import { ItemList } from './ItemList';
import { VaultItem, RawBackendItem, Breadcrumb } from '../../types';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { sortOptions } from '../../utils/constants';
import { getSimplifiedType } from '../../utils/helpers';
import { AddItemModal } from './AddItemModal';

export function VaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [allItems, setAllItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: 'Vault' }]);

  const [sortOrder, setSortOrder] = useState(() => {
    const saved = localStorage.getItem('sortOrder');
    return sortOptions.find(opt => opt.value === saved) || sortOptions[0];
  });
  const [vaultView, setVaultView] = useState(() => localStorage.getItem('vaultView') || 'grid');

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<'text' | 'key' | 'image' | 'video' | 'audio'>('text');

  const loadAllItems = async () => {
    try {
      const fetchedItemsRaw = await invoke<RawBackendItem[]>('get_all_vault_items');
      const transformedItems: VaultItem[] = fetchedItemsRaw.map(rawItem => ({
        ...rawItem,
        item_type: rawItem.type,
        type: getSimplifiedType(rawItem),
        created_at: new Date(rawItem.created_at).getTime(),
        updated_at: new Date(rawItem.updated_at).getTime(),
      }));
      setAllItems(transformedItems);
      return transformedItems;
    } catch (err) {
      console.error('Error loading all items:', err);
      return [];
    }
  };

  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const allItemsData = await loadAllItems();
      // Only filter for display, do not call get_vault_items again
      // Add this log to inspect the field names
      console.log('All items:', allItemsData);
      const filteredItems = allItemsData.filter(item => {
        if (currentFolderId && item.parent_id !== currentFolderId) return false;
        if (!currentFolderId && item.parent_id !== null) return false;
        if (selectedType !== 'all' && item.type !== selectedType) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            (item.tags && item.tags.some(tag => tag.toLowerCase().includes(q)))
          );
        }
        return true;
      });
      setItems(filteredItems);
    } catch (err: any) {
      console.error('Error loading items:', err);
      const errorMessage = err.message ? `${err.message}\n${err.stack}` : String(err);
      setError(`Failed to load items. ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folder: VaultItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (breadcrumbIndex: number) => {
    setCurrentFolderId(breadcrumbs[breadcrumbIndex].id);
    setBreadcrumbs(breadcrumbs.slice(0, breadcrumbIndex + 1));
  };

  const handleViewChange = (newView: string) => {
    setVaultView(newView);
    localStorage.setItem('vaultView', newView);
  };

  const handleItemsChange = async () => {
    setIsLoading(true);
    try {
      await loadAllItems();
      await loadItems();
    } finally {
      setIsLoading(false);
    }
  };

  // In-memory delete handler
  const handleDeleteItem = async (id: string) => {
    try {
      await invoke('delete_item', { id }); // Call backend to delete
      await handleItemsChange(); // Reload items from backend
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item.');
    }
  };

  useEffect(() => {
    loadAllItems();
  }, []);

  useEffect(() => {
    loadItems();
  }, [selectedType, sortOrder, currentFolderId, searchQuery]);

  useEffect(() => {
    const handleStorageChange = () => {
        setVaultView(localStorage.getItem('vaultView') || 'grid');
        const savedSort = localStorage.getItem('sortOrder');
        const newSortOrder = sortOptions.find(o => o.value === savedSort) || sortOptions[0];
        setSortOrder(newSortOrder);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getVaultTitle = () => {
    if (breadcrumbs.length > 1) {
        return breadcrumbs[breadcrumbs.length - 1].name;
    }
    return selectedType === 'all'
        ? 'Vault'
        : `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Vault`;
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="relative">
        <Sidebar
          selectedType={selectedType}
          onTypeSelect={setSelectedType}
          onItemsChange={handleItemsChange}
          currentFolderId={currentFolderId}
        />
        <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-gray-700/50 to-transparent"></div>
      </div>

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-10 flex flex-col justify-center h-20 px-4 sm:px-6 md:px-8 bg-gradient-to-b from-gray-900/90 to-gray-900/70 backdrop-blur-sm border-b border-gray-700/30">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white">{getVaultTitle()}</h1>
                {!isLoading && (
                  <span className="px-3 py-1 bg-gray-800/60 rounded-full text-sm text-gray-400">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
        </div>

        {/* Unified filter/search bar */}
        <section className="w-full flex justify-center bg-gray-900 py-4 border-b border-gray-800" style={{ zIndex: 1, position: 'relative' }}>
          <div className="w-full max-w-6xl flex flex-col sm:flex-row items-center gap-4 px-4">
            {/* Search Input (now first) */}
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 min-w-[180px] max-w-xl px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {/* View Switch (now after search) */}
            <div className="flex items-center bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => handleViewChange('grid')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  vaultView === 'grid'
                    ? 'bg-indigo-500/30 text-indigo-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title="Grid View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => handleViewChange('list')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  vaultView === 'list'
                    ? 'bg-indigo-500/30 text-indigo-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title="List View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
            {/* Sort Dropdown */}
            <div className="flex-shrink-0 w-full sm:w-48">
              <Listbox value={sortOrder} onChange={setSortOrder}>
                {({ open }) => (
                  <div className="relative w-full">
                    <Listbox.Button className="relative w-full cursor-default rounded-lg bg-gray-800/50 py-2 pl-3 pr-10 text-left text-sm focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 border border-gray-700/50">
                      <span className="block truncate text-gray-300">{sortOrder.label}</span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDownIcon
                          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </span>
                    </Listbox.Button>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm border border-gray-700">
                        {sortOptions.map((option, optionIdx) => (
                          <Listbox.Option
                            key={optionIdx}
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-4 ${
                                active ? "bg-indigo-600/50 text-white" : "text-gray-300"
                              }`
                            }
                            value={option}
                          >
                            {({ selected }) => (
                              <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>{option.label}</span>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                )}
              </Listbox>
            </div>
            {/* Refresh Button */}
            <button
              onClick={loadItems}
              disabled={isLoading}
              className="p-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800/70 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              title="Refresh"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </section>

        <div className="flex items-center text-xs text-gray-500 mt-1">
          {breadcrumbs.map((crumb, index) => (
            <Fragment key={crumb.id || 'root'}>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className="hover:text-gray-300 hover:underline disabled:hover:no-underline disabled:text-gray-400 font-medium disabled:cursor-default"
                disabled={index === breadcrumbs.length - 1}
              >
                {crumb.name}
              </button>
              {index < breadcrumbs.length - 1 && (
                <ChevronRightIcon className="h-3 w-3 mx-1 text-gray-600" />
              )}
            </Fragment>
          ))}
        </div>

        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <ItemList
            items={items}
            onItemsChange={loadItems}
            onDelete={handleDeleteItem}
            isLoading={isLoading}
            error={error}
            view={vaultView}
            onFolderClick={handleFolderClick}
          />
        </div>
        <AddItemModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          type={addType}
          onSuccess={handleItemsChange}
          parentId={currentFolderId}
        />
      </main>
    </div>
  );
}
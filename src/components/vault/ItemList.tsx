import { ItemCard } from './ItemCard';
import { CubeTransparentIcon } from '@heroicons/react/24/outline';
import { VaultItem } from '../../types';

interface ItemListProps {
  items: VaultItem[];
  onItemsChange: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  view: string;
  onFolderClick: (item: VaultItem) => void;
}

export const ItemList = ({ items, onItemsChange, error, view, onFolderClick }: ItemListProps) => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center">
          <p className="text-red-400">{error}</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center border-gray-700/50 rounded-xl">
          <CubeTransparentIcon className="h-16 w-16 text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">No items yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            Click the '+' or folder icon in the sidebar to add something here.
          </p>
        </div>
      );
    }

    const containerClasses = view === 'grid'
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        : "flex flex-col space-y-4";
    
    const sortedItems = [...items].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return 0;
    });

    return (
      <div className={containerClasses}>
        {sortedItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onDelete={onItemsChange}
            onFolderClick={onFolderClick}
          />
        ))}
      </div>
    );
}
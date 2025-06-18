import { Fragment, useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { invoke } from '@tauri-apps/api/core';
import { XMarkIcon, FolderPlusIcon } from '@heroicons/react/24/outline';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  parentId: string | null;
  folderType?: string;
}

export function AddFolderModal({ isOpen, onClose, onSuccess, parentId, folderType }: AddFolderModalProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Folder name cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      await invoke('add_folder', {
        args: { name: name.trim(), parentId, folderType },
      });
      await onSuccess();
      resetAndClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetAndClose = () => {
    setName('');
    setError(null);
    setIsLoading(false);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" initialFocus={inputRef} onClose={resetAndClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-gray-900 to-black border border-gray-700 shadow-xl transition-all">
                <div className="px-6 py-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <FolderPlusIcon className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                            <Dialog.Title className="text-lg font-medium text-white">
                            New Folder
                            </Dialog.Title>
                        </div>
                        </div>
                        <button
                        onClick={resetAndClose}
                        className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
                        >
                        <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                  <label htmlFor="folder-name" className="block text-sm font-medium text-gray-300 mb-2">Folder Name</label>
                  <input
                    ref={inputRef}
                    id="folder-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter folder name"
                  />
                  {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
                  <div className="flex justify-end space-x-3 mt-6">
                    <button type="button" onClick={resetAndClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">Cancel</button>
                    <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                      {isLoading ? 'Creating...' : 'Create Folder'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
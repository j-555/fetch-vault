import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  PlusIcon, 
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
// import { listen } from '@tauri-apps/api/event';
import { fileTypeFilters, itemTypeConfig } from '../../utils/constants';

interface Tag {
  id: string;
  name: string;
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'text' | 'key' | 'image' | 'video' | 'audio';
  onSuccess?: () => Promise<void>;
  parentId: string | null;
}

export function AddItemModal({ isOpen, onClose, type, onSuccess, parentId }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  // const [isDragOver, setIsDragOver] = useState(false);

  const config = itemTypeConfig[type];
  const isFileItem = type === 'image' || type === 'video' || type === 'audio';
  const isTextItem = type === 'text' || type === 'key';
  
  // const dragCounter = useRef(0);

  /*
  useEffect(() => {
    if (!isOpen || !isFileItem) return;

    const unlistenPromise = listen<string[]>('tauri://file-drop', (event) => {
        if (Array.isArray(event.payload) && event.payload.length > 0) {
            const filePath = event.payload[0];
            const filter = fileTypeFilters[type as keyof typeof fileTypeFilters];
            if (filter) {
                const fileExtension = filePath.split('.').pop()?.toLowerCase();
                if (fileExtension && filter.extensions.includes(fileExtension)) {
                    setSelectedFile(filePath);
                    setError(null);
                } else {
                    setError(`Invalid file type. Please drop a ${type} file.`);
                }
            }
        }
        dragCounter.current = 0;
        setIsDragOver(false);
    });

    return () => {
        unlistenPromise.then(unlisten => unlisten());
    };
  }, [isOpen, isFileItem, type]);
  */

  // Removed drag event handlers
  /*
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          setIsDragOver(true);
      }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current === 0) {
          setIsDragOver(false);
      }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    setError(null);
  };
  */

  const handleAddTag = () => {
    if (newTag.trim() && !tags.some(tag => tag.name.toLowerCase() === newTag.trim().toLowerCase())) {
      setTags([...tags, { id: crypto.randomUUID(), name: newTag.trim() }]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(tag => tag.id !== tagId));
  };

  const handleFileSelect = async () => {
    try {
      const filter = fileTypeFilters[type as keyof typeof fileTypeFilters];
      if (!filter) return;

      const selected = await open({
        multiple: false,
        filters: [filter]
      });

      if (selected && typeof selected === 'string') {
        setSelectedFile(selected);
        setError(null);
      }
    } catch (err) {
      console.error('Error selecting file:', err);
      setError('Failed to select file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (isTextItem && !content.trim()) {
      setError('Please enter some content');
      return;
    }
    if (isFileItem && !selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    try {
      if (isTextItem) {
        await invoke('add_text_item', {
          args: {
            name: name.trim(),
            content: content.trim(),
            item_type: type,
            tags: tags.map(t => t.name.trim()),
            parentId: parentId,
          }
        });
      } else if (isFileItem) {
        await invoke('add_file_item', {
          args: {
            name: name.trim(),
            file_path: selectedFile,
            tags: tags.map(t => t.name.trim()),
            parentId: parentId,
          }
        });
      }

      setName('');
      setContent('');
      setSelectedFile(null);
      setTags([]);

      if (onSuccess) {
        await onSuccess();
      }
      onClose();

    } catch (err) {
      console.error('[AddItemModal] Error adding item:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setName('');
    setContent('');
    setSelectedFile(null);
    setTags([]);
    setNewTag('');
    setError(null);
    onClose();
  };

  return (
    <>
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={resetAndClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gradient-to-b from-gray-900 to-black border border-gray-700 shadow-xl transition-all">
                <div className="px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
                        <config.icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <Dialog.Title className="text-lg font-medium text-white">
                          Add {config.title}
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

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      Name
                    </label>
                    <input 
                      type="text" 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Enter item name..."
                    />
                  </div>

                  {isTextItem ? (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label htmlFor="content" className="block text-sm font-medium text-gray-300">
                            Content
                        </label>
                      </div>
                      <textarea 
                        id="content" 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        rows={6} 
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm transition-colors resize-none"
                        placeholder="Enter your content here..."
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        File
                      </label>
                      <div
                        // Removed drag and drop event handlers
                        // onDragEnter={handleDragEnter}
                        // onDragLeave={handleDragLeave}
                        // onDragOver={handleDragOver}
                        // onDrop={handleDrop}
                        onClick={handleFileSelect}
                        className={`relative w-full p-6 border-2 border-dashed rounded-md cursor-pointer transition-all duration-200 ${selectedFile ? 'border-green-500 bg-green-500/5' : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'}`}
                      >
                        <div className="text-center">
                          {selectedFile ? (
                            <>
                              <config.icon className={`mx-auto h-8 w-8 ${config.color} mb-2`} />
                              <p className="text-gray-300 text-sm font-medium mb-1">File Selected</p>
                              <p className="text-gray-400 text-xs break-all">
                                {selectedFile.split(/[/\\]/).pop()}
                              </p>
                            </>
                          ) : (
                            <>
                              <CloudArrowUpIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-gray-300 text-sm mb-1">
                                Click to select {type} file
                                {/* Removed drag and drop text */}
                                {/* <p className="text-gray-500 text-xs">or drag and drop here</p> */}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tags
                    </label>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tags.map((tag) => (
                          <span 
                            key={tag.id} 
                            className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-700 border border-gray-600 text-gray-300 text-sm"
                          >
                            {tag.name}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveTag(tag.id)} 
                              className="ml-1.5 text-gray-400 hover:text-gray-300 transition-colors"
                            >
                              <XMarkIcon className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newTag} 
                        onChange={(e) => setNewTag(e.target.value)} 
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} 
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Add tag..."
                      />
                      <button 
                        type="button" 
                        onClick={handleAddTag} 
                        className="px-3 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-600 hover:text-white transition-colors"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-700/30 rounded-md">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button 
                      type="button" 
                      onClick={resetAndClose} 
                      className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isLoading} 
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {isLoading ? 'Adding...' : 'Add Item'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
    </>
  );
}
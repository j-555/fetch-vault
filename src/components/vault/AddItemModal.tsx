import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  PlusIcon, 
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { fileTypeFilters, itemTypeConfig } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';

interface Tag {
  id: string;
  name: string;
}

interface PasswordData {
  username: string;
  password: string;
  url: string;
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'text' | 'key' | 'image' | 'video' | 'audio';
  onSuccess?: () => Promise<void>;
  parentId?: string | null;
  editingItem?: any;
}

export function AddItemModal({ isOpen, onClose, type, onSuccess, parentId, editingItem }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [comments, setComments] = useState('');
  const [passwordData, setPasswordData] = useState<PasswordData>({
    username: '',
    password: '',
    url: ''
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { theme, themeVersion } = useTheme();

  // if editing, derive type and initial state from editingitem
  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '');
      setTags((editingItem.tags || []).map((tag: string) => ({ id: crypto.randomUUID(), name: tag })));
      setSelectedFile(null); // don't prefill file
      
      // parse password data if it's a key item
      if (editingItem.item_type === 'key' && editingItem.content) {
        const content = editingItem.content;
        const passwordData: PasswordData = {
          username: '',
          password: '',
          url: ''
        };
        
        // parse the structured content
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('Username:')) {
            passwordData.username = line.substring(9).trim();
          } else if (line.startsWith('Password:')) {
            passwordData.password = line.substring(9).trim();
          } else if (line.startsWith('URL:')) {
            passwordData.url = line.substring(4).trim();
          }
        }
        setPasswordData(passwordData);
        
        // extract comments from the end of the content
        const commentsMatch = content.match(/Comments: (.+)$/s);
        if (commentsMatch) {
          setComments(commentsMatch[1].trim());
        } else {
          setComments('');
        }
      } else {
        // for text items, extract comments and set content without comments
        let contentWithoutComments = editingItem.content || '';
        const commentsMatch = contentWithoutComments.match(/Comments: (.+)$/s);
        if (commentsMatch) {
          setComments(commentsMatch[1].trim());
          contentWithoutComments = contentWithoutComments.replace(/Comments: .+$/s, '').trim();
        } else {
          setComments('');
        }
        setContent(contentWithoutComments);
      }
    } else {
      setName('');
      setContent('');
      setComments('');
      setPasswordData({
        username: '',
        password: '',
        url: ''
      });
      setTags([]);
      setSelectedFile(null);
    }
  }, [editingItem]);

  // use type from editingitem if present
  const allowedTypes = ['text', 'key', 'image', 'video', 'audio'] as const;
  type AllowedType = typeof allowedTypes[number];
  let itemType: AllowedType = 'text';
  if (editingItem && allowedTypes.includes(editingItem.item_type)) {
    itemType = editingItem.item_type;
  } else if (type && allowedTypes.includes(type)) {
    itemType = type;
  }
  const config = itemTypeConfig[itemType];
  const isFileItem = itemType === 'image' || itemType === 'video' || itemType === 'audio';
  const isTextItem = itemType === 'text' || itemType === 'key';
  const isKeyItem = itemType === 'key';

  // const dragCounter = useRef(0);
  // const [isDragOver, setIsDragOver] = useState(false);

  // listen for file drops (drag and drop is so cool!)
  useEffect(() => {
    const unlistenPromise = listen<string[]>('tauri://file-drop', (event) => {
      console.log('file drop event:', event);
      if (event.payload && event.payload.length > 0) {
        const filePath = event.payload[0];
        console.log('dropped file:', filePath);
        setSelectedFile(filePath);
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

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
      const filter = fileTypeFilters[itemType as keyof typeof fileTypeFilters];
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

    if (isTextItem && !content.trim() && !isKeyItem) {
      setError('Please enter some content');
      return;
    }
    if (isKeyItem && !passwordData.username.trim() && !passwordData.password.trim() && !passwordData.url.trim()) {
      setError('Please enter at least one field');
      return;
    }
    if (isFileItem && !selectedFile && !editingItem) {
      setError('Please select a file');
      return;
    }

    // construct content for key items
    let finalContent = content;
    if (isKeyItem) {
      finalContent = '';
      if (passwordData.username.trim()) {
        finalContent += `Username: ${passwordData.username.trim()}\n`;
      }
      if (passwordData.password.trim()) {
        finalContent += `Password: ${passwordData.password.trim()}\n`;
      }
      if (passwordData.url.trim()) {
        finalContent += `URL: ${passwordData.url.trim()}\n`;
      }
      finalContent = finalContent.trimEnd();
    }

    // add comments to all item types if provided
    if (comments.trim()) {
      if (finalContent.trim()) {
        finalContent += '\n\n';
      }
      finalContent += `Comments: ${comments.trim()}`;
    }

    if (isTextItem && !finalContent.trim()) {
      setError('Please enter some content');
      return;
    }

    setIsLoading(true);
    try {
      if (editingItem) {
        // update existing item
        await invoke('update_item', {
          args: {
            id: editingItem.id,
            parent_id: editingItem.parent_id,
            name: name.trim(),
            item_type: editingItem.item_type,
            content: finalContent,
            tags: tags.map(t => t.name.trim()),
          },
        });
      } else if (isTextItem) {
        await invoke('add_text_item', {
          args: {
            name: name.trim(),
            content: finalContent.trim(),
            item_type: itemType,
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
      setComments('');
      setSelectedFile(null);
      setTags([]);

      if (onSuccess) {
        console.log('AddItemModal: Item added successfully, calling onSuccess');
        await onSuccess();
      }
      onClose();

    } catch (err) {
      console.error('[AddItemModal] Error adding/updating item:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setName('');
    setContent('');
    setComments('');
    setPasswordData({
      username: '',
      password: '',
      url: ''
    });
    setSelectedFile(null);
    setTags([]);
    setNewTag('');
    setError(null);
    onClose();
  };

  const getModalBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-white/90 backdrop-blur-sm border-gray-300';
      case 'dark':
        return 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50';
      default:
        return 'bg-gray-800/50 backdrop-blur-sm border-gray-700/50';
    }
  };

  const getTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-900';
      case 'dark':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  const getSecondaryTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-600';
      case 'dark':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getInputBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200 border-gray-400 text-gray-900 placeholder-gray-600';
      case 'dark':
        return 'bg-gray-700 border-gray-600 text-white placeholder-gray-400';
      default:
        return 'bg-gray-700 border-gray-600 text-white placeholder-gray-400';
    }
  };

  const getButtonBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200 hover:bg-gray-300 text-gray-700';
      case 'dark':
        return 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white';
      default:
        return 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white';
    }
  };

  const getTagBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200 border-gray-400 text-gray-700';
      case 'dark':
        return 'bg-gray-700 border-gray-600 text-gray-300';
      default:
        return 'bg-gray-700 border-gray-600 text-gray-300';
    }
  };

  const getFileUploadBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200 border-gray-400 hover:border-gray-500';
      case 'dark':
        return 'bg-gray-800 border-gray-600 hover:border-gray-500';
      default:
        return 'bg-gray-800 border-gray-600 hover:border-gray-500';
    }
  };

  const getBorderColor = () => {
    switch (theme) {
      case 'light':
        return 'border-gray-300';
      case 'dark':
        return 'border-gray-700';
      default:
        return 'border-gray-700';
    }
  };

  const getSectionBackground = () => {
    switch (theme) {
      case 'light':
        return 'bg-gray-200 border-gray-300';
      case 'dark':
        return 'bg-gray-800 border-gray-700';
      default:
        return 'bg-gray-800 border-gray-700';
    }
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
              <Dialog.Panel key={themeVersion} className={`w-full max-w-md transform overflow-hidden rounded-lg ${getModalBackground()} shadow-xl transition-all`}>
                <div className={`px-6 py-4 border-b ${getBorderColor()}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
                        <config.icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <Dialog.Title className={`text-lg font-medium ${getTextColor()}`}>
                          {editingItem ? 'Edit' : 'Add'} {config.title}
                        </Dialog.Title>
                      </div>
                    </div>
                    <button
                      onClick={resetAndClose}
                      className={`p-1 ${getSecondaryTextColor()} hover:${getTextColor()} hover:bg-gray-700 rounded transition-colors`}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div>
                    <label htmlFor="name" className={`block text-sm font-medium ${getSecondaryTextColor()} mb-2`}>
                      Name
                    </label>
                    <input 
                      type="text" 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className={`w-full px-3 py-2 ${getInputBackground()} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors`}
                      placeholder="Enter item name..."
                    />
                  </div>

                  {isTextItem ? (
                    isKeyItem ? (
                      <>
                        <div>
                          <label htmlFor="username" className={`block text-sm font-medium ${getSecondaryTextColor()} mb-2`}>
                            Username
                          </label>
                          <input 
                            type="text" 
                            id="username" 
                            value={passwordData.username} 
                            onChange={(e) => setPasswordData({...passwordData, username: e.target.value})} 
                            className={`w-full px-3 py-2 ${getInputBackground()} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors`}
                            placeholder="Enter username..."
                          />
                        </div>

                        <div>
                          <label htmlFor="password" className={`block text-sm font-medium ${getSecondaryTextColor()} mb-2`}>
                            Password
                          </label>
                          <input 
                            type="text" 
                            id="password" 
                            value={passwordData.password} 
                            onChange={(e) => setPasswordData({...passwordData, password: e.target.value})} 
                            className={`w-full px-3 py-2 ${getInputBackground()} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors`}
                            placeholder="Enter password..."
                          />
                        </div>

                        <div>
                          <label htmlFor="url" className={`block text-sm font-medium ${getSecondaryTextColor()} mb-2`}>
                            URL/Website
                          </label>
                          <input 
                            type="url" 
                            id="url" 
                            value={passwordData.url} 
                            onChange={(e) => setPasswordData({...passwordData, url: e.target.value})} 
                            className={`w-full px-3 py-2 ${getInputBackground()} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors`}
                            placeholder="Enter URL..."
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label htmlFor="content" className={`block text-sm font-medium ${getSecondaryTextColor()}`}>
                              Content
                          </label>
                        </div>
                        <textarea 
                          id="content"
                          value={content} 
                          onChange={(e) => setContent(e.target.value)} 
                          rows={6} 
                          className={`w-full px-3 py-2 ${getInputBackground()} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm transition-colors resize-none`}
                          placeholder="Enter your content here..."
                        />
                      </div>
                    )
                  ) : (
                    <div>
                      <label className={`block text-sm font-medium ${getSecondaryTextColor()} mb-2`}>
                        File
                      </label>
                      <div
                        onClick={handleFileSelect}
                        className={`relative w-full p-6 border-2 border-dashed rounded-md cursor-pointer transition-all duration-200 ${selectedFile ? 'border-green-500 bg-green-500/5' : getFileUploadBackground()}`}
                      >
                        <div className="text-center">
                          {selectedFile ? (
                            <>
                              <config.icon className={`mx-auto h-8 w-8 ${config.color} mb-2`} />
                              <p className={`${getSecondaryTextColor()} text-sm font-medium mb-1`}>File Selected</p>
                              <p className={`${getSecondaryTextColor()} text-xs break-all`}>
                                {selectedFile.split(/[/\\]/).pop()}
                              </p>
                            </>
                          ) : (
                            <>
                              <CloudArrowUpIcon className={`mx-auto h-8 w-8 ${getSecondaryTextColor()} mb-2`} />
                              <p className={`${getSecondaryTextColor()} text-sm mb-1`}>
                                Click to select {itemType} file
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments field for all item types */}
                  <div>
                    <label htmlFor="comments" className={`block text-sm font-medium ${getSecondaryTextColor()} mb-2`}>
                      Comments (Optional)
                    </label>
                    <textarea 
                      id="comments"
                      value={comments} 
                      onChange={(e) => setComments(e.target.value)} 
                      rows={3} 
                      className={`w-full px-3 py-2 ${getInputBackground()} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none`}
                      placeholder="Add any additional comments or notes..."
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${getSecondaryTextColor()} mb-2`}>
                      Tags
                    </label>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tags.map((tag) => (
                          <span 
                            key={tag.id} 
                            className={`inline-flex items-center px-2.5 py-1 rounded-md ${getTagBackground()} text-sm`}
                          >
                            {tag.name}
                            <button 
                              type="button" 
                              onClick={() => handleRemoveTag(tag.id)} 
                              className={`ml-1.5 ${getSecondaryTextColor()} hover:${getTextColor()} transition-colors`}
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
                        className={`flex-1 px-3 py-2 ${getInputBackground()} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors`}
                        placeholder="Add tag..."
                      />
                      <button 
                        type="button" 
                        onClick={handleAddTag} 
                        className={`px-3 py-2 ${getButtonBackground()} rounded-md transition-colors`}
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
                      className={`px-4 py-2 text-sm font-medium ${getButtonBackground()} rounded-md transition-colors`}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isLoading} 
                      className={`w-full px-4 py-2 ${getButtonBackground()} rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? 'Processing...' : (editingItem ? 'Update' : 'Add')}
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
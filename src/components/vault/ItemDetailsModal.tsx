import { Fragment, useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { invoke } from '@tauri-apps/api/core';
import {
  XMarkIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { typeIcons } from '../../utils/constants';
import { getExtensionFromMime } from '../../utils/helpers';
import { VaultItem } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ItemDetailsModalProps {
  item: VaultItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemDetailsModal({ item, isOpen, onClose: onCloseProp }: ItemDetailsModalProps) {
  type ViewMode = 'LOCKED' | 'CONFIRMING' | 'LOADING' | 'CONTENT_VISIBLE' | 'ERROR';
  const [viewMode, setViewMode] = useState<ViewMode>('LOCKED');

  const [content, setContent] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState('');

  const { login, error: authError, clearError: clearAuthError } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const resetAndClose = useCallback(() => {
    onCloseProp();
    setTimeout(() => {
      setContent(null);
      setMasterKey('');
      if (authError) clearAuthError();
    }, 200);
  }, [onCloseProp, authError, clearAuthError]);

  useEffect(() => {
    if (isOpen && item) {
      if (localStorage.getItem('requireKeyOnAccess') === 'true') {
        setViewMode('LOCKED');
      } else {
        setViewMode('LOADING');
        loadContent();
      }
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (viewMode === 'CONFIRMING') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [viewMode]);

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authError) clearAuthError();
    setViewMode('LOADING');

    const success = await login(masterKey);
    if (success) {
      setMasterKey('');
      loadContent();
    } else {
      setViewMode('CONFIRMING');
    }
  };

  const loadContent = async () => {
    if (!item) return;

    try {
      const result = await invoke<number[]>('get_item_content', { id: item.id });
      const uint8Array = new Uint8Array(result);
      if (item.type === 'text' || item.type === 'key') {
        setContent(new TextDecoder().decode(uint8Array)); // Decodes to string
      } else {
        const blob = new Blob([uint8Array], { type: item.item_type }); // Creates blob for non-text
        setContent(URL.createObjectURL(blob));
      }
      setViewMode('CONTENT_VISIBLE');
    } catch (err) {
      console.error('Error loading content:', err);
      setViewMode('ERROR');
    }
  };

  const handleDownload = async () => {
    if (!item || !content) return;
    try {
      const extension = getExtensionFromMime(item.item_type);
      const filename = item.name.includes('.') ? item.name : `${item.name}.${extension}`;

      const a = document.createElement('a');
      a.href = content;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error preparing download:', err);
    }
  };

  const renderLockedView = () => (
    <div className="py-8 text-center">
      <button
        onClick={() => setViewMode('CONFIRMING')}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
      >
        <LockClosedIcon className="h-5 w-5" />
        <span>Unlock to View Content</span>
      </button>
    </div>
  );

  const renderConfirmingView = () => (
    <div className="py-8 text-center">
      <h3 className="text-lg font-medium leading-6 text-white mb-2">Confirm Access</h3>
      <p className="text-sm text-gray-400 mb-4">Please enter your master key to view this item.</p>
      <form onSubmit={handleConfirmAction} className="space-y-4 max-w-sm mx-auto">
        <input
          ref={inputRef}
          type="password"
          value={masterKey}
          onChange={(e) => setMasterKey(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter your master key"
          required
        />
        {authError && <p className="text-sm text-red-400">Invalid master key. Please try again.</p>}
        <div className="flex justify-center space-x-3">
          <button type="button" onClick={() => setViewMode('LOCKED')} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-700/50 rounded-lg">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            Unlock
          </button>
        </div>
      </form>
    </div>
  );

  const renderLoadingView = () => (
    <div className="flex justify-center items-center h-full p-8">
      <ArrowPathIcon className="h-8 w-8 text-indigo-400 animate-spin" />
    </div>
  );

  const renderContentView = () => {
    if (item?.type === 'image' && content) {
      return (
        <div className="flex items-center justify-center p-4 bg-gray-900/50 rounded-lg">
          <img src={content} alt={item?.name} className="max-w-full max-h-[60vh] rounded-lg object-contain" />
        </div>
      );
    }

    if ((item?.type === 'text' || item?.type === 'key') && content) {
      return (
        <div className="relative group bg-gray-900/50 rounded-xl p-4 text-sm text-gray-300 font-mono overflow-x-auto max-h-[60vh] prose prose-invert"> {/* Added prose classes for styling */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      );
    }

    return <div className="text-center text-gray-400 p-8">No preview available for this file type.</div>
  };

  const renderModalContent = () => {
    switch (viewMode) {
      case 'LOCKED': return renderLockedView();
      case 'CONFIRMING': return renderConfirmingView();
      case 'LOADING': return renderLoadingView();
      case 'CONTENT_VISIBLE': return renderContentView();
      case 'ERROR': return <div className="text-center text-red-400 p-8">Failed to load content.</div>;
      default: return null;
    }
  };

  if (!item) return null;

  const Icon = typeIcons[item.type as keyof typeof typeIcons] || FolderIcon;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={resetAndClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/75" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-6 w-6 text-indigo-400" />
                    <Dialog.Title className="text-lg font-medium text-white">{item.name}</Dialog.Title>
                  </div>
                  <button onClick={resetAndClose} className="text-gray-400 hover:text-white"><XMarkIcon className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <ClockIcon className="h-4 w-4" />
                      <span>Created: {new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (<span key={tag} className="inline-flex items-center px-2 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 text-sm">{tag}</span>))}
                    </div>
                  )}
                  <div className="relative pt-2 min-h-[12rem] flex flex-col justify-center">
                    {renderModalContent()}
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={handleDownload}
                      disabled={viewMode !== 'CONTENT_VISIBLE'}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700/50 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
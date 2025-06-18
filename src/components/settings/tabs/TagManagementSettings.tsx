import { useState, useEffect, Fragment } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';


interface EditTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTag: string;
    onSave: (oldTag: string, newTag: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

const EditTagModal = ({ isOpen, onClose, currentTag, onSave, isLoading, error }: EditTagModalProps) => {
    const [newTagName, setNewTagName] = useState(currentTag);

    useEffect(() => {
        setNewTagName(currentTag);
    }, [currentTag, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newTagName.trim() && newTagName.trim() !== currentTag) {
            await onSave(currentTag, newTagName.trim());
        }
        onClose();
    };

    const inputClasses = "w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/75" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white mb-4">
                                    Edit Tag
                                </Dialog.Title>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="new-tag-name" className="block text-sm font-medium text-gray-300 mb-1">New Tag Name</label>
                                        <input
                                            type="text"
                                            id="new-tag-name"
                                            value={newTagName}
                                            onChange={(e) => setNewTagName(e.target.value)}
                                            className={inputClasses}
                                            required
                                        />
                                    </div>
                                    {error && <p className="text-sm text-red-400">{error}</p>}
                                    <div className="flex justify-end space-x-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-700/50 rounded-lg hover:bg-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isLoading ? 'Saving...' : 'Save Changes'}
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
};

interface DeleteTagConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (tag: string) => Promise<void>;
    tagToDelete: string;
    isLoading: boolean;
    error: string | null;
}

const DeleteTagConfirmationModal = ({ isOpen, onClose, onConfirm, tagToDelete, isLoading, error }: DeleteTagConfirmationModalProps) => {
    const handleSubmit = async () => {
        await onConfirm(tagToDelete);
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/75" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-red-700/50 p-6 text-left align-middle shadow-xl transition-all">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white mb-4">
                                            Delete Tag ({tagToDelete})
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-400">
                                                Are you sure you want to delete the tag "{tagToDelete}"? This will remove the tag from all items that use it. This action cannot be undone.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse sm:px-4">
                                    <button
                                        type="button"
                                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                        onClick={handleSubmit}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Deleting...' : 'Delete'}
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700/50 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:mt-0 sm:w-auto sm:text-sm"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export const TagManagementSettings = () => {
    const [tags, setTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [tagToEdit, setTagToEdit] = useState('');
    const [editError, setEditError] = useState<string | null>(null);
    const [isEditLoading, setIsEditLoading] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [tagToDelete, setTagToDelete] = useState('');
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);


    const fetchTags = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedTags = await invoke<string[]>('get_all_tags');
            setTags(fetchedTags);
        } catch (err: any) {
            console.error("Failed to fetch tags:", err);
            setError(err.message || "Failed to load tags.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    const handleEditClick = (tag: string) => {
        setTagToEdit(tag);
        setEditError(null);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (oldTag: string, newTag: string) => {
        setIsEditLoading(true);
        setEditError(null);
        try {
            await invoke('rename_tag', { args: { oldTagName: oldTag, newTagName: newTag } });
            await fetchTags(); 
            setIsEditModalOpen(false);
        } catch (err: any) {
            console.error("Error during tag rename:", err);
            setEditError(err.message || "Failed to rename tag.");
        } finally {
            setIsEditLoading(false);
        }
    };

    const handleDeleteClick = (tag: string) => {
        setTagToDelete(tag);
        setDeleteError(null);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async (tag: string) => {
        setIsDeleteLoading(true);
        setDeleteError(null);
        try {
            await invoke('delete_tag', { args: { tagName: tag } });
            await fetchTags();
            setIsDeleteModalOpen(false);
        } catch (err: any) {
            console.error("Error during tag deletion:", err);
            setDeleteError(err.message || "Failed to delete tag.");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    return (
        <div className="p-2">
            <h3 className="text-base font-medium text-white mb-4">Tag Management</h3>
            {isLoading ? (
                <p className="text-sm text-gray-500">Loading tags...</p>
            ) : error ? (
                <p className="text-sm text-red-400">{error}</p>
            ) : tags.length === 0 ? (
                <p className="text-sm text-gray-500">No tags found in your vault.</p>
            ) : (
                <div className="space-y-3">
                    {tags.map((tag) => (
                        <div key={tag} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            <span className="text-gray-300 text-sm font-medium">{tag}</span>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleEditClick(tag)}
                                    className="px-2.5 py-1 text-xs bg-indigo-600/20 text-indigo-400 rounded-md hover:bg-indigo-600/30 transition-colors flex items-center space-x-1"
                                >
                                    <PencilIcon className="h-3 w-3" />
                                    <span>Edit</span>
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(tag)}
                                    className="px-2.5 py-1 text-xs bg-red-600/20 text-red-400 rounded-md hover:bg-red-600/30 transition-colors flex items-center space-x-1"
                                >
                                    <TrashIcon className="h-3 w-3" />
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-6 border-t border-gray-700/50 pt-4">
                <p className="text-xs text-gray-500">
                    Note: Editing a tag will update its name across all items. Deleting a tag will remove it from all items that use it.
                </p>
            </div>

            <EditTagModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                currentTag={tagToEdit}
                onSave={handleSaveEdit}
                isLoading={isEditLoading}
                error={editError}
            />

            <DeleteTagConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                tagToDelete={tagToDelete}
                isLoading={isDeleteLoading}
                error={deleteError}
            />
        </div>
    );
};
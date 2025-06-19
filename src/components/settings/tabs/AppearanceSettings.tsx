import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { ArrowsUpDownIcon, Squares2X2Icon, Bars3Icon } from '@heroicons/react/24/outline';
import { SettingRow } from '../SettingRow';
import { sortOptions } from '../../../utils/constants';

interface AppearanceSettingsProps {
    vaultView: string;
    setVaultView: (view: string) => void;
    sortOrder: { value: string; label: string; };
    setSortOrder: (order: { value: string; label: string; }) => void;
}

export const AppearanceSettings = () => {
    const [theme, setTheme] = useState('midnight');

    useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('dark', 'midnight');
        if (theme === 'dark') {
            html.classList.add('dark');
        } else if (theme === 'midnight') {
            html.classList.add('midnight');
        }
        // For 'light', no class is added (default)
    }, [theme]);

    return (
        <div className="p-2">
            <div className="mb-4">
                <label htmlFor="theme-select" className="block text-base font-semibold text-white mb-2">Theme</label>
                <select
                    id="theme-select"
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="midnight">Midnight</option>
                </select>
            </div>
        </div>
    );
};
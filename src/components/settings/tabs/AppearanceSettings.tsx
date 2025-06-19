import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { SettingRow } from '../SettingRow';
import { invoke } from '@tauri-apps/api/core';

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'midnight', label: 'Midnight' },
];

export const AppearanceSettings = () => {
  const [theme, setTheme] = useState(themeOptions[1]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch theme from backend on mount
    (async () => {
      try {
        setIsLoading(true);
        const savedTheme = await invoke<string>('get_theme');
        const found = themeOptions.find(opt => opt.value === savedTheme);
        if (found) setTheme(found);
        // Apply theme to document
        applyTheme(found ? found.value : theme.value);
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const applyTheme = (themeValue: string) => {
    const html = document.documentElement;
    html.classList.remove('dark', 'midnight');
    if (themeValue === 'dark') {
      html.classList.add('dark');
    } else if (themeValue === 'midnight') {
      html.classList.add('midnight');
    }
    // For 'light', no class is added (default)
  };

  const handleThemeChange = async (option: { value: string; label: string }) => {
    setTheme(option);
    applyTheme(option.value);
    setIsLoading(true);
    try {
      await invoke('set_theme', { theme: option.value });
    } catch {}
    setIsLoading(false);
  };

  return (
    <div className="p-2">
      <SettingRow title="Theme" description="Choose your preferred theme.">
        <Listbox value={theme} onChange={handleThemeChange} disabled={isLoading}>
          <div className="relative w-48">
            <Listbox.Button className="relative w-full px-3 py-1.5 text-left bg-gray-700/50 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <span className="block truncate">{theme.label}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </span>
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="absolute z-10 bottom-full mb-2 w-full bg-gray-800 rounded-lg border border-gray-700 shadow-lg max-h-60 overflow-auto focus:outline-none sm:text-sm">
                {themeOptions.map((option) => (
                  <Listbox.Option key={option.value} value={option} className={({ active }) => `relative cursor-pointer select-none py-2 px-3 text-sm ${active ? 'bg-indigo-600/50 text-white' : 'text-gray-300'}`}>{option.label}</Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </SettingRow>
    </div>
  );
};
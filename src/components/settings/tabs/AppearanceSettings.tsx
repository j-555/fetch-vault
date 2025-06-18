import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ArrowsUpDownIcon, Squares2X2Icon, Bars3Icon } from '@heroicons/react/24/outline';
import { SettingRow } from '../SettingRow';
import { sortOptions } from '../../../utils/constants';

interface AppearanceSettingsProps {
    vaultView: string;
    setVaultView: (view: string) => void;
    sortOrder: { value: string; label: string; };
    setSortOrder: (order: { value: string; label: string; }) => void;
}

export const AppearanceSettings = ({ vaultView, setVaultView, sortOrder, setSortOrder }: AppearanceSettingsProps) => (
    <div className="p-2">
        <SettingRow title="Default View" description="Choose how items are displayed in your vault.">
            <div className="flex items-center space-x-1 bg-gray-700/50 p-1 rounded-lg">
                <button onClick={() => setVaultView('grid')} title="Grid View" className={`p-1.5 text-sm rounded-md transition-colors ${vaultView === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}><Squares2X2Icon className="h-5 w-5"/></button>
                <button onClick={() => setVaultView('list')} title="List View" className={`p-1.5 text-sm rounded-md transition-colors ${vaultView === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}><Bars3Icon className="h-5 w-5"/></button>
            </div>
        </SettingRow>

        <SettingRow title="Sort Items By" description="Set the default sorting for your vault items.">
            <Listbox value={sortOrder} onChange={setSortOrder}>
                <div className="relative w-52">
                    <Listbox.Button className="relative w-full px-3 py-1.5 text-left bg-gray-700/50 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <span className="block truncate">{sortOrder.label}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ArrowsUpDownIcon className="h-4 w-4 text-gray-400" /></span>
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <Listbox.Options className="absolute z-10 mt-1 w-full bg-gray-800 rounded-lg border border-gray-700 shadow-lg max-h-60 overflow-auto focus:outline-none sm:text-sm">
                            {sortOptions.map((option) => (<Listbox.Option key={option.value} value={option} className={({ active }) => `relative cursor-pointer select-none py-2 px-3 text-sm ${active ? 'bg-indigo-600/50 text-white' : 'text-gray-300'}`}>{option.label}</Listbox.Option>))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </SettingRow>
    </div>
);
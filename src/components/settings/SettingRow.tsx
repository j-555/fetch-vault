import React from 'react';

interface SettingRowProps {
    title: string;
    description: string;
    children: React.ReactNode;
}

export const SettingRow = ({ title, description, children }: SettingRowProps) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b border-gray-700/50 last:border-b-0">
        <div className="mb-2 sm:mb-0">
            <p className="text-sm font-medium text-gray-200">{title}</p>
            <p className="text-xs text-gray-500 max-w-xs">{description}</p>
        </div>
        <div className="flex-shrink-0">
            {children}
        </div>
    </div>
);
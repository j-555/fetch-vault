import React from 'react';

interface TabButtonProps {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

export const TabButton = ({ icon: Icon, label, isActive, onClick }: TabButtonProps) => {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm group ${
                isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
            <Icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                isActive ? 'text-indigo-300' : 'text-gray-500 group-hover:text-gray-300'
            }`} />
            <span>{label}</span>
        </button>
    );
};
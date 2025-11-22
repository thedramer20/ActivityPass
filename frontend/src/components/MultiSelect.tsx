import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface MultiSelectProps {
    value: string[];
    onChange: (value: string[]) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    showSearch?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = '',
    className = '',
    showSearch = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const selectRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = showSearch && searchTerm
        ? options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : options;

    const selectedLabels = value.map(val =>
        options.find(opt => opt.value === val)?.label || val
    );

    const handleSelect = (optionValue: string) => {
        if (value.includes(optionValue)) {
            onChange(value.filter(v => v !== optionValue));
        } else {
            onChange([...value, optionValue]);
        }
    };

    const handleSelectAll = () => {
        if (value.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(opt => opt.value));
        }
    };

    const displayText = selectedLabels.length > 0
        ? selectedLabels.length === options.length
            ? t('common.all', { defaultValue: 'All' })
            : selectedLabels.length === 1
                ? selectedLabels[0]
                : `${selectedLabels.length} ${t('common.selected', { defaultValue: 'selected' })}`
        : placeholder;

    return (
        <div ref={selectRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm text-left flex items-center justify-between min-h-[2.5rem]"
            >
                <span className={selectedLabels.length > 0 ? '' : 'text-gray-500 dark:text-gray-400'}>
                    {displayText}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600 max-h-60 overflow-hidden">
                    {showSearch && options.length > 5 && (
                        <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('common.search', { defaultValue: 'Search...' })}
                                className="w-full px-2 py-1 text-sm bg-gray-50 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    )}
                    <div className="max-h-48 overflow-y-auto">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="w-full px-3 py-2 text-left text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-600"
                        >
                            {value.length === options.length
                                ? t('common.deselectAll', { defaultValue: 'Deselect All' })
                                : t('common.selectAll', { defaultValue: 'Select All' })
                            }
                        </button>
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center ${value.includes(option.value)
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'text-gray-900 dark:text-gray-100'
                                    }`}
                            >
                                <span className="mr-2">
                                    {value.includes(option.value) ? '✓' : '○'}
                                </span>
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
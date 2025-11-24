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
                className="w-full px-3 py-2 bg-app-light-input-bg border border-app-light-border rounded-lg focus:ring-1 focus:ring-app-light-accent focus:border-app-light-accent dark:bg-app-dark-input-bg dark:border-app-dark-border dark:text-app-dark-text dark:focus:ring-app-dark-accent dark:focus:border-app-dark-accent transition-all duration-200 text-sm text-left flex items-center justify-between min-h-[2.5rem] hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover"
            >
                <span className={selectedLabels.length > 0 ? 'text-app-light-text-primary dark:text-app-dark-text-primary' : 'text-app-light-text-secondary dark:text-app-dark-text-secondary'}>
                    {displayText}
                </span>
                <svg
                    className={`w-4 h-4 text-app-light-text-secondary transition-transform dark:text-app-dark-text-secondary ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 overflow-hidden border rounded-lg shadow-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border max-h-60">
                    {showSearch && options.length > 5 && (
                        <div className="p-2 border-b border-app-light-border dark:border-app-dark-border">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('common.search', { defaultValue: 'Search...' })}
                                className="w-full px-3 py-2 text-sm transition-all duration-200 border rounded-lg bg-app-light-surface border-app-light-border focus:ring-2 focus:ring-app-light-accent focus:border-app-light-accent dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text dark:focus:ring-app-dark-accent dark:focus:border-app-dark-accent hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover"
                            />
                        </div>
                    )}
                    <div className="overflow-y-auto max-h-48">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="w-full px-3 py-2 text-sm font-medium text-left transition-colors border-b hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover text-app-light-accent dark:text-app-dark-accent border-app-light-border dark:border-app-dark-border"
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
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover transition-colors flex items-center ${value.includes(option.value)
                                    ? 'bg-app-light-accent-light text-app-light-accent dark:bg-app-dark-accent-light dark:text-app-dark-accent'
                                    : 'text-app-light-text-primary dark:text-app-dark-text-primary'
                                    }`}
                            >
                                <span className="mr-2 text-app-light-accent dark:text-app-dark-accent">
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
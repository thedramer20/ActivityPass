import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CustomDatePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    value,
    onChange,
    placeholder = '',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const pickerRef = useRef<HTMLDivElement>(null);
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value) {
            setCurrentDate(new Date(value));
        }
    }, [value]);

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    };

    const handleDateSelect = (day: number) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const formattedDate = formatDate(selectedDate);
        onChange(formattedDate);
        setIsOpen(false);
    };

    const changeMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    const monthNames = i18n.language === 'zh'
        ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const weekdayNames = i18n.language === 'zh'
        ? ['日', '一', '二', '三', '四', '五', '六']
        : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div ref={pickerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm text-left flex items-center justify-between"
            >
                <span className={value ? '' : 'text-gray-500 dark:text-gray-400'}>
                    {value ? formatDisplayDate(value) : placeholder}
                </span>
                <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
                        <button
                            type="button"
                            onClick={() => changeMonth('prev')}
                            className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {currentDate.getFullYear()} {monthNames[currentDate.getMonth()]}
                        </span>
                        <button
                            type="button"
                            onClick={() => changeMonth('next')}
                            className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 p-2">
                        {weekdayNames.map((day, index) => (
                            <div key={index} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1 p-2">
                        {getDaysInMonth(currentDate).map((day, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => day && handleDateSelect(day)}
                                disabled={!day}
                                className={`text-center text-sm py-2 rounded-md transition-colors ${
                                    day
                                        ? `hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                            formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)) === value
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'text-gray-900 dark:text-gray-100'
                                          }`
                                        : ''
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomDatePicker;
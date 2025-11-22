import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface DateTimePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
    value,
    onChange,
    placeholder = '',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState({ hour: 0, minute: 0 });
    const [hourDropdownOpen, setHourDropdownOpen] = useState(false);
    const [minuteDropdownOpen, setMinuteDropdownOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setHourDropdownOpen(false);
                setMinuteDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            setCurrentDate(date);
            setSelectedTime({
                hour: date.getHours(),
                minute: date.getMinutes()
            });
        }
    }, [value]);

    const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${minute}`;
    };

    const formatDisplayDateTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, selectedTime.hour, selectedTime.minute);
        const formattedDateTime = formatDateTime(selectedDate);
        onChange(formattedDateTime);
    };

    const handleTimeSelect = (hour: number, minute: number) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, minute);
        const formattedDateTime = formatDateTime(selectedDate);
        onChange(formattedDateTime);
        setSelectedTime({ hour, minute });
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
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const weekdayNames = i18n.language === 'zh'
        ? ['日', '一', '二', '三', '四', '五', '六']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <div ref={pickerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm text-left flex items-center justify-between"
            >
                <span className={value ? '' : 'text-gray-500 dark:text-gray-400'}>
                    {value ? formatDisplayDateTime(value) : placeholder}
                </span>
                <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-96 mt-1 bg-white border border-gray-300 rounded-xl shadow-2xl dark:bg-gray-800 dark:border-gray-600 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
                        <button
                            type="button"
                            onClick={() => changeMonth('prev')}
                            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {currentDate.getFullYear()} {monthNames[currentDate.getMonth()]}
                        </span>
                        <button
                            type="button"
                            onClick={() => changeMonth('next')}
                            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex">
                        {/* Date Section */}
                        <div className="flex-1 p-4">
                            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 dark:text-gray-400">
                                {t('datetime.date', { defaultValue: 'Date' })}
                            </h3>

                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {weekdayNames.map((day, index) => (
                                    <div key={index} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {getDaysInMonth(currentDate).map((day, index) => {
                                    const isSelected = value && (() => {
                                        const selectedDate = new Date(value);
                                        return selectedDate.getDate() === day &&
                                               selectedDate.getMonth() === currentDate.getMonth() &&
                                               selectedDate.getFullYear() === currentDate.getFullYear();
                                    })();

                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => day && handleDateSelect(day)}
                                            disabled={!day}
                                            className={`text-center text-sm py-2 rounded-lg transition-colors ${
                                                day
                                                    ? `hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                                                            : 'text-gray-900 dark:text-gray-100'
                                                      }`
                                                    : ''
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time Section */}
                        <div className="w-32 p-4 border-l border-gray-200 dark:border-gray-600">
                            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 dark:text-gray-400">
                                {t('datetime.time', { defaultValue: 'Time' })}
                            </h3>

                            <div className="space-y-3">
                                {/* Hours */}
                                <div className="relative">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {t('datetime.hour', { defaultValue: 'Hour' })}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHourDropdownOpen(!hourDropdownOpen);
                                            setMinuteDropdownOpen(false);
                                        }}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm text-left flex items-center justify-between"
                                    >
                                        <span>{String(selectedTime.hour).padStart(2, '0')}</span>
                                        <svg
                                            className={`w-4 h-4 text-gray-400 transition-transform ${hourDropdownOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {hourDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600 max-h-48 overflow-y-auto">
                                            {hours.map(hour => (
                                                <button
                                                    key={hour}
                                                    type="button"
                                                    onClick={() => {
                                                        handleTimeSelect(hour, selectedTime.minute);
                                                        setHourDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                                        hour === selectedTime.hour
                                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                            : 'text-gray-900 dark:text-gray-100'
                                                    }`}
                                                >
                                                    {String(hour).padStart(2, '0')}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Minutes */}
                                <div className="relative">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {t('datetime.minute', { defaultValue: 'Minute' })}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMinuteDropdownOpen(!minuteDropdownOpen);
                                            setHourDropdownOpen(false);
                                        }}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm text-left flex items-center justify-between"
                                    >
                                        <span>{String(selectedTime.minute).padStart(2, '0')}</span>
                                        <svg
                                            className={`w-4 h-4 text-gray-400 transition-transform ${minuteDropdownOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {minuteDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600 max-h-48 overflow-y-auto">
                                            {minutes.map(minute => (
                                                <button
                                                    key={minute}
                                                    type="button"
                                                    onClick={() => {
                                                        handleTimeSelect(selectedTime.hour, minute);
                                                        setMinuteDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                                        minute === selectedTime.minute
                                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                            : 'text-gray-900 dark:text-gray-100'
                                                    }`}
                                                >
                                                    {String(minute).padStart(2, '0')}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                        >
                            {t('common.done')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateTimePicker;
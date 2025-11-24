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
                className="flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-all duration-200 border rounded-lg bg-app-light-input-bg border-app-light-border focus:ring-1 focus:ring-app-light-accent hover:border-app-light-border-hover focus:border-app-light-accent dark:bg-app-dark-input-bg dark:border-app-dark-border dark:text-app-dark-text dark:focus:ring-app-dark-accent dark:focus:border-app-dark-accent dark:hover:border-app-dark-border-hover"
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
                <div className="absolute z-50 mt-1 overflow-hidden border shadow-2xl w-96 bg-app-light-surface border-app-light-border rounded-xl dark:bg-app-dark-surface dark:border-app-dark-border">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-app-light-border dark:border-app-dark-border">
                        <button
                            type="button"
                            onClick={() => changeMonth('prev')}
                            className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-sm font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                            {currentDate.getFullYear()} {monthNames[currentDate.getMonth()]}
                        </span>
                        <button
                            type="button"
                            onClick={() => changeMonth('next')}
                            className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex">
                        {/* Date Section */}
                        <div className="flex-1 p-4">
                            <h3 className="mb-3 text-xs font-medium tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                {t('datetime.date', { defaultValue: 'Date' })}
                            </h3>

                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {weekdayNames.map((day, index) => (
                                    <div key={index} className="py-1 text-xs font-medium text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
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
                                            className={`text-center text-sm py-2 rounded-lg transition-colors ${day
                                                ? `hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover ${isSelected
                                                    ? 'bg-app-light-accent text-app-light-text-on-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover'
                                                    : 'text-app-light-text-primary dark:text-app-dark-text-primary'
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
                        <div className="w-32 p-4 border-l border-app-light-border dark:border-app-dark-border">
                            <h3 className="mb-3 text-xs font-medium tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                {t('datetime.time', { defaultValue: 'Time' })}
                            </h3>

                            <div className="space-y-3">
                                {/* Hours */}
                                <div className="relative">
                                    <label className="block mb-1 text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('datetime.hour', { defaultValue: 'Hour' })}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHourDropdownOpen(!hourDropdownOpen);
                                            setMinuteDropdownOpen(false);
                                        }}
                                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-all duration-200 border rounded-lg bg-app-light-input-bg border-app-light-border focus:ring-1 focus:ring-app-light-accent hover:border-app-light-border-hover focus:border-app-light-accent dark:bg-app-dark-input-bg dark:border-app-dark-border dark:text-app-dark-text dark:focus:ring-app-dark-accent dark:focus:border-app-dark-accent dark:hover:border-app-dark-border-hover"
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
                                        <div className="absolute z-50 w-full mt-1 overflow-y-auto border rounded-lg shadow-lg bg-app-light-surface-dark border-app-light-border dark:bg-app-dark-surface-dark dark:border-app-dark-border max-h-48">
                                            {hours.map(hour => (
                                                <button
                                                    key={hour}
                                                    type="button"
                                                    onClick={() => {
                                                        handleTimeSelect(hour, selectedTime.minute);
                                                        setHourDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover transition-colors ${hour === selectedTime.hour
                                                        ? 'bg-app-light-accent text-app-light-text-on-accent dark:bg-app-dark-accent dark:text-app-dark-text-on-accent'
                                                        : 'text-app-light-text-primary dark:text-app-dark-text-primary'
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
                                    <label className="block mb-1 text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('datetime.minute', { defaultValue: 'Minute' })}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMinuteDropdownOpen(!minuteDropdownOpen);
                                            setHourDropdownOpen(false);
                                        }}
                                        className="flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-all duration-200 border rounded-lg bg-app-light-input-bg border-app-light-border focus:ring-1 focus:ring-app-light-accent hover:border-app-light-border-hover focus:border-app-light-accent dark:bg-app-dark-input-bg dark:border-app-dark-border dark:text-app-dark-text dark:focus:ring-app-dark-accent dark:focus:border-app-dark-accent dark:hover:border-app-dark-border-hover"
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
                                        <div className="absolute z-50 w-full mt-1 overflow-y-auto border rounded-lg shadow-lg bg-app-light-surface-dark border-app-light-border dark:bg-app-dark-surface-dark dark:border-app-dark-border max-h-48">
                                            {minutes.map(minute => (
                                                <button
                                                    key={minute}
                                                    type="button"
                                                    onClick={() => {
                                                        handleTimeSelect(selectedTime.hour, minute);
                                                        setMinuteDropdownOpen(false);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover transition-colors ${minute === selectedTime.minute
                                                        ? 'bg-app-light-accent text-app-light-text-on-accent dark:bg-app-dark-accent dark:text-app-dark-text-on-accent'
                                                        : 'text-app-light-text-primary dark:text-app-dark-text-primary'
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
                    <div className="flex items-center justify-end gap-3 p-4 border-t border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1.5 text-sm font-medium text-app-light-text-primary bg-app-light-surface border border-app-light-border rounded-lg hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1.5 text-sm font-medium text-app-light-text-on-accent bg-app-light-accent border border-transparent rounded-lg hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent transition-colors"
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
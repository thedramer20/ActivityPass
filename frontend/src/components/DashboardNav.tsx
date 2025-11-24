import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface DashboardNavItem {
    label: string;
    href: string;
    active?: boolean;
}

const DashboardNav: React.FC<{ items: DashboardNavItem[] }> = ({ items }) => {
    const location = useLocation();
    return (
        <nav className="mb-6 border-b border-app-light-border dark:border-app-dark-border">
            <ul className="flex flex-wrap gap-4 text-sm">
                {items.map(item => {
                    const isActive = item.active ?? location.pathname === item.href;
                    return (
                        <li key={item.href}>
                            <Link
                                to={item.href}
                                className={`inline-flex items-center gap-2 border-b-2 px-1.5 pb-2 font-medium transition-colors ${isActive ? 'border-primary-500 text-app-light-text-primary dark:border-primary-500 dark:text-app-dark-text-primary' : 'border-transparent text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary'}`}
                            >
                                {item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default DashboardNav;

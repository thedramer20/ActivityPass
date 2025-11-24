import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types/admin';

type Notice = { type: 'success' | 'error' | 'info'; text: string };

const AdminDashboardPage: React.FC = () => {
    const { tokens, me } = useAuth();
    const { t } = useTranslation();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);

    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const loadUsers = useCallback(async () => {
        if (!tokens) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users/', { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authHeaders, t]);

    useEffect(() => {
        if (tokens && me?.role === 'admin') {
            loadUsers();
        }
    }, [tokens, me, loadUsers]);

    const infoCards = [
        { label: t('admin.totalUsers'), value: users.length },
        { label: t('admin.totalStudents'), value: users.filter(u => u.role === 'student').length, to: '/admin/students' },
        { label: t('admin.totalStaff'), value: users.filter(u => u.role === 'staff').length, to: '/admin/staff' },
    ];

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-app-light-accent bg-app-light-accent/10 text-app-light-text-primary dark:border-app-dark-accent dark:bg-app-dark-accent/20 dark:text-app-dark-text-primary' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-app-light-border bg-app-light-surface-secondary text-app-light-text-primary dark:border-app-dark-border dark:bg-app-dark-surface-secondary dark:text-app-dark-text-primary'}`}>{notice.text}</div>
                )}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {infoCards.map(card => (
                        card.to ? (
                            <Link key={card.label} to={card.to} className="p-5 transition border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface hover:border-app-light-border dark:hover:border-app-dark-border focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-app-light-accent dark:focus:ring-app-dark-accent">
                                <p className="text-sm text-app-light-text-tertiary dark:text-app-dark-text-tertiary">{card.label}</p>
                                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                            </Link>
                        ) : (
                            <article key={card.label} className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                                <p className="text-sm text-app-light-text-tertiary dark:text-app-dark-text-tertiary">{card.label}</p>
                                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                            </article>
                        )
                    ))}
                </section>
            </div>
        </main>
    );
};

export default AdminDashboardPage;

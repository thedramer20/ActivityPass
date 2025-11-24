import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <article className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{value}</p>
    </article>
);

const StaffDashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const { me } = useAuth();
    const stats = [
        { label: t('staff.todo.reviews'), value: 2 },
        { label: t('staff.todo.pendingApprovals'), value: 5 },
        { label: t('staff.todo.activitiesOwned'), value: 3 },
    ];

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                {me?.username && <p className="text-xs tracking-widest uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">{me.username}</p>}

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {stats.map(card => (
                        <StatCard key={card.label} label={card.label} value={card.value} />
                    ))}
                </section>

                <section className="p-6 border border-dashed rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                    <h2 className="mb-3 text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('staff.quickActions')}</h2>
                    <p className="mb-4 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('staff.quickActionsDesc')}</p>
                    <div className="flex flex-wrap gap-3">
                        <button className="px-4 py-2 text-sm text-white rounded-md bg-primary-500 hover:bg-primary-600">{t('staff.actions.createActivity')}</button>
                        <button className="px-4 py-2 text-sm border rounded-md border-app-light-border dark:border-app-dark-border text-app-light-text-primary dark:text-app-dark-text-primary bg-app-light-surface dark:bg-app-dark-surface hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover">{t('staff.actions.approveRequests')}</button>
                        <button className="px-4 py-2 text-sm border rounded-md border-app-light-border dark:border-app-dark-border text-app-light-text-primary dark:text-app-dark-text-primary bg-app-light-surface dark:bg-app-dark-surface hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover">{t('staff.actions.viewSchedule')}</button>
                    </div>
                </section>

                <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                    <h2 className="mb-4 text-lg font-semibold">{t('staff.activityQueue.title')}</h2>
                    <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('staff.activityQueue.empty')}</p>
                </section>
            </div>
        </main>
    );
};

export default StaffDashboardPage;

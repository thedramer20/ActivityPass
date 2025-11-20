import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

type StudentProfile = {
    major?: string;
    college?: string;
    class_name?: string;
    gender?: string;
    phone?: string;
    chinese_level?: string;
    year?: number;
};

type AdminUser = {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role: 'admin' | 'staff' | 'student' | 'user';
    must_change_password?: boolean;
    student_profile?: StudentProfile | null;
};

type Notice = { type: 'success' | 'error' | 'info'; text: string };

const emptyProfile = (): StudentProfile => ({
    major: '',
    college: '',
    class_name: '',
    gender: '',
    phone: '',
    chinese_level: '',
    year: undefined,
});

const AdminDashboardPage: React.FC = () => {
    const { tokens, me } = useAuth();
    const { t } = useTranslation();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [formState, setFormState] = useState({
        first_name: '',
        last_name: '',
        email: '',
        student_profile: emptyProfile(),
    });
    const [creatingStaff, setCreatingStaff] = useState(false);
    const [newStaff, setNewStaff] = useState({ username: '', email: '' });
    const [resetting, setResetting] = useState(false);
    const [saving, setSaving] = useState(false);

    const selectedUser = useMemo(() => users.find(u => u.id === selectedId) || null, [users, selectedId]);

    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const loadUsers = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const qs = query ? `?q=${encodeURIComponent(query)}` : '';
            const res = await fetch(`/api/admin/users/${qs}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setUsers(data);
            if (data.length && !selectedId) {
                setSelectedId(data[0].id);
            }
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authHeaders, selectedId, t]);

    useEffect(() => {
        if (tokens && me?.role === 'admin') {
            loadUsers();
        }
    }, [tokens, me, loadUsers]);

    useEffect(() => {
        if (selectedUser) {
            setFormState({
                first_name: selectedUser.first_name || '',
                last_name: selectedUser.last_name || '',
                email: selectedUser.email || '',
                student_profile: {
                    ...emptyProfile(),
                    ...(selectedUser.student_profile || {}),
                },
            });
        }
    }, [selectedUser]);

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadUsers(search);
    };

    const updateUser = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            const payload: any = {
                first_name: formState.first_name,
                last_name: formState.last_name,
                email: formState.email,
            };
            payload.student_profile = formState.student_profile;
            if (payload.student_profile && payload.student_profile.year === '') {
                payload.student_profile.year = undefined;
            }
            const res = await fetch(`/api/admin/users/${selectedUser.id}/`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('update_failed');
            setNotice({ type: 'success', text: t('admin.updateSuccess') });
            await loadUsers(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.updateError') });
        } finally {
            setSaving(false);
        }
    };

    const resetPassword = async (user: AdminUser) => {
        setResetting(true);
        try {
            const res = await fetch('/api/admin/reset-password/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ user_id: user.id }),
            });
            if (!res.ok) throw new Error('reset_failed');
            const data = await res.json();
            setNotice({ type: 'success', text: t('admin.resetPasswordDone', { password: data.password }) });
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.resetPasswordError') });
        } finally {
            setResetting(false);
        }
    };

    const createStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStaff.username.trim()) {
            setNotice({ type: 'error', text: t('admin.staffUsernameRequired') });
            return;
        }
        setCreatingStaff(true);
        try {
            const res = await fetch('/api/admin/create-staff/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(newStaff),
            });
            if (!res.ok) throw new Error('create_staff_failed');
            const data = await res.json();
            setNotice({ type: 'success', text: t('admin.staffCreated', { username: data.user.username, password: data.password }) });
            setNewStaff({ username: '', email: '' });
            await loadUsers(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.staffCreateError') });
        } finally {
            setCreatingStaff(false);
        }
    };

    const promptDefaultStudents = async () => {
        try {
            const res = await fetch('/api/admin/prompt-default-students-change/', {
                method: 'POST',
                headers: authHeaders,
            });
            if (!res.ok) throw new Error('prompt_failed');
            const data = await res.json();
            setNotice({ type: 'info', text: t('admin.promptResult', { count: data.flagged }) });
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.promptError') });
        }
    };

    const infoCards = [
        { label: t('admin.totalUsers'), value: users.length },
        { label: t('admin.totalStudents'), value: users.filter(u => u.role === 'student').length },
        { label: t('admin.totalStaff'), value: users.filter(u => u.role === 'staff').length },
    ];

    return (
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col gap-6">
                <header>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.title')}</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">{t('admin.subtitle')}</p>
                </header>
                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/40 dark:text-green-100' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-100' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-100'}`}>{notice.text}</div>
                )}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {infoCards.map(card => (
                        <article key={card.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                        </article>
                    ))}
                </section>

                <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <form onSubmit={submitSearch} className="flex flex-col sm:flex-row gap-3">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('admin.searchPlaceholder') || ''}
                            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 bg-white dark:bg-gray-800"
                        />
                        <div className="flex gap-3">
                            <button type="submit" className="px-4 py-2 rounded-md bg-gray-900 text-white">{t('admin.search')}</button>
                            <button type="button" onClick={() => loadUsers('')} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200">{t('admin.refresh')}</button>
                        </div>
                    </form>
                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400">
                                    <th className="py-2">{t('admin.table.username')}</th>
                                    <th className="py-2">{t('admin.table.name')}</th>
                                    <th className="py-2">{t('admin.table.role')}</th>
                                    <th className="py-2">{t('admin.table.email')}</th>
                                    <th className="py-2">{t('admin.table.phone')}</th>
                                    <th className="py-2">{t('admin.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!users.length && !loading && (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-gray-500">{t('admin.noUsers')}</td>
                                    </tr>
                                )}
                                {users.map(user => (
                                    <tr key={user.id} className={`border-t border-gray-100 dark:border-gray-800 ${selectedId === user.id ? 'bg-gray-50 dark:bg-gray-800/60' : ''}`}>
                                        <td className="py-2 font-mono text-xs sm:text-sm">{user.username}</td>
                                        <td className="py-2">{user.first_name || '—'}</td>
                                        <td className="py-2 capitalize">{t(`auth.${user.role}`)}</td>
                                        <td className="py-2">{user.email || '—'}</td>
                                        <td className="py-2">{user.student_profile?.phone || '—'}</td>
                                        <td className="py-2 space-x-2">
                                            <button type="button" onClick={() => setSelectedId(user.id)} className="text-sm text-indigo-600 dark:text-indigo-300">{t('admin.view')}</button>
                                            <button type="button" disabled={resetting} onClick={() => resetPassword(user)} className="text-sm text-rose-600 dark:text-rose-300 disabled:opacity-60">{t('admin.resetPassword')}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <article className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">{t('admin.userDetails')}</h2>
                        {!selectedUser && <p className="text-sm text-gray-500">{t('admin.selectUser')}</p>}
                        {selectedUser && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="text-sm text-gray-500 flex flex-col gap-1">
                                        {t('profile.name')}
                                        <input value={formState.first_name} onChange={e => setFormState(s => ({ ...s, first_name: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800" />
                                    </label>
                                    <label className="text-sm text-gray-500 flex flex-col gap-1">
                                        {t('admin.lastName')}
                                        <input value={formState.last_name} onChange={e => setFormState(s => ({ ...s, last_name: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800" />
                                    </label>
                                    <label className="text-sm text-gray-500 flex flex-col gap-1">
                                        Email
                                        <input value={formState.email} onChange={e => setFormState(s => ({ ...s, email: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800" />
                                    </label>
                                    <label className="text-sm text-gray-500 flex flex-col gap-1">
                                        {t('admin.roleLabel')}
                                        <input value={t(`auth.${selectedUser.role}`)} disabled className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 bg-gray-100 dark:bg-gray-800/60" />
                                    </label>
                                </div>
                                {selectedUser.role === 'student' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {['phone', 'major', 'college', 'class_name', 'gender', 'chinese_level'].map(field => (
                                            <label key={field} className="text-sm text-gray-500 flex flex-col gap-1">
                                                {t(`admin.student.${field}`)}
                                                <input
                                                    value={(formState.student_profile as any)?.[field] || ''}
                                                    onChange={e => setFormState(s => ({
                                                        ...s,
                                                        student_profile: { ...s.student_profile, [field]: e.target.value },
                                                    }))}
                                                    className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800"
                                                />
                                            </label>
                                        ))}
                                        <label className="text-sm text-gray-500 flex flex-col gap-1">
                                            {t('admin.student.year')}
                                            <input
                                                type="number"
                                                value={(formState.student_profile?.year as number | '' | undefined) ?? ''}
                                                onChange={e => setFormState(s => ({
                                                    ...s,
                                                    student_profile: { ...s.student_profile, year: e.target.value ? Number(e.target.value) : undefined },
                                                }))}
                                                className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800"
                                            />
                                        </label>
                                    </div>
                                )}
                                <button type="button" onClick={updateUser} disabled={saving} className="px-5 py-2 rounded-md bg-gray-900 text-white disabled:opacity-60">
                                    {saving ? t('profile.saving') : t('admin.saveChanges')}
                                </button>
                            </div>
                        )}
                    </article>

                    <article className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
                        <h2 className="text-lg font-semibold">{t('admin.staffTools')}</h2>
                        <form onSubmit={createStaff} className="space-y-3">
                            <label className="text-sm text-gray-500 flex flex-col gap-1">
                                {t('admin.newStaffUsername')}
                                <input value={newStaff.username} onChange={e => setNewStaff(s => ({ ...s, username: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800" />
                            </label>
                            <label className="text-sm text-gray-500 flex flex-col gap-1">
                                {t('admin.newStaffEmail')}
                                <input value={newStaff.email} onChange={e => setNewStaff(s => ({ ...s, email: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-800" />
                            </label>
                            <button type="submit" disabled={creatingStaff} className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-60">{creatingStaff ? t('profile.saving') : t('admin.createStaff')}</button>
                        </form>
                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('admin.promptDefaultHint')}</p>
                            <button type="button" onClick={promptDefaultStudents} className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600">{t('admin.promptDefaultBtn')}</button>
                        </div>
                    </article>
                </section>
            </div>
        </main>
    );
};

export default AdminDashboardPage;

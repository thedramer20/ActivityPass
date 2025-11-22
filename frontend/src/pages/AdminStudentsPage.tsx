import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser, SecurityPreferences } from '../types/admin';
import CustomSelect from '../components/CustomSelect';

const defaultStudentForm = () => ({
    student_id: '',
    full_name: '',
    email: '',
    phone: '',
    major: '',
    college: '',
    class_name: '',
    gender: '',
    chinese_level: '',
    year: '',
});

const AdminStudentsPage: React.FC = () => {
    const { tokens } = useAuth();
    const { t } = useTranslation();
    const [students, setStudents] = useState<AdminUser[]>([]);
    const [allStudents, setAllStudents] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(defaultStudentForm());
    const openModal = () => {
        setForm(defaultStudentForm());
        setModalOpen(true);
    };

    const [creating, setCreating] = useState(false);
    const [resettingUserId, setResettingUserId] = useState<number | null>(null);
    const [securityPrefs, setSecurityPrefs] = useState<SecurityPreferences | null>(null);
    const [securityLoading, setSecurityLoading] = useState(false);
    const [togglingSecurity, setTogglingSecurity] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState(defaultStudentForm());
    const [updating, setUpdating] = useState(false);
    const studentProfileFieldDefs = useMemo(() => ([
        { name: 'phone', label: t('admin.student.phone') },
        { name: 'major', label: t('admin.student.major') },
        { name: 'college', label: t('admin.student.college') },
        { name: 'class_name', label: t('admin.student.class_name') },
        { name: 'gender', label: t('admin.student.gender') },
        { name: 'chinese_level', label: t('admin.student.chinese_level') },
    ]), [t]);

    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const loadSecurityPrefs = useCallback(async () => {
        if (!tokens) return;
        setSecurityLoading(true);
        try {
            const res = await fetch('/api/admin/security/preferences/', { headers: authHeaders });
            if (!res.ok) throw new Error('security_failed');
            const data = await res.json();
            setSecurityPrefs(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.promptError') });
        } finally {
            setSecurityLoading(false);
        }
    }, [tokens, authHeaders, t]);

    const filterStudents = useCallback((query: string, dataset: AdminUser[]) => {
        const q = query.trim().toLowerCase();
        if (!q) return dataset;
        return dataset.filter(student => {
            const targets = [
                student.username,
                student.first_name,
                student.email,
                student.student_profile?.student_id,
                student.student_profile?.major,
                student.student_profile?.class_name,
            ].map(val => (val || '').toLowerCase());
            return targets.some(val => val && val.includes(q));
        });
    }, []);

    const loadStudents = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams({ role: 'student' });
            const res = await fetch(`/api/admin/users/?${qs.toString()}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setAllStudents(data);
            setStudents(filterStudents(query, data));
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authHeaders, t, filterStudents]);

    useEffect(() => {
        if (tokens) {
            loadStudents();
            loadSecurityPrefs();
        }
    }, [tokens, loadStudents, loadSecurityPrefs]);

    useEffect(() => {
        setStudents(filterStudents(search, allStudents));
    }, [search, allStudents, filterStudents]);

    const resetPassword = async (user: AdminUser) => {
        setResettingUserId(user.id);
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
            setResettingUserId(null);
        }
    };

    const openEditModal = (student: AdminUser) => {
        setEditingStudent(student);
        setEditForm({
            student_id: student.student_profile?.student_id || '',
            full_name: student.first_name || '',
            email: student.email || '',
            phone: student.student_profile?.phone || '',
            major: student.student_profile?.major || '',
            college: student.student_profile?.college || '',
            class_name: student.student_profile?.class_name || '',
            gender: student.student_profile?.gender || '',
            chinese_level: student.student_profile?.chinese_level || '',
            year: student.student_profile?.year != null ? String(student.student_profile.year) : '',
        });
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditingStudent(null);
        setEditForm(defaultStudentForm());
    };

    const submitEditStudent = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!editingStudent) return;
        setUpdating(true);
        try {
            const payload: Record<string, unknown> = {
                first_name: editForm.full_name,
                email: editForm.email,
            };
            const studentProfile: Record<string, unknown> = {
                phone: editForm.phone,
                major: editForm.major,
                college: editForm.college,
                class_name: editForm.class_name,
                gender: editForm.gender,
                chinese_level: editForm.chinese_level,
            };
            if (editForm.year.trim()) {
                studentProfile.year = Number(editForm.year);
            } else {
                studentProfile.year = null;
            }
            payload.student_profile = studentProfile;
            const res = await fetch(`/api/admin/users/${editingStudent.id}/`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('update_failed');
            setNotice({ type: 'success', text: t('admin.studentUpdated') });
            closeEditModal();
            loadStudents(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.updateError') });
        } finally {
            setUpdating(false);
        }
    };

    const submitNewStudent = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!form.student_id.trim()) {
            setNotice({ type: 'error', text: t('admin.studentIdRequired', { defaultValue: 'Student ID is required.' }) });
            return;
        }
        setCreating(true);
        try {
            const payload: Record<string, unknown> = { ...form };
            if (!form.full_name.trim()) delete payload.full_name;
            if (!form.email.trim()) delete payload.email;
            if (!form.phone.trim()) delete payload.phone;
            if (!form.major.trim()) delete payload.major;
            if (!form.college.trim()) delete payload.college;
            if (!form.class_name.trim()) delete payload.class_name;
            if (!form.gender.trim()) delete payload.gender;
            if (!form.chinese_level.trim()) delete payload.chinese_level;
            if (!form.year.trim()) {
                delete payload.year;
            } else {
                payload.year = Number(form.year);
            }
            const res = await fetch('/api/admin/create-student/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('create_student_failed');
            const data = await res.json();
            setNotice({ type: 'success', text: t('admin.studentCreated', { defaultValue: 'Student created with default password 000000.', username: data.user?.username || form.student_id }) });
            setForm(defaultStudentForm());
            setModalOpen(false);
            loadStudents(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.studentCreateError', { defaultValue: 'Unable to create student.' }) });
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStudentEnforcement = async () => {
        const nextEnabled = !(securityPrefs?.force_students_change_default);
        setTogglingSecurity(true);
        try {
            const res = await fetch('/api/admin/security/toggle/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ role: 'student', enabled: nextEnabled }),
            });
            if (!res.ok) throw new Error('toggle_failed');
            const data = await res.json();
            setSecurityPrefs(prev => ({
                force_students_change_default: data.enabled,
                force_staff_change_default: prev?.force_staff_change_default ?? false,
            }));
            setNotice({
                type: 'info',
                text: data.enabled ? t('admin.promptStudentsEnabled', { count: data.flagged }) : t('admin.promptStudentsDisabled'),
            });
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.promptError') });
        } finally {
            setTogglingSecurity(false);
        }
    };

    return (
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('admin.manageStudents')}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={openModal} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm">
                            {t('admin.addStudent')}
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleStudentEnforcement}
                            disabled={securityLoading || togglingSecurity || !securityPrefs}
                            aria-pressed={securityPrefs?.force_students_change_default}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${securityPrefs?.force_students_change_default
                                ? 'bg-gray-900 text-white border border-gray-900'
                                : 'border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100'} disabled:opacity-60`}
                        >
                            {securityPrefs?.force_students_change_default ? t('admin.promptStudentsToggleOff') : t('admin.promptStudentsToggleOn')}
                        </button>
                    </div>
                </header>

                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-100' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-100'}`}>
                        {notice.text}
                    </div>
                )}

                <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('admin.searchStudents') || ''}
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                        />
                    </div>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400">
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.studentId')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.name')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.email')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.phone')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.student.major')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.student.class_name')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.student.year')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!students.length && !loading && (
                                    <tr>
                                        <td colSpan={8} className="py-6 text-center text-gray-500">{t('admin.noStudents', { defaultValue: 'No students found.' })}</td>
                                    </tr>
                                )}
                                {students.map(student => (
                                    <tr key={student.id} className="border-t border-gray-100 dark:border-gray-800">
                                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{student.student_profile?.student_id || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.first_name || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.email || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.student_profile?.phone || '—'}</td>
                                        <td className="px-4 py-2">{student.student_profile?.major || '—'}</td>
                                        <td className="px-4 py-2">{student.student_profile?.class_name || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.student_profile?.year ?? '—'}</td>
                                        <td className="px-4 py-2">
                                            <button type="button" onClick={() => openEditModal(student)} className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                                {t('common.edit')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-gray-900 dark:border-gray-700 mt-8 mb-8">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                    {t('admin.quickCreate', { defaultValue: 'Quick create' })}
                                </p>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.addStudent', { defaultValue: 'Add student' })}</h2>
                            </div>
                            <button type="button" onClick={() => setModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitNewStudent} className="space-y-4" autoComplete="off">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.table.studentId')}
                                        </label>
                                        <input
                                            value={form.student_id}
                                            onChange={e => setForm(prev => ({ ...prev, student_id: e.target.value }))}
                                            required
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.table.studentId')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('profile.name')}
                                        </label>
                                        <input
                                            value={form.full_name}
                                            onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('profile.name')}
                                        />
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.table.email')}
                                        </label>
                                        <input
                                            value={form.email}
                                            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                                            type="email"
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.table.email')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.phone')}
                                        </label>
                                        <input
                                            value={form.phone}
                                            onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.student.phone')}
                                        />
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.major')}
                                        </label>
                                        <input
                                            value={form.major}
                                            onChange={e => setForm(prev => ({ ...prev, major: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.student.major')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.college')}
                                        </label>
                                        <input
                                            value={form.college}
                                            onChange={e => setForm(prev => ({ ...prev, college: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.student.college')}
                                        />
                                    </div>
                                </div>

                                {/* Class and Year */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.class_name')}
                                        </label>
                                        <input
                                            value={form.class_name}
                                            onChange={e => setForm(prev => ({ ...prev, class_name: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.student.class_name')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.year')}
                                        </label>
                                        <div className="relative">
                                            <input
                                                value={form.year}
                                                onChange={e => setForm(prev => ({ ...prev, year: e.target.value }))}
                                                type="number"
                                                className="w-full px-3 py-2 pr-16 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                                placeholder={t('admin.student.year')}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex flex-col">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, year: String((Number(prev.year) || new Date().getFullYear()) + 1) }))}
                                                    className="flex-1 px-2 text-gray-400 dark:text-gray-500 border-l border-gray-300 dark:border-gray-600"
                                                    aria-label="Increase year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, year: String(Math.max(1900, (Number(prev.year) || new Date().getFullYear()) - 1)) }))}
                                                    className="flex-1 px-2 text-gray-400 dark:text-gray-500 border-l border-t border-gray-300 dark:border-gray-600"
                                                    aria-label="Decrease year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 5v14M5 12l7 7 7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Gender and Chinese Level */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.gender')}
                                        </label>
                                        <CustomSelect
                                            value={form.gender}
                                            onChange={(value) => setForm(prev => ({ ...prev, gender: value }))}
                                            options={[
                                                { value: '', label: t('admin.student.gender') },
                                                { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.chinese_level')}
                                        </label>
                                        <CustomSelect
                                            value={form.chinese_level}
                                            onChange={(value) => setForm(prev => ({ ...prev, chinese_level: value }))}
                                            options={[
                                                { value: '', label: t('admin.student.chinese_level') },
                                                { value: 'HSK1', label: 'HSK 1' },
                                                { value: 'HSK2', label: 'HSK 2' },
                                                { value: 'HSK3', label: 'HSK 3' },
                                                { value: 'HSK4', label: 'HSK 4' },
                                                { value: 'HSK5', label: 'HSK 5' },
                                                { value: 'HSK6', label: 'HSK 6' },
                                                { value: 'Native', label: t('admin.student.chinese_level.native', { defaultValue: 'Native' }) },
                                            ]}
                                        />
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                                    >
                                        {creating ? t('profile.saving') : t('admin.createStudent', { defaultValue: 'Create student' })}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {editModalOpen && editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-3xl bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-gray-900 dark:border-gray-700 mt-8 mb-8">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                    {t('admin.editStudent')}
                                </p>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingStudent.first_name || editingStudent.username}</h2>
                            </div>
                            <button type="button" onClick={closeEditModal} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitEditStudent} className="space-y-4" autoComplete="off">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.table.studentId')}
                                        </label>
                                        <input
                                            value={editForm.student_id}
                                            disabled
                                            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 transition-colors text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('profile.name')}
                                        </label>
                                        <input
                                            value={editForm.full_name}
                                            onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('profile.name')}
                                        />
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.table.email')}
                                        </label>
                                        <input
                                            value={editForm.email}
                                            onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                            type="email"
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.table.email')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.phone')}
                                        </label>
                                        <input
                                            value={editForm.phone}
                                            onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.student.phone')}
                                        />
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.major')}
                                        </label>
                                        <input
                                            value={editForm.major}
                                            onChange={e => setEditForm(prev => ({ ...prev, major: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.student.major')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.college')}
                                        </label>
                                        <input
                                            value={editForm.college}
                                            onChange={e => setEditForm(prev => ({ ...prev, college: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.student.college')}
                                        />
                                    </div>
                                </div>

                                {/* Class and Year */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.class_name')}
                                        </label>
                                        <input
                                            value={editForm.class_name}
                                            onChange={e => setEditForm(prev => ({ ...prev, class_name: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.student.class_name')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.year')}
                                        </label>
                                        <div className="relative">
                                            <input
                                                value={editForm.year}
                                                onChange={e => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                                                type="number"
                                                className="w-full px-3 py-2 pr-16 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                                placeholder={t('admin.student.year')}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex flex-col">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, year: String((Number(prev.year) || new Date().getFullYear()) + 1) }))}
                                                    className="flex-1 px-2 text-gray-400 dark:text-gray-500 border-l border-gray-300 dark:border-gray-600"
                                                    aria-label="Increase year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, year: String(Math.max(1900, (Number(prev.year) || new Date().getFullYear()) - 1)) }))}
                                                    className="flex-1 px-2 text-gray-400 dark:text-gray-500 border-l border-t border-gray-300 dark:border-gray-600"
                                                    aria-label="Decrease year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 5v14M5 12l7 7 7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Gender and Chinese Level */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.gender')}
                                        </label>
                                        <CustomSelect
                                            value={editForm.gender}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, gender: value }))}
                                            options={[
                                                { value: '', label: t('admin.student.gender') },
                                                { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.student.chinese_level')}
                                        </label>
                                        <CustomSelect
                                            value={editForm.chinese_level}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, chinese_level: value }))}
                                            options={[
                                                { value: '', label: t('admin.student.chinese_level') },
                                                { value: 'HSK1', label: 'HSK 1' },
                                                { value: 'HSK2', label: 'HSK 2' },
                                                { value: 'HSK3', label: 'HSK 3' },
                                                { value: 'HSK4', label: 'HSK 4' },
                                                { value: 'HSK5', label: 'HSK 5' },
                                                { value: 'HSK6', label: 'HSK 6' },
                                                { value: 'Native', label: t('admin.student.chinese_level.native', { defaultValue: 'Native' }) },
                                            ]}
                                        />
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => resetPassword(editingStudent)}
                                        className="self-start px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 transition-colors disabled:opacity-50"
                                        disabled={resettingUserId === editingStudent.id}
                                    >
                                        {resettingUserId === editingStudent.id ? t('profile.saving') : t('admin.resetPassword')}
                                    </button>
                                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0">
                                        <button
                                            type="button"
                                            onClick={closeEditModal}
                                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 transition-colors"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updating}
                                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                                        >
                                            {updating ? t('profile.saving') : t('admin.saveChanges')}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminStudentsPage;

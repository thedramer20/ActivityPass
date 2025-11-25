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
        // Reset focus states
        setStudentIdFocused(false);
        setFullNameFocused(false);
        setEmailFocused(false);
        setPhoneFocused(false);
        setMajorFocused(false);
        setCollegeFocused(false);
        setClassNameFocused(false);
        setYearFocused(false);
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
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<AdminUser | null>(null);

    // Focus states for floating labels
    const [studentIdFocused, setStudentIdFocused] = useState(false);
    const [fullNameFocused, setFullNameFocused] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [phoneFocused, setPhoneFocused] = useState(false);
    const [majorFocused, setMajorFocused] = useState(false);
    const [collegeFocused, setCollegeFocused] = useState(false);
    const [classNameFocused, setClassNameFocused] = useState(false);
    const [yearFocused, setYearFocused] = useState(false);

    // Focus states for edit modal floating labels
    const [editFullNameFocused, setEditFullNameFocused] = useState(false);
    const [editEmailFocused, setEditEmailFocused] = useState(false);
    const [editPhoneFocused, setEditPhoneFocused] = useState(false);
    const [editMajorFocused, setEditMajorFocused] = useState(false);
    const [editCollegeFocused, setEditCollegeFocused] = useState(false);
    const [editClassNameFocused, setEditClassNameFocused] = useState(false);
    const [editYearFocused, setEditYearFocused] = useState(false);

    // Activities and courses popup states
    const [activitiesModalOpen, setActivitiesModalOpen] = useState(false);
    const [coursesModalOpen, setCoursesModalOpen] = useState(false);
    const [selectedStudentActivities, setSelectedStudentActivities] = useState<any[]>([]);
    const [selectedStudentCourses, setSelectedStudentCourses] = useState<any[]>([]);
    const [selectedStudentForActivities, setSelectedStudentForActivities] = useState<any>(null);
    const [selectedStudentForCourses, setSelectedStudentForCourses] = useState<any>(null);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Student counts cache
    const [studentCounts, setStudentCounts] = useState<Record<number, { activities: number; courses: number }>>({});
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

    const loadStudentCounts = useCallback(async (students: AdminUser[]) => {
        const counts: Record<number, { activities: number; courses: number }> = {};

        // Load counts for all students in parallel
        const countPromises = students.map(async (student) => {
            try {
                const [activitiesRes, coursesRes] = await Promise.all([
                    fetch(`/api/participations/?student=${student.id}`, { headers: authHeaders }),
                    fetch(`/api/admin/course-enrollments/?student=${student.id}`, { headers: authHeaders })
                ]);

                const activitiesData = activitiesRes.ok ? await activitiesRes.json() : [];
                const coursesData = coursesRes.ok ? await coursesRes.json() : [];

                counts[student.id] = {
                    activities: activitiesData.length,
                    courses: coursesData.length
                };
            } catch (err) {
                console.error(`Error loading counts for student ${student.id}:`, err);
                counts[student.id] = { activities: 0, courses: 0 };
            }
        });

        await Promise.all(countPromises);
        setStudentCounts(counts);
    }, [authHeaders]);

    const loadStudents = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams({ role: 'student' });
            const res = await fetch(`/api/admin/users/?${qs.toString()}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setAllStudents(data);
            const filteredData = filterStudents(query, data);
            setStudents(filteredData);

            // Load counts for the filtered students
            await loadStudentCounts(filteredData);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authHeaders, t, filterStudents, loadStudentCounts]);

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
        // Reset edit focus states
        setEditFullNameFocused(false);
        setEditEmailFocused(false);
        setEditPhoneFocused(false);
        setEditMajorFocused(false);
        setEditCollegeFocused(false);
        setEditClassNameFocused(false);
        setEditYearFocused(false);
    };

    const openViewModal = (student: AdminUser) => {
        setViewingStudent(student);
        setViewModalOpen(true);
    };

    const closeViewModal = () => {
        setViewModalOpen(false);
        setViewingStudent(null);
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

    const loadStudentActivities = useCallback(async (student: AdminUser) => {
        setLoadingActivities(true);
        try {
            const res = await fetch(`/api/participations/?student=${student.id}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_activities_failed');
            const data = await res.json();
            setSelectedStudentActivities(data);
            setSelectedStudentForActivities(student);
            setActivitiesModalOpen(true);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoadingActivities(false);
        }
    }, [authHeaders, t]);

    const loadStudentCourses = useCallback(async (student: AdminUser) => {
        setLoadingCourses(true);
        try {
            const res = await fetch(`/api/admin/course-enrollments/?student=${student.id}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_courses_failed');
            const data = await res.json();
            // Transform course enrollment data to course data
            const courses = data.map((enrollment: any) => enrollment.course);
            setSelectedStudentCourses(courses);
            setSelectedStudentForCourses(student);
            setCoursesModalOpen(true);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoadingCourses(false);
        }
    }, [authHeaders, t]);

    const openActivityView = (activity: any) => {
        // Navigate to activity view - for now just close the modal
        // This will be implemented when the activity view page is ready
        setActivitiesModalOpen(false);
        setNotice({ type: 'info', text: `Viewing activity: ${activity.title}` });
    };

    const openCourseView = (course: any) => {
        // Navigate to course view - for now just close the modal
        // This will be implemented when the course view page is ready
        setCoursesModalOpen(false);
        setNotice({ type: 'info', text: `Viewing course: ${course.title}` });
    };

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                <header className="flex items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold flex-shrink-0">{t('admin.manageStudents')}</h1>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button type="button" onClick={openModal} className="px-3 py-2 text-sm text-white transition-colors rounded-md bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover whitespace-nowrap">
                            {t('admin.addStudent')}
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleStudentEnforcement}
                            disabled={securityLoading || togglingSecurity || !securityPrefs}
                            aria-pressed={securityPrefs?.force_students_change_default}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${securityPrefs?.force_students_change_default
                                ? 'bg-app-light-accent text-app-light-text-primary border border-app-light-accent'
                                : 'border border-app-light-border dark:border-app-dark-border text-app-light-text-primary dark:text-app-dark-text-primary'} disabled:opacity-60`}
                        >
                            {securityPrefs?.force_students_change_default ? t('admin.promptStudentsToggleOff') : t('admin.promptStudentsToggleOn')}
                        </button>
                    </div>
                </header>

                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-app-light-accent bg-app-light-accent/10 text-app-light-text-primary dark:border-app-dark-accent dark:bg-app-dark-accent/20 dark:text-app-dark-text-primary' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-app-light-border bg-app-light-surface-secondary text-app-light-text-primary dark:border-app-dark-border dark:bg-app-dark-surface-secondary dark:text-app-dark-text-primary'}`}>
                        {notice.text}
                    </div>
                )}

                <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                />
                                <label
                                    className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${search
                                        ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                        : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                        }`}
                                >
                                    {t('admin.searchStudents') || ''}
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm text-left table-fixed">
                            <thead>
                                <tr className="text-app-light-textSecondary dark:text-app-dark-textSecondary">
                                    <th className="px-4 py-2 whitespace-nowrap w-32 max-w-32">{t('admin.table.studentId')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap min-w-0 flex-1">{t('admin.table.name')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap text-center w-20">{t('admin.table.activities')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap text-center w-20">{t('admin.table.courses')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!students.length && !loading && (
                                    <tr>
                                        <td colSpan={4} className="py-6 text-center text-app-light-textSecondary dark:text-app-dark-textSecondary">{t('admin.noStudents', { defaultValue: 'No students found.' })}</td>
                                    </tr>
                                )}
                                {students.map(student => (
                                    <tr key={student.id} className="border-t border-app-light-border dark:border-app-dark-border">
                                        <td className="px-4 py-2 font-mono text-sm whitespace-nowrap w-32 max-w-32">
                                            <button
                                                type="button"
                                                onClick={() => openViewModal(student)}
                                                className="w-full text-left text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary hover:underline truncate block overflow-hidden"
                                            >
                                                {student.student_profile?.student_id || '—'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-2 min-w-0 flex-1">
                                            <button
                                                type="button"
                                                onClick={() => openViewModal(student)}
                                                className="w-full text-left text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary hover:underline whitespace-nowrap block overflow-hidden relative"
                                            >
                                                <span className="block">{student.first_name || '—'}</span>
                                                <span className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-app-light-surface to-transparent dark:from-app-dark-surface"></span>
                                            </button>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-center w-20">
                                            <button
                                                type="button"
                                                onClick={() => loadStudentActivities(student)}
                                                disabled={loadingActivities}
                                                className="text-sm font-medium text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary disabled:opacity-50"
                                            >
                                                {loadingActivities ? '...' : (studentCounts[student.id]?.activities || 0)}
                                            </button>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-center w-20">
                                            <button
                                                type="button"
                                                onClick={() => loadStudentCourses(student)}
                                                disabled={loadingCourses}
                                                className="text-sm font-medium text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary disabled:opacity-50"
                                            >
                                                {loadingCourses ? '...' : (studentCounts[student.id]?.courses || 0)}
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
                    <div className="w-full max-w-2xl mt-8 mb-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.addStudent', { defaultValue: 'Add student' })}</h2>
                            </div>
                            <button type="button" onClick={() => setModalOpen(false)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitNewStudent} className="space-y-4" autoComplete="off">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="student_id"
                                                value={form.student_id}
                                                onChange={e => setForm(prev => ({ ...prev, student_id: e.target.value }))}
                                                onFocus={() => setStudentIdFocused(true)}
                                                onBlur={() => setStudentIdFocused(false)}
                                                required
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="student_id"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${studentIdFocused || form.student_id
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.table.studentId')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="full_name"
                                                value={form.full_name}
                                                onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                                                onFocus={() => setFullNameFocused(true)}
                                                onBlur={() => setFullNameFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="full_name"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${fullNameFocused || form.full_name
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('profile.name')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="email"
                                                value={form.email}
                                                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                                                onFocus={() => setEmailFocused(true)}
                                                onBlur={() => setEmailFocused(false)}
                                                type="email"
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="email"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${emailFocused || form.email
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.table.email')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="phone"
                                                value={form.phone}
                                                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                                onFocus={() => setPhoneFocused(true)}
                                                onBlur={() => setPhoneFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="phone"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${phoneFocused || form.phone
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.phone')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="major"
                                                value={form.major}
                                                onChange={e => setForm(prev => ({ ...prev, major: e.target.value }))}
                                                onFocus={() => setMajorFocused(true)}
                                                onBlur={() => setMajorFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="major"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${majorFocused || form.major
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.major')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="college"
                                                value={form.college}
                                                onChange={e => setForm(prev => ({ ...prev, college: e.target.value }))}
                                                onFocus={() => setCollegeFocused(true)}
                                                onBlur={() => setCollegeFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="college"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${collegeFocused || form.college
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.college')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Class and Year */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="class_name"
                                                value={form.class_name}
                                                onChange={e => setForm(prev => ({ ...prev, class_name: e.target.value }))}
                                                onFocus={() => setClassNameFocused(true)}
                                                onBlur={() => setClassNameFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="class_name"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${classNameFocused || form.class_name
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.class_name')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="year"
                                                value={form.year}
                                                onChange={e => setForm(prev => ({ ...prev, year: e.target.value }))}
                                                onFocus={() => setYearFocused(true)}
                                                onBlur={() => setYearFocused(false)}
                                                type="number"
                                                className="w-full px-4 py-4 pr-16 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="year"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${yearFocused || form.year
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.year')}
                                            </label>
                                            <div className="absolute inset-y-0 right-0 flex flex-col">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, year: String((Number(prev.year) || new Date().getFullYear()) + 1) }))}
                                                    className="flex-1 px-2 border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border"
                                                    aria-label="Increase year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, year: String(Math.max(1900, (Number(prev.year) || new Date().getFullYear()) - 1)) }))}
                                                    className="flex-1 px-2 border-t border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border"
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
                                    <div className="relative">
                                        <CustomSelect
                                            id="gender"
                                            label={t('admin.student.gender')}
                                            value={form.gender}
                                            onChange={(value) => setForm(prev => ({ ...prev, gender: value }))}
                                            focused={false}
                                            onFocus={() => { }}
                                            onBlur={() => { }}
                                            options={[
                                                { value: '', label: t('admin.student.gender') },
                                                { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                            ]}
                                        />
                                    </div>
                                    <div className="relative">
                                        <CustomSelect
                                            id="chinese_level"
                                            label={t('admin.student.chinese_level')}
                                            value={form.chinese_level}
                                            onChange={(value) => setForm(prev => ({ ...prev, chinese_level: value }))}
                                            focused={false}
                                            onFocus={() => { }}
                                            onBlur={() => { }}
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
                                <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
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
                    <div className="w-full max-w-3xl mt-8 mb-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.editStudent')}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{editingStudent.first_name || editingStudent.username}</h2>
                            </div>
                            <button type="button" onClick={closeEditModal} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitEditStudent} className="space-y-4" autoComplete="off">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                            <input
                                                value={editForm.student_id}
                                                disabled
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                className="absolute left-4 top-0.5 text-xs text-app-light-text-secondary font-medium pointer-events-none transform -translate-y-0"
                                            >
                                                {t('admin.table.studentId')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_full_name"
                                                value={editForm.full_name}
                                                onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                                onFocus={() => setEditFullNameFocused(true)}
                                                onBlur={() => setEditFullNameFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_full_name"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editFullNameFocused || editForm.full_name
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('profile.name')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_email"
                                                value={editForm.email}
                                                onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                                onFocus={() => setEditEmailFocused(true)}
                                                onBlur={() => setEditEmailFocused(false)}
                                                type="email"
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_email"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editEmailFocused || editForm.email
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.table.email')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_phone"
                                                value={editForm.phone}
                                                onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                                onFocus={() => setEditPhoneFocused(true)}
                                                onBlur={() => setEditPhoneFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_phone"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editPhoneFocused || editForm.phone
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.phone')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_major"
                                                value={editForm.major}
                                                onChange={e => setEditForm(prev => ({ ...prev, major: e.target.value }))}
                                                onFocus={() => setEditMajorFocused(true)}
                                                onBlur={() => setEditMajorFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_major"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editMajorFocused || editForm.major
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.major')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_college"
                                                value={editForm.college}
                                                onChange={e => setEditForm(prev => ({ ...prev, college: e.target.value }))}
                                                onFocus={() => setEditCollegeFocused(true)}
                                                onBlur={() => setEditCollegeFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_college"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editCollegeFocused || editForm.college
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.college')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Class and Year */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_class_name"
                                                value={editForm.class_name}
                                                onChange={e => setEditForm(prev => ({ ...prev, class_name: e.target.value }))}
                                                onFocus={() => setEditClassNameFocused(true)}
                                                onBlur={() => setEditClassNameFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_class_name"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editClassNameFocused || editForm.class_name
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.class_name')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_year"
                                                value={editForm.year}
                                                onChange={e => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                                                onFocus={() => setEditYearFocused(true)}
                                                onBlur={() => setEditYearFocused(false)}
                                                type="number"
                                                className="w-full px-4 py-4 pr-16 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_year"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editYearFocused || editForm.year
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.year')}
                                            </label>
                                            <div className="absolute inset-y-0 right-0 flex flex-col">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, year: String((Number(prev.year) || new Date().getFullYear()) + 1) }))}
                                                    className="flex-1 px-2 border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border"
                                                    aria-label="Increase year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, year: String(Math.max(1900, (Number(prev.year) || new Date().getFullYear()) - 1)) }))}
                                                    className="flex-1 px-2 border-t border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border"
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
                                    <div className="relative">
                                        <CustomSelect
                                            id="edit_gender"
                                            label={t('admin.student.gender')}
                                            value={editForm.gender}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, gender: value }))}
                                            focused={false}
                                            onFocus={() => { }}
                                            onBlur={() => { }}
                                            options={[
                                                { value: '', label: t('admin.student.gender') },
                                                { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                            ]}
                                        />
                                    </div>
                                    <div className="relative">
                                        <CustomSelect
                                            id="edit_chinese_level"
                                            label={t('admin.student.chinese_level')}
                                            value={editForm.chinese_level}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, chinese_level: value }))}
                                            focused={false}
                                            onFocus={() => { }}
                                            onBlur={() => { }}
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
                                <div className="flex flex-col gap-3 pt-3 border-t border-app-light-border dark:border-app-dark-border">
                                    <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0 sm:items-center">
                                        <button
                                            type="button"
                                            onClick={() => resetPassword(editingStudent)}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                            disabled={resettingUserId === editingStudent.id}
                                        >
                                            {resettingUserId === editingStudent.id ? t('profile.saving') : t('admin.resetPassword')}
                                        </button>
                                        <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                            <button
                                                type="button"
                                                onClick={closeEditModal}
                                                className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={updating}
                                                className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                            >
                                                {updating ? t('profile.saving') : t('admin.saveChanges')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {viewModalOpen && viewingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.viewStudent', { defaultValue: 'View Student' })}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{viewingStudent.first_name || viewingStudent.username}</h2>
                            </div>
                            <button type="button" onClick={closeViewModal} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="space-y-4">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                            <input
                                                id="view_student_id"
                                                value={viewingStudent.student_profile?.student_id || ''}
                                                readOnly
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="view_student_id"
                                                className="absolute left-4 top-0.5 text-xs text-app-light-text-secondary font-medium pointer-events-none transform -translate-y-0"
                                            >
                                                {t('admin.table.studentId')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                            <input
                                                id="view_full_name"
                                                value={viewingStudent.first_name || ''}
                                                readOnly
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="view_full_name"
                                                className="absolute left-4 top-0.5 text-xs text-app-light-text-secondary font-medium pointer-events-none transform -translate-y-0"
                                            >
                                                {t('profile.name')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                            <input
                                                id="view_email"
                                                value={viewingStudent.email || ''}
                                                readOnly
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="view_email"
                                                className="absolute left-4 top-0.5 text-xs text-app-light-text-secondary font-medium pointer-events-none transform -translate-y-0"
                                            >
                                                {t('admin.table.email')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                            <input
                                                id="view_phone"
                                                value={viewingStudent.student_profile?.phone || ''}
                                                readOnly
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="view_phone"
                                                className="absolute left-4 top-0.5 text-xs text-app-light-text-secondary font-medium pointer-events-none transform -translate-y-0"
                                            >
                                                {t('admin.student.phone')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                            <input
                                                id="view_major"
                                                value={viewingStudent.student_profile?.major || ''}
                                                readOnly
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="view_major"
                                                className="absolute left-4 top-0.5 text-xs text-app-light-text-secondary font-medium pointer-events-none transform -translate-y-0"
                                            >
                                                {t('admin.student.major')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                            <input
                                                id="view_college"
                                                value={viewingStudent.student_profile?.college || ''}
                                                readOnly
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="view_college"
                                                className="absolute left-4 top-0.5 text-xs text-app-light-text-secondary font-medium pointer-events-none transform -translate-y-0"
                                            >
                                                {t('admin.student.college')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Class and Year */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                            <input
                                                id="view_class_name"
                                                value={viewingStudent.student_profile?.class_name || ''}
                                                readOnly
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="view_class_name"
                                                className="absolute left-4 top-0.5 text-xs text-app-light-text-secondary font-medium pointer-events-none transform -translate-y-0"
                                            >
                                                {t('admin.student.class_name')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                            <input
                                                id="view_year"
                                                value={viewingStudent.student_profile?.year?.toString() || ''}
                                                readOnly
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="view_year"
                                                className="absolute left-4 top-0.5 text-xs text-app-light-text-secondary font-medium pointer-events-none transform -translate-y-0"
                                            >
                                                {t('admin.student.year')}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Gender and Chinese Level */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <CustomSelect
                                            id="view_gender"
                                            label={t('admin.student.gender')}
                                            value={viewingStudent.student_profile?.gender || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                            focused={false}
                                            onFocus={() => { }}
                                            onBlur={() => { }}
                                            options={[
                                                { value: '', label: t('admin.student.gender') },
                                                { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                            ]}
                                        />
                                    </div>
                                    <div className="relative">
                                        <CustomSelect
                                            id="view_chinese_level"
                                            label={t('admin.student.chinese_level')}
                                            value={viewingStudent.student_profile?.chinese_level || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                            focused={false}
                                            onFocus={() => { }}
                                            onBlur={() => { }}
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
                                <div className="flex flex-col gap-3 pt-3 border-t border-app-light-border dark:border-app-dark-border">
                                    <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0">
                                        <button
                                            type="button"
                                            onClick={closeViewModal}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                        >
                                            {t('common.close')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeViewModal();
                                                openEditModal(viewingStudent);
                                            }}
                                            className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                        >
                                            {t('common.edit')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Activities Modal */}
            {activitiesModalOpen && selectedStudentForActivities && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.student.activities', { defaultValue: 'Student Activities' })}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {selectedStudentForActivities.first_name || selectedStudentForActivities.username}
                                </h2>
                            </div>
                            <button type="button" onClick={() => setActivitiesModalOpen(false)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            {loadingActivities ? (
                                <div className="py-8 text-center">
                                    <div className="inline-block w-6 h-6 border-2 border-app-light-accent border-t-transparent rounded-full animate-spin dark:border-app-dark-accent"></div>
                                    <p className="mt-2 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('common.loading', { defaultValue: 'Loading...' })}
                                    </p>
                                </div>
                            ) : selectedStudentActivities.length === 0 ? (
                                <div className="py-8 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.student.noActivities', { defaultValue: 'No activities found for this student.' })}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {selectedStudentActivities.map((participation: any) => (
                                        <div key={participation.id} className="p-3 border rounded-lg border-app-light-border dark:border-app-dark-border hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover cursor-pointer" onClick={() => openActivityView(participation.activity)}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                                        {participation.activity?.title || 'Unknown Activity'}
                                                    </h3>
                                                    <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                        Status: {participation.status}
                                                    </p>
                                                </div>
                                                <svg className="w-5 h-5 text-app-light-text-secondary dark:text-app-dark-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9 18l6-6-6-6" />
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-end pt-4 border-t border-app-light-border dark:border-app-dark-border">
                                <button
                                    type="button"
                                    onClick={() => setActivitiesModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                >
                                    {t('common.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Courses Modal */}
            {coursesModalOpen && selectedStudentForCourses && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.student.courses', { defaultValue: 'Student Courses' })}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {selectedStudentForCourses.first_name || selectedStudentForCourses.username}
                                </h2>
                            </div>
                            <button type="button" onClick={() => setCoursesModalOpen(false)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            {loadingCourses ? (
                                <div className="py-8 text-center">
                                    <div className="inline-block w-6 h-6 border-2 border-app-light-accent border-t-transparent rounded-full animate-spin dark:border-app-dark-accent"></div>
                                    <p className="mt-2 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('common.loading', { defaultValue: 'Loading...' })}
                                    </p>
                                </div>
                            ) : selectedStudentCourses.length === 0 ? (
                                <div className="py-8 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.student.noCourses', { defaultValue: 'No courses found for this student.' })}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {selectedStudentCourses.map((course: any) => (
                                        <div key={course.id} className="p-3 border rounded-lg border-app-light-border dark:border-app-dark-border hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover cursor-pointer" onClick={() => openCourseView(course)}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                                        {course.title || 'Unknown Course'}
                                                    </h3>
                                                    <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                        {course.code && `Code: ${course.code}`} {course.teacher && `• Teacher: ${course.teacher}`}
                                                    </p>
                                                </div>
                                                <svg className="w-5 h-5 text-app-light-text-secondary dark:text-app-dark-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9 18l6-6-6-6" />
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-end pt-4 border-t border-app-light-border dark:border-app-dark-border">
                                <button
                                    type="button"
                                    onClick={() => setCoursesModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                >
                                    {t('common.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminStudentsPage;

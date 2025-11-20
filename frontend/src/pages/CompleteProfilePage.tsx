import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CompleteProfilePage: React.FC = () => {
    const { t } = useTranslation();
    const { me, tokens } = useAuth();
    const [name, setName] = useState(me?.first_name || '');
    const [phone, setPhone] = useState(me?.student_profile?.phone || '');
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (me && me.role !== 'student') {
            navigate('/');
        }
    }, [me, navigate]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tokens) return;
        setSaving(true);
        await fetch('/api/auth/me/', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.access}` },
            body: JSON.stringify({ first_name: name, phone }),
        }).catch(() => { });
        setSaving(false);
        navigate('/');
    };

    return (
        <main className="flex-1">
            <div className="pt-14 pb-8 flex flex-col items-center text-center px-4">
                <h1 className="text-3xl font-bold">{t('profile.completeTitle')}</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('profile.completeSubtitle')}</p>
            </div>
            <div className="flex items-center justify-center px-4 pb-16">
                <section className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-7 shadow-sm">
                    <form onSubmit={save} className="space-y-6">
                        <div>
                            <label className="text-sm text-gray-700 dark:text-gray-300">{t('profile.name')}</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded-md px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-700 dark:text-gray-300">{t('profile.phone')}</label>
                            <input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded-md px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                        </div>
                        <button disabled={saving || !name.trim()} type="submit" className="w-full mt-7 px-5 py-3 rounded-md bg-gray-900 dark:bg-gray-700 text-white hover:bg-black dark:hover:bg-gray-600 disabled:opacity-60 border border-transparent dark:border-gray-600">{saving ? t('profile.saving') : t('profile.save')}</button>
                    </form>
                </section>
            </div>
        </main>
    );
};

export default CompleteProfilePage;

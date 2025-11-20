import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AuthPage: React.FC = () => {
    const { t } = useTranslation();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const submitLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');
        try {
            await login(username, password);
            navigate('/');
        } catch (err: any) {
            setError(err?.message || 'Auth failed');
        }
    };


    // Unified single panel design across all breakpoints
    return (
        <main className="flex-1">
            {/* Simple neutral hero */}
            <div className="pt-14 pb-8 flex flex-col items-center text-center px-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">{t('app.title')}</h1>
                <p className="mt-3 max-w-xl text-sm sm:text-base text-gray-600 dark:text-gray-300">{t('app.subtitle')}</p>
            </div>
            <div className="flex items-center justify-center px-4 pb-16">
                <section className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-7 shadow-sm">
                    <form onSubmit={submitLogin} className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('nav.login')}</h2>
                        <div>
                            <label className="text-sm text-gray-700 dark:text-gray-300">{t('login.username')}</label>
                            <input value={username} onChange={e => setUsername(e.target.value)} placeholder={t('auth.studentId') || 'Student ID'} className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded-md px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-700 dark:text-gray-300">{t('login.password')}</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="000000" className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded-md px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button type="submit" className="w-full mt-7 px-5 py-3 rounded-md bg-gray-900 dark:bg-gray-700 text-white hover:bg-black dark:hover:bg-gray-600 text-base border border-transparent dark:border-gray-600">{t('nav.login')}</button>
                    </form>
                </section>
            </div>
        </main>
    );
};

export default AuthPage;

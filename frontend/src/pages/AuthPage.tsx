import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AuthPage: React.FC = () => {
    const { t } = useTranslation();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [usernameFocused, setUsernameFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const navigate = useNavigate();

    const validateUsername = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return t('auth.usernameRequired', { defaultValue: 'Username is required' });

        const isNumeric = /^\d+$/.test(trimmed);

        if (isNumeric) {
            // Student ID validation
            if (trimmed.length !== 12) {
                return t('auth.studentIdLength', { defaultValue: 'Student ID must be exactly 12 digits' });
            }
        } else {
            // Admin/Staff username validation - allow any non-numeric characters
            if (trimmed.length < 3) {
                return t('auth.usernameTooShort', { defaultValue: 'Username must be at least 3 characters' });
            }
        }

        return '';
    };

    const submitLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Clear previous errors
        setUsernameError('');
        setPasswordError('');

        const trimmedUser = username.trim();
        const trimmedPass = password.trim();

        // Validate username
        const usernameValidation = validateUsername(username);
        if (usernameValidation) {
            setUsernameError(usernameValidation);
            return;
        }

        // Validate password
        if (!trimmedPass) {
            setPasswordError(t('auth.passwordRequired', { defaultValue: 'Password is required' }));
            return;
        }

        try {
            setSubmitting(true);
            await login(trimmedUser, trimmedPass);
            navigate('/');
        } catch (err: any) {
            const msg = (err?.detail || err?.message || '').toLowerCase();

            // Check for specific error types from backend
            if (err?.error_type) {
                if (err.error_type === 'user_not_found_student') {
                    setUsernameError(t('auth.studentIdNotRegistered', { defaultValue: 'Student ID not registered. Please contact your administrator.' }));
                } else if (err.error_type === 'user_not_found') {
                    setUsernameError(t('auth.usernameNotRegistered', { defaultValue: 'Username is not registered.' }));
                } else if (err.error_type === 'invalid_credentials_student') {
                    setPasswordError(t('auth.passwordIncorrect', { defaultValue: 'Password is incorrect.' }));
                } else if (err.error_type === 'invalid_credentials') {
                    setPasswordError(t('auth.passwordIncorrect', { defaultValue: 'Password is incorrect.' }));
                } else {
                    setUsernameError(t('auth.loginFailed', { defaultValue: 'Login failed. Please try again.' }));
                }
            } else {
                // Fallback for generic errors
                const isStudentId = /^\d+$/.test(trimmedUser);
                if (msg.includes('invalid') || msg.includes('no active account')) {
                    if (isStudentId) {
                        setPasswordError(t('auth.passwordIncorrect', { defaultValue: 'Password is incorrect.' }));
                    } else {
                        setPasswordError(t('auth.passwordIncorrect', { defaultValue: 'Password is incorrect.' }));
                    }
                } else {
                    setUsernameError(t('auth.loginFailed', { defaultValue: 'Login failed. Please try again.' }));
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUsername(value);

        // Clear error when user starts typing
        if (usernameError) {
            setUsernameError('');
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPassword(value);

        // Clear error when user starts typing
        if (passwordError) {
            setPasswordError('');
        }
    };

    const minHeightStyle = { minHeight: 'calc(100vh - var(--ap-header-height, 64px) - var(--ap-footer-height, 80px))' } as const;

    return (
        <main className="flex items-center justify-center flex-1 px-4 py-6" style={minHeightStyle}>
            <section className="w-full max-w-md border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface p-7">
                <form onSubmit={submitLogin} className="space-y-6">
                    <h1 className="text-2xl font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('nav.login')}</h1>

                    {/* Username/Student ID Input */}
                    <div className="relative">
                        <div className={`relative group border-2 rounded-lg transition-colors duration-200 focus:outline-none ${usernameError
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover'
                            }`}>
                            <input
                                id="username"
                                value={username}
                                onChange={handleUsernameChange}
                                onFocus={() => setUsernameFocused(true)}
                                onBlur={() => setUsernameFocused(false)}
                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                autoComplete="username"
                            />
                            <label
                                htmlFor="username"
                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${usernameError
                                    ? usernameFocused || username
                                        ? 'top-0.5 text-xs text-red-500 font-medium transform -translate-y-0'
                                        : 'top-1/2 text-base text-red-500 transform -translate-y-1/2'
                                    : usernameFocused || username
                                        ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                        : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                    }`}
                            >
                                {t('auth.studentIdOrUsername', { defaultValue: 'Student ID / Username' })}
                            </label>
                        </div>
                        {usernameError && (
                            <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                                <svg className="flex-shrink-0 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="m15 9-6 6" />
                                    <path d="m9 9 6 6" />
                                </svg>
                                <p className="text-sm font-medium">{usernameError}</p>
                            </div>
                        )}
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                        <div className={`relative group border-2 rounded-lg transition-colors duration-200 focus:outline-none ${passwordError
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover'
                            }`}>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={handlePasswordChange}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                autoComplete="current-password"
                            />
                            <label
                                htmlFor="password"
                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${passwordError
                                    ? passwordFocused || password
                                        ? 'top-0.5 text-xs text-red-500 font-medium transform -translate-y-0'
                                        : 'top-1/2 text-base text-red-500 transform -translate-y-1/2'
                                    : passwordFocused || password
                                        ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                        : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                    }`}
                            >
                                {t('login.password')}
                            </label>
                        </div>
                        {passwordError && (
                            <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                                <svg className="flex-shrink-0 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="m15 9-6 6" />
                                    <path d="m9 9 6 6" />
                                </svg>
                                <p className="text-sm font-medium">{passwordError}</p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full px-5 py-3 mt-8 font-medium transition-all duration-200 border border-transparent rounded-lg bg-app-light-accent dark:bg-app-dark-accent text-app-light-text-on-accent dark:text-app-dark-text-on-accent hover:bg-app-light-accent-hover dark:hover:bg-app-dark-accent-hover focus:ring-2 focus:ring-app-light-accent focus:ring-offset-2 dark:focus:ring-app-dark-accent disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                {t('auth.loggingIn')}
                            </span>
                        ) : (
                            t('nav.login')
                        )}
                    </button>
                </form>
            </section>
        </main>
    );
};

export default AuthPage;

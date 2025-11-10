import React, { useEffect, useState } from 'react';
import './App.css';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

const Navbar: React.FC = () => {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    return (
        <nav style={{ display: 'flex', gap: 12, padding: '0.75rem 1rem', borderBottom: '1px solid #333' }}>
            <Link to="/">{t('nav.home')}</Link>
            {user ? (
                <>
                    <button onClick={() => { logout(); navigate('/'); }} style={{ marginLeft: 'auto' }}>{t('nav.logout')}</button>
                </>
            ) : (
                <Link style={{ marginLeft: 'auto' }} to="/login">{t('nav.login')}</Link>
            )}
            <LanguageSwitcher />
        </nav>
    );
};

const Login: React.FC = () => {
    const { t } = useTranslation();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(username, password);
            navigate('/');
        } catch (err: any) {
            setError(err?.message || 'Login failed');
        }
    };
    return (
        <div style={{ maxWidth: 420, margin: '2rem auto' }}>
            <h2>{t('login.heading')}</h2>
            {error && <p style={{ color: 'salmon' }}>{error}</p>}
            <form onSubmit={onSubmit}>
                <div style={{ marginBottom: 8 }}>
                    <label>{t('login.username')}</label>
                    <input value={username} onChange={e => setUsername(e.target.value)} className="form-control" />
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label>{t('login.password')}</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-control" />
                </div>
                <button type="submit">{t('login.submit')}</button>
            </form>
            <p style={{ marginTop: 8 }}>
                {t('login.sample')} <code>staff / StaffPass123!</code>
            </p>
        </div>
    );
};

const ActivityList: React.FC = () => {
    const { t } = useTranslation();
    const { tokens } = useAuth();
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/activities/')
            .then(r => r.json())
            .then(data => { setActivities(data); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, []);

    const apply = async (id: number) => {
        if (!tokens) { alert('Login first'); return; }
        const res = await fetch(`/api/activities/${id}/apply/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.access}`
            }
        });
        if (res.ok) {
            alert(t('apply.success'));
        } else {
            const data = await res.json().catch(() => ({ detail: 'Error' }));
            alert(data.detail || t('apply.fail'));
        }
    };

    return (
        <main style={{ padding: '1rem', maxWidth: 900, margin: '0 auto' }}>
            {loading && <p>{t('activities.loading')}</p>}
            {error && <p style={{ color: 'salmon' }}>{t('error.generic')}: {error}</p>}
            {!loading && !error && (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {activities.map(a => (
                        <li key={a.id} style={{ border: '1px solid #333', marginBottom: '0.75rem', padding: '0.75rem', borderRadius: 6 }}>
                            <h3 style={{ margin: '0 0 0.25rem' }}>{a.title}</h3>
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>{a.description || 'No description yet.'}</p>
                            <small>Starts: {a.start_datetime} | Ends: {a.end_datetime}</small>
                            <div style={{ marginTop: 8 }}>
                                <button onClick={() => apply(a.id)}>{t('activity.apply')}</button>
                            </div>
                        </li>
                    ))}
                    {activities.length === 0 && <li>{t('activities.none')}</li>}
                </ul>
            )}
        </main>
    );
};

const App: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="App">
            <header className="App-header">
                <h1>{t('app.title')}</h1>
                <p>{t('app.subtitle')}</p>
            </header>
            <Navbar />
            <Routes>
                <Route path="/" element={<ActivityList />} />
                <Route path="/login" element={<Login />} />
            </Routes>
        </div>
    );
};

export default App;

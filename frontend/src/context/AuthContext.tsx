import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export interface Tokens {
    access: string;
    refresh: string;
}

interface AuthContextValue {
    tokens: Tokens | null;
    user: any; // refine by your JWT payload shape if needed
    login: (username: string, password: string) => Promise<Tokens>;
    logout: () => void;
    setTokens: React.Dispatch<React.SetStateAction<Tokens | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [tokens, setTokens] = useState<Tokens | null>(() => {
        const stored = localStorage.getItem('ap_tokens');
        return stored ? JSON.parse(stored) as Tokens : null;
    });
    const [user, setUser] = useState<any>(() => {
        try {
            const stored = localStorage.getItem('ap_tokens');
            if (!stored) return null;
            const { access } = JSON.parse(stored) as Tokens;
            return jwtDecode(access);
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (tokens) {
            localStorage.setItem('ap_tokens', JSON.stringify(tokens));
            try { setUser(jwtDecode(tokens.access)); } catch { setUser(null); }
        } else {
            localStorage.removeItem('ap_tokens');
            setUser(null);
        }
    }, [tokens]);

    const login = async (username: string, password: string) => {
        const res = await fetch('/api/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Invalid credentials');
        const data = await res.json() as Tokens;
        setTokens(data);
        return data;
    };

    const logout = () => setTokens(null);

    const value = useMemo<AuthContextValue>(() => ({ tokens, user, login, logout, setTokens }), [tokens, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

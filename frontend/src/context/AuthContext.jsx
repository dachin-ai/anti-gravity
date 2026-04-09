import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'fm_token';
const USER_KEY = 'fm_user';
const LOGIN_DATE_KEY = 'fm_login_date';

function getTodayStr() {
    return new Date().toISOString().split('T')[0]; // "2026-04-09"
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);         // { username, email }
    const [loading, setLoading] = useState(true);   // initial check

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(LOGIN_DATE_KEY);
        setUser(null);
    }, []);

    // On mount: check stored token
    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        const loginDate = localStorage.getItem(LOGIN_DATE_KEY);
        const today = getTodayStr();

        if (!token) {
            setLoading(false);
            return;
        }

        // If token is from a previous day, clear it
        if (loginDate !== today) {
            logout();
            setLoading(false);
            return;
        }

        // Verify token with backend
        api.post('/auth/verify', {}, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                setUser({ username: res.data.username, email: res.data.email });
            })
            .catch(() => {
                logout();
            })
            .finally(() => setLoading(false));
    }, [logout]);

    const login = useCallback(async (username, password) => {
        const res = await api.post('/auth/login', { username, password });
        const { token } = res.data;
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(LOGIN_DATE_KEY, getTodayStr());

        // Verify & get user info
        const verify = await api.post('/auth/verify', {}, { headers: { Authorization: `Bearer ${token}` } });
        const userData = { username: verify.data.username, email: verify.data.email };
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
        return userData;
    }, []);

    const signup = useCallback(async (email, username, password) => {
        const res = await api.post('/auth/signup', { email, username, password });
        return res.data.message;
    }, []);

    const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), []);

    const logActivity = useCallback(async (toolName) => {
        const token = getToken();
        if (!token || !user) return;
        try {
            await api.post('/auth/log-activity', { tool_name: toolName, token });
        } catch {
            // Silently fail
        }
    }, [user, getToken]);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, signup, logActivity, getToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

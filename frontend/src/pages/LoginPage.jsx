import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SyncOutlined, ArrowLeftOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Bi from '../components/Bi';
import LanguageSelect from '../components/LanguageSelect';
import api, { syncUsers, forgotPassword } from '../api';

const { Title, Text } = Typography;

const LoginPage = () => {
    const { t } = useTranslation();
    const { login, signup } = useAuth();
    const [loadingLogin, setLoadingLogin] = useState(false);
    const [loadingSignup, setLoadingSignup] = useState(false);
    const [loadingSync, setLoadingSync] = useState(false);
    const [loadingReset, setLoadingReset] = useState(false);
    const [activeTab, setActiveTab] = useState('login');
    const [signupDone, setSignupDone] = useState(false);
    const [resetDone, setResetDone] = useState(false);
    const [warmingUp, setWarmingUp] = useState(false);
    const warmingTimerRef = useRef(null);

    // Ping backend on mount so Render cold-start happens while user types credentials
    useEffect(() => {
        api.get('/health', { timeout: 60000 }).catch(() => {});
    }, []);

    const onSyncUsers = async () => {
        setLoadingSync(true);
        try {
            const res = await syncUsers();
            message.success(res.data?.message || t('login.usersSynced'));
        } catch (err) {
            message.error(err.response?.data?.detail || t('login.syncFailed'));
        } finally {
            setLoadingSync(false);
        }
    };

    const onLogin = async (values) => {
        setLoadingLogin(true);
        // Show 'warming up' hint if request takes longer than 5 seconds
        warmingTimerRef.current = setTimeout(() => setWarmingUp(true), 5000);
        try {
            await login(values.username, values.password);
            message.success(t('login.welcomeToast'));
        } catch (err) {
            message.error(err.response?.data?.detail || t('login.loginFailed'));
        } finally {
            clearTimeout(warmingTimerRef.current);
            setLoadingLogin(false);
            setWarmingUp(false);
        }
    };

    const onForgotPassword = async (values) => {
        setLoadingReset(true);
        try {
            const res = await forgotPassword(values.username, values.email);
            setResetDone(true);
            message.success(res.data?.message || t('login.resetOk'));
        } catch (err) {
            message.error(err.response?.data?.detail || t('login.resetFail'));
        } finally {
            setLoadingReset(false);
        }
    };

    const onSignup = async (values) => {
        if (values.password !== values.confirm) {
            message.error(t('login.pwdMismatchForm'));
            return;
        }
        setLoadingSignup(true);
        try {
            const msg = await signup(values.email, values.username, values.password);
            setSignupDone(true);
            message.success(msg);
        } catch (err) {
            message.error(err.response?.data?.detail || t('login.registrationFailed'));
        } finally {
            setLoadingSignup(false);
        }
    };

    const inputStyle = {
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: 10,
        color: '#f1f5f9',
        height: 46,
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#020617',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Inter', sans-serif",
            position: 'relative',
            overflow: 'hidden',
            padding: '40px 20px',
        }}>
            {/* Ambient glows */}
            <div style={{ position: 'absolute', top: '-10%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

            {/* ── CENTER CARD ── */}
            <div style={{
                width: '100%',
                maxWidth: 440,
                background: 'rgba(10,18,35,0.85)',
                border: '1px solid rgba(148,163,184,0.1)',
                borderRadius: 20,
                padding: '44px 40px 36px',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.04)',
                position: 'relative',
                zIndex: 1,
            }}>
                <div style={{ position: 'absolute', top: 16, right: 16 }}>
                    <LanguageSelect size="small" />
                </div>

                {/* Logo + branding */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <img
                        src="/logo.png"
                        alt="Freemir"
                        style={{ height: 34, filter: 'brightness(0) invert(1) opacity(0.9)', marginBottom: 16 }}
                    />
                    <div style={{ color: '#94a3b8', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                        {t('login.internalPlatform')}
                    </div>
                </div>

                    {/* Tab switcher */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: 36, gap: 4, border: '1px solid rgba(148,163,184,0.08)' }}>
                        {['login', 'signup'].map(tab => (
                            <button key={tab} onClick={() => { setActiveTab(tab); setSignupDone(false); setResetDone(false); }}
                                style={{
                                    flex: 1, padding: '9px 0', borderRadius: 9, border: 'none',
                                    cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                                    background: activeTab === tab ? 'rgba(56,189,248,0.15)' : 'transparent',
                                    color: activeTab === tab ? '#38bdf8' : '#64748b',
                                    boxShadow: activeTab === tab ? 'inset 0 0 0 1px rgba(56,189,248,0.25)' : 'none',
                                }}>
                                {tab === 'login' ? <Bi i18nKey="login.signIn" /> : <Bi i18nKey="login.createAccount" />}
                            </button>
                        ))}
                    </div>

                    {/* Header text */}
                    {!signupDone && (
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ color: '#f1f5f9', margin: '0 0 4px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>
                                {activeTab === 'login' ? t('login.welcomeBack') : t('login.requestAccessTitle')}
                            </div>
                            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                {activeTab === 'login'
                                    ? <Bi i18nKey="login.signInContinue" />
                                    : <Bi i18nKey="login.requestAccessBlurb" />
                                }
                            </Text>
                        </div>
                    )}

                    {/* LOGIN FORM */}
                    {activeTab === 'login' && (
                        <Form onFinish={onLogin} layout="vertical" requiredMark={false}>
                            <Form.Item name="username" rules={[{ required: true, message: t('login.enterUsername') }]} style={{ marginBottom: 16 }}>
                                <Input
                                    prefix={<UserOutlined style={{ color: '#475569' }} />}
                                    placeholder={t('login.username')}
                                    style={inputStyle}
                                />
                            </Form.Item>
                            <Form.Item name="password" rules={[{ required: true, message: t('login.enterPassword') }]} style={{ marginBottom: 24 }}>
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: '#475569' }} />}
                                    placeholder={t('login.password')}
                                    style={inputStyle}
                                />
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button htmlType="submit" loading={loadingLogin} block
                                    style={{
                                        height: 48, borderRadius: 10, fontWeight: 700, fontSize: 15,
                                        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                                        color: '#fff', border: 'none',
                                        boxShadow: '0 4px 20px rgba(14,165,233,0.25)',
                                    }}>
                                    {loadingLogin ? t('login.signingIn') : t('login.signInBtn')}
                                </Button>
                            </Form.Item>
                            {warmingUp && (
                                <div style={{
                                    marginTop: 12, padding: '10px 14px', borderRadius: 10,
                                    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <ThunderboltOutlined style={{ color: '#fbbf24', fontSize: 14 }} />
                                    <span style={{ color: '#fbbf24', fontSize: 12 }}>
                                        {t('login.serverWaking')}
                                    </span>
                                </div>
                            )}
                        </Form>
                    )}

                    {/* Forgot password link */}
                    {activeTab === 'login' && (
                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <button onClick={() => { setActiveTab('forgot'); setResetDone(false); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12, padding: 0 }}>
                                {t('login.forgotPassword')}
                            </button>
                        </div>
                    )}

                    {/* FORGOT PASSWORD FORM */}
                    {activeTab === 'forgot' && !resetDone && (
                        <Form onFinish={onForgotPassword} layout="vertical" requiredMark={false}>
                            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
                                {t('login.forgotIntro')}
                            </div>
                            <Form.Item name="username" rules={[{ required: true, message: t('login.enterUsername') }]} style={{ marginBottom: 14 }}>
                                <Input prefix={<UserOutlined style={{ color: '#475569' }} />} placeholder={t('login.username')} style={inputStyle} />
                            </Form.Item>
                            <Form.Item name="email" rules={[{ required: true, type: 'email', message: t('login.emailValid') }]} style={{ marginBottom: 24 }}>
                                <Input prefix={<MailOutlined style={{ color: '#475569' }} />} placeholder={t('login.email')} style={inputStyle} />
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 12 }}>
                                <Button htmlType="submit" loading={loadingReset} block
                                    style={{
                                        height: 48, borderRadius: 10, fontWeight: 700, fontSize: 15,
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                        color: '#fff', border: 'none',
                                        boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
                                    }}>
                                    {loadingReset ? t('login.sending') : t('login.resetPassword')}
                                </Button>
                            </Form.Item>
                            <div style={{ textAlign: 'center' }}>
                                <button onClick={() => setActiveTab('login')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12, padding: 0 }}>
                                    {t('login.backToSignIn')}
                                </button>
                            </div>
                        </Form>
                    )}

                    {/* RESET SUCCESS */}
                    {activeTab === 'forgot' && resetDone && (
                        <div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <CheckCircleOutlined style={{ fontSize: 28, color: '#818cf8' }} />
                            </div>
                            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18, marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>{t('login.checkEmail')}</div>
                            <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, display: 'block' }}>
                                {t('login.newPasswordSent')}
                            </Text>
                            <Button type="text" icon={<ArrowLeftOutlined />}
                                style={{ color: '#38bdf8', marginTop: 24, fontSize: 13 }}
                                onClick={() => { setActiveTab('login'); setResetDone(false); }}>
                                {t('login.backToSignIn')}
                            </Button>
                        </div>
                    )}

                    {/* SIGN UP FORM */}
                    {activeTab === 'signup' && !signupDone && (
                        <Form onFinish={onSignup} layout="vertical" requiredMark={false}>
                            <Form.Item name="email" rules={[{ required: true, type: 'email', message: t('login.emailValid') }]} style={{ marginBottom: 14 }}>
                                <Input prefix={<MailOutlined style={{ color: '#475569' }} />} placeholder={t('login.registerEmail')} style={inputStyle} />
                            </Form.Item>
                            <Form.Item name="username" rules={[{ required: true, message: t('login.chooseUsername') }]} style={{ marginBottom: 14 }}>
                                <Input prefix={<UserOutlined style={{ color: '#475569' }} />} placeholder={t('login.username')} style={inputStyle} />
                            </Form.Item>
                            <Form.Item name="password" rules={[{ required: true, min: 6, message: t('login.pwdMin6') }]} style={{ marginBottom: 14 }}>
                                <Input.Password prefix={<LockOutlined style={{ color: '#475569' }} />} placeholder={t('login.password')} style={inputStyle} />
                            </Form.Item>
                            <Form.Item name="confirm" rules={[{ required: true, message: t('login.confirmPwdRequired') }]} style={{ marginBottom: 24 }}>
                                <Input.Password prefix={<LockOutlined style={{ color: '#475569' }} />} placeholder={t('login.confirmPwd')} style={inputStyle} />
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button htmlType="submit" loading={loadingSignup} block
                                    style={{
                                        height: 48, borderRadius: 10, fontWeight: 700, fontSize: 15,
                                        background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                                        color: '#fff', border: 'none',
                                        boxShadow: '0 4px 20px rgba(16,185,129,0.2)',
                                    }}>
                                    {loadingSignup ? t('login.submitting') : t('login.requestAccessBtn')}
                                </Button>
                            </Form.Item>
                        </Form>
                    )}

                    {/* SIGN UP SUCCESS */}
                    {activeTab === 'signup' && signupDone && (
                        <div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <CheckCircleOutlined style={{ fontSize: 28, color: '#10b981' }} />
                            </div>
                            <div style={{ color: '#f1f5f9', margin: '0 0 8px', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>{t('login.awaitingApproval')}</div>
                            <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, display: 'block' }}>
                                {t('login.awaitingApprovalBlurb')}
                            </Text>
                            <Button type="text" icon={<ArrowLeftOutlined />}
                                style={{ color: '#38bdf8', marginTop: 24, fontSize: 13 }}
                                onClick={() => { setActiveTab('login'); setSignupDone(false); }}>
                                {t('login.backToSignIn')}
                            </Button>
                        </div>
                    )}

                    {/* Admin sync */}
                    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(148,163,184,0.08)', textAlign: 'center' }}>
                        <Button icon={<SyncOutlined spin={loadingSync} />} loading={loadingSync} onClick={onSyncUsers} size="small"
                            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#64748b', borderRadius: 8, fontSize: 11, height: 30, paddingInline: 12 }}>
                            {t('login.refreshUsers')}
                        </Button>
                        <div style={{ color: '#64748b', fontSize: 10, marginTop: 6 }}>{t('login.adminSyncHint')}</div>
                    </div>
                </div>
            </div>
    );
};

export default LoginPage;

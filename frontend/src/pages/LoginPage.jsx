import React, { useState } from 'react';
import { Form, Input, Button, message, Tabs, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import Bi from '../components/Bi';

const { Title, Text, Link } = Typography;

const LoginPage = () => {
    const { login, signup } = useAuth();
    const [loadingLogin, setLoadingLogin] = useState(false);
    const [loadingSignup, setLoadingSignup] = useState(false);
    const [activeTab, setActiveTab] = useState('login');
    const [signupDone, setSignupDone] = useState(false);

    const onLogin = async (values) => {
        setLoadingLogin(true);
        try {
            await login(values.username, values.password);
            message.success('Welcome back! 欢迎回来！');
        } catch (err) {
            message.error(err.response?.data?.detail || 'Login failed.');
        } finally {
            setLoadingLogin(false);
        }
    };

    const onSignup = async (values) => {
        if (values.password !== values.confirm) {
            message.error('Passwords do not match!');
            return;
        }
        setLoadingSignup(true);
        try {
            const msg = await signup(values.email, values.username, values.password);
            setSignupDone(true);
            message.success(msg);
        } catch (err) {
            message.error(err.response?.data?.detail || 'Registration failed.');
        } finally {
            setLoadingSignup(false);
        }
    };

    const inputStyle = {
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 8,
        color: '#f1f5f9',
        height: 44,
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#020617',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* Animated background glow orbs */}
            <div style={{
                position: 'absolute', top: '15%', left: '10%',
                width: 400, height: 400, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', bottom: '10%', right: '8%',
                width: 350, height: 350, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none'
            }} />

            {/* Card */}
            <div style={{
                width: '100%',
                maxWidth: 440,
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 20,
                padding: '40px 36px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
                zIndex: 1,
            }}>
                {/* Logo & Title */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 14,
                        background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                    }}>
                        <span style={{ color: '#fff', fontSize: 26, fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>F</span>
                    </div>
                    <Title level={3} style={{ color: '#f1f5f9', margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 22 }}>
                        Freemir Tools
                    </Title>
                    <Text style={{ color: '#64748b', fontSize: 13 }}>
                        <Bi e="Internal Operations Platform" c="内部运营平台" />
                    </Text>
                </div>

                {/* Tabs: Login / Sign Up */}
                <div style={{
                    display: 'flex', background: 'rgba(255,255,255,0.04)',
                    borderRadius: 10, padding: 4, marginBottom: 36, gap: 4
                }}>
                    {['login', 'signup'].map(tab => (
                        <button key={tab} onClick={() => { setActiveTab(tab); setSignupDone(false); }}
                            style={{
                                flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
                                cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                                background: activeTab === tab ? 'rgba(99,102,241,0.9)' : 'transparent',
                                color: activeTab === tab ? '#fff' : '#94a3b8',
                            }}>
                            {tab === 'login' ? <Bi e="🔑 Login" c="登录" /> : <Bi e="✍️ Sign Up" c="注册" />}
                        </button>
                    ))}
                </div>

                {/* LOGIN FORM */}
                {activeTab === 'login' && (
                    <Form onFinish={onLogin} layout="vertical" requiredMark={false}>
                        <Form.Item name="username" rules={[{ required: true, message: 'Enter your username' }]} style={{ marginBottom: 24 }}>
                            <Input
                                prefix={<UserOutlined style={{ color: '#6366f1' }} />}
                                placeholder="Username"
                                style={inputStyle}
                            />
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]} style={{ marginBottom: 24 }}>
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#6366f1' }} />}
                                placeholder="Password"
                                style={inputStyle}
                            />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
                            <Button
                                htmlType="submit"
                                loading={loadingLogin}
                                block
                                style={{
                                    height: 46, borderRadius: 10, fontWeight: 700, fontSize: 15,
                                    background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                                    color: '#fff', border: 'none',
                                    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                                }}
                            >
                                {loadingLogin ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </Form.Item>
                    </Form>
                )}

                {/* SIGN UP FORM */}
                {activeTab === 'signup' && !signupDone && (
                    <Form onFinish={onSignup} layout="vertical" requiredMark={false}>
                        <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]} style={{ marginBottom: 20 }}>
                            <Input
                                prefix={<MailOutlined style={{ color: '#6366f1' }} />}
                                placeholder="Email Address"
                                style={inputStyle}
                            />
                        </Form.Item>
                        <Form.Item name="username" rules={[{ required: true, message: 'Choose a username' }]} style={{ marginBottom: 20 }}>
                            <Input
                                prefix={<UserOutlined style={{ color: '#6366f1' }} />}
                                placeholder="Username"
                                style={inputStyle}
                            />
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Min. 6 characters' }]} style={{ marginBottom: 20 }}>
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#6366f1' }} />}
                                placeholder="Password"
                                style={inputStyle}
                            />
                        </Form.Item>
                        <Form.Item name="confirm" rules={[{ required: true, message: 'Confirm your password' }]} style={{ marginBottom: 20 }}>
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#6366f1' }} />}
                                placeholder="Confirm Password"
                                style={inputStyle}
                            />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
                            <Button
                                htmlType="submit"
                                loading={loadingSignup}
                                block
                                style={{
                                    height: 46, borderRadius: 10, fontWeight: 700, fontSize: 15,
                                    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                                    color: '#fff', border: 'none',
                                    boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
                                }}
                            >
                                {loadingSignup ? 'Submitting...' : 'Create Account'}
                            </Button>
                        </Form.Item>
                    </Form>
                )}

                {/* SIGN UP SUCCESS */}
                {activeTab === 'signup' && signupDone && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                        <Title level={4} style={{ color: '#f1f5f9', margin: '0 0 8px' }}>Awaiting Approval</Title>
                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                            Your account has been registered successfully. An admin will review and approve your access shortly.
                        </Text>
                        <Button
                            type="link"
                            style={{ color: '#6366f1', marginTop: 16, display: 'block' }}
                            onClick={() => { setActiveTab('login'); setSignupDone(false); }}
                        >
                            ← Back to Login
                        </Button>
                    </div>
                )}

                {/* Footer note */}
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <SafetyCertificateOutlined style={{ color: '#475569', fontSize: 12 }} />
                        <Text style={{ color: '#475569', fontSize: 11 }}>
                            Access controlled · Sessions valid for 24 hours
                        </Text>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

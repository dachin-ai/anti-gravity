import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Input, Spin, Typography, Avatar } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { askAssistant } from '../api';

const { Text } = Typography;

const AiAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Halo! Saya freemir AI. Ada yang bisa saya bantu terkait Cek Harga atau panduan alat yang ada?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg = { role: 'user', text: inputValue };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const res = await askAssistant(newMessages);
            if (res.data && res.data.response) {
                setMessages([...newMessages, { role: 'model', text: res.data.response }]);
            }
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages([...newMessages, { role: 'model', text: 'Maaf, sistem AI sedang mengalami gangguan koneksi atau database harga belum termuat.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <>
            {/* FLOATING BUTTON */}
            {!isOpen && (
                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<MessageOutlined style={{ fontSize: 24 }} />}
                    style={{
                        position: 'fixed',
                        bottom: 30,
                        right: 30,
                        width: 60,
                        height: 60,
                        boxShadow: '0 4px 12px rgba(56, 189, 248, 0.4)',
                        zIndex: 9999,
                        background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                        border: 'none',
                    }}
                    onClick={() => setIsOpen(true)}
                />
            )}

            {/* CHAT WINDOW */}
            {isOpen && (
                <Card
                    style={{
                        position: 'fixed',
                        bottom: 30,
                        right: 30,
                        width: 380,
                        height: 550,
                        zIndex: 10000,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 16,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        border: '1px solid var(--border)',
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(10px)',
                    }}
                    bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                    {/* HEADER */}
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(129, 140, 248, 0.1))',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar size="small" icon={<RobotOutlined />} style={{ backgroundColor: '#38bdf8' }} />
                            <Text style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 16 }}>freemir AI</Text>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined style={{ color: '#94a3b8' }} />}
                            onClick={() => setIsOpen(false)}
                            style={{ padding: 4 }}
                        />
                    </div>

                    {/* MESSAGES AREA */}
                    <div style={{
                        flexGrow: 1,
                        overflowY: 'auto',
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        {messages.map((m, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                            }}>
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '10px 14px',
                                    borderRadius: m.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                                    background: m.role === 'user' ? '#3b82f6' : 'rgba(30, 41, 59, 0.8)',
                                    color: m.role === 'user' ? '#fff' : '#e2e8f0',
                                    border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: '16px 16px 16px 0',
                                    background: 'rgba(30, 41, 59, 0.8)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}>
                                    <Spin size="small" /> <span style={{ marginLeft: 8, color: '#94a3b8', fontSize: 12 }}>Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* INPUT AREA */}
                    <div style={{
                        padding: 16,
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                    }}>
                        <Input
                            placeholder="Ask me about SKUs or tools..."
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={{
                                borderRadius: 20,
                                background: 'rgba(15, 23, 42, 0.5)',
                                color: '#fff',
                                borderColor: 'var(--border)'
                            }}
                            bordered={false}
                        />
                        <Button
                            type="primary"
                            shape="circle"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                            disabled={isLoading || !inputValue.trim()}
                            style={{ background: '#3b82f6' }}
                        />
                    </div>
                </Card>
            )}
        </>
    );
};

export default AiAssistant;

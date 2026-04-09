import React, { useState } from 'react';
import {
    Typography, Button, Row, Col, Upload, message, Spin, Divider
} from 'antd';
import {
    CloudUploadOutlined, FileExcelOutlined, FileAddOutlined, 
    ThunderboltOutlined, InboxOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const SectionHeading = ({ emoji, children }) => (
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span>{emoji}</span> {children}
    </div>
);

const ErpOosCalculate = () => {
    const [fileA, setFileA] = useState([]);
    const [fileB, setFileB] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleUpload = async () => {
        if (!fileA.length || !fileB.length) {
            message.warning('Please upload BOTH Data A (Orders) and Data B (Inventory) files');
            return;
        }

        const formData = new FormData();
        formData.append('file_a', fileA[0]);
        formData.append('file_b', fileB[0]);

        setLoading(true);
        setResult(null);

        try {
            const res = await api.post('/erp-oos/calculate', formData);
            setResult(res.data);
            message.success('Matching Complete!');
        } catch (err) {
            message.error(err.response?.data?.detail || 'Calculation failed. Please check the file structure.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!result?.file_base64) return;
        const bytes = atob(result.file_base64);
        const buf = new Uint8Array(bytes.length).map((_, i) => bytes.charCodeAt(i));
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `OOS_Matched_Result.xlsx` }).click();
    };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: 'var(--text-main)', fontWeight: 800 }}>
                    ⚡ ERP Out of Stock Matcher
                </Title>
                <Text style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Instantly cross-reference Orders against Zero-Stock Inventory
                </Text>
            </div>

            <Row gutter={24}>
                <Col xs={24} md={12}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                        <SectionHeading emoji="📦">Data A (Orders)</SectionHeading>
                        <Text style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }}>
                            Requires at least 81 columns (Exported from Qianyi). PreSale / OnlineShip orders are auto-ignored.
                        </Text>
                        <Dragger
                            maxCount={1}
                            beforeUpload={(file) => { setFileA([file]); return false; }}
                            onRemove={() => setFileA([])}
                            fileList={fileA}
                            style={{ borderRadius: 8 }}
                        >
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: 'var(--indigo)' }} /></p>
                            <p className="ant-upload-text" style={{ color: 'var(--text-main)', fontSize: 14 }}>Select Order File</p>
                        </Dragger>
                    </div>
                </Col>

                <Col xs={24} md={12}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                        <SectionHeading emoji="📋">Data B (Inventory)</SectionHeading>
                        <Text style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }}>
                            Requires at least 5 columns. SKUs with exactly 0 quantity are matched against Data A.
                        </Text>
                        <Dragger
                            maxCount={1}
                            beforeUpload={(file) => { setFileB([file]); return false; }}
                            onRemove={() => setFileB([])}
                            fileList={fileB}
                            style={{ borderRadius: 8 }}
                        >
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#10b981' }} /></p>
                            <p className="ant-upload-text" style={{ color: 'var(--text-main)', fontSize: 14 }}>Select Inventory File</p>
                        </Dragger>
                    </div>
                </Col>
            </Row>

            <Button
                block
                loading={loading}
                onClick={handleUpload}
                icon={<ThunderboltOutlined />}
                style={{
                    height: 54, borderRadius: 8, fontWeight: 700, fontSize: 16,
                    background: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)', color: '#fff', border: 'none',
                    boxShadow: '0 4px 14px rgba(245,158,11,0.3)', marginBottom: 32
                }}
            >
                {loading ? 'Crunching Match Data...' : 'Run Cross-Reference Check'}
            </Button>

            {result && !loading && (
                <div>
                     <Divider style={{ borderColor: 'var(--border)' }} />
                     <SectionHeading emoji="📊">Matching Results</SectionHeading>
                     
                     <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} md={8}>
                            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                                <div style={{ color: '#3b82f6', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Initial Orders</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)' }}>{result.summary.total_initial.toLocaleString()}</div>
                            </div>
                        </Col>
                        <Col xs={24} md={8}>
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                                <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Zero Stock Items (B)</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)' }}>{result.summary.zero_stock_skus.toLocaleString()}</div>
                            </div>
                        </Col>
                        <Col xs={24} md={8}>
                            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                                <div style={{ color: '#10b981', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Final Matches Found</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)' }}>{result.summary.final_matches.toLocaleString()}</div>
                            </div>
                        </Col>
                     </Row>

                     <Button
                        size="large"
                        onClick={handleDownload}
                        icon={<FileExcelOutlined />}
                        style={{
                            height: 54, borderRadius: 8, fontWeight: 700, fontSize: 15,
                            background: '#10b981', color: '#fff', border: 'none',
                            boxShadow: '0 4px 14px rgba(16,185,129,0.3)', width: '100%',
                        }}
                    >
                        Download Extracted Matches (.xlsx)
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ErpOosCalculate;

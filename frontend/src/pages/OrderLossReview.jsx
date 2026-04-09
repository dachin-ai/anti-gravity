import React, { useState } from 'react';
import {
    Typography, Button, Row, Col, Upload, message, Spin, Divider, Select
} from 'antd';
import {
    InboxOutlined, CloudUploadOutlined, FileExcelOutlined,
    WarningOutlined, CheckCircleFilled, DollarOutlined, LineChartOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

const SectionHeading = ({ emoji, children }) => (
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span>{emoji}</span> {children}
    </div>
);

const statCardStyle = (accentColor, bgColor) => ({
    background: bgColor,
    border: '1px solid var(--border)',
    borderLeft: `4px solid ${accentColor}`,
    borderRadius: 12,
    padding: '20px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
});

const OrderLossReview = () => {
    const [fileList, setFileList] = useState([]);
    const [priceType, setPriceType] = useState('Warning');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleUpload = async () => {
        if (!fileList.length) {
            message.warning('Please upload an Excel or CSV file first');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileList[0]);
        formData.append('price_type', priceType);

        setLoading(true);
        setResult(null);

        try {
            const res = await api.post('/order-loss/calculate', formData);
            setResult(res.data);
            message.success('Audit complete! See summary below.');
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
        Object.assign(document.createElement('a'), { href: url, download: `Pricing_Pnl_Audit_${priceType}.xlsx` }).click();
    };

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: 'var(--text-main)', fontWeight: 800 }}>
                    Profit & Loss Auto-Analyzer
                </Title>
                <Text style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Double-Layer Pricing & Profitability Audit System
                </Text>
            </div>

            <Row gutter={24}>
                {/* CONFIGURATION */}
                <Col xs={24} md={8}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                        <SectionHeading emoji="⚙️">Audit Configuration</SectionHeading>
                        <Text style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }}>
                            Select Target Base Price (Master Spreadsheet)
                        </Text>
                        <Select
                            size="large"
                            value={priceType}
                            onChange={setPriceType}
                            style={{ width: '100%', borderRadius: 8 }}
                        >
                            <Option value="Warning">Warning Base Price</Option>
                            <Option value="Daily-Top-Creator">Daily-Top-Creator</Option>
                            <Option value="DD-Top-Creator">DD-Top-Creator</Option>
                            <Option value="PD-Top-Creator">PD-Top-Creator</Option>
                        </Select>

                        <Divider style={{ borderColor: 'var(--border)', margin: '24px 0' }} />

                        <SectionHeading emoji="📋">File Requirements</SectionHeading>
                        <ul style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 20, margin: 0 }}>
                            <li style={{ marginBottom: 6 }}>Store (店铺)</li>
                            <li style={{ marginBottom: 6 }}>Original Order Number (原始单号)</li>
                            <li style={{ marginBottom: 6 }}>ERP Order Number (ERP单号)</li>
                            <li style={{ marginBottom: 6 }}>Online Product Code (线上商品编码)</li>
                            <li style={{ marginBottom: 6 }}>System Product Code (系统商品编码)</li>
                            <li style={{ marginBottom: 6 }}>Product Detail Gross Profit (商品明细毛利)</li>
                            <li style={{ marginBottom: 6 }}>Amount After Discount (商品实付金额)</li>
                            <li style={{ marginBottom: 0 }}>Seller Coupon (卖家优惠券)</li>
                        </ul>
                    </div>
                </Col>

                {/* UPLOAD & PROCESS */}
                <Col xs={24} md={16}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
                        <SectionHeading emoji="📂">Upload Target File</SectionHeading>
                        <Dragger
                            maxCount={1}
                            beforeUpload={(file) => { setFileList([file]); return false; }}
                            onRemove={() => setFileList([])}
                            fileList={fileList}
                            style={{ borderRadius: 8, marginBottom: 24, padding: '20px 0' }}
                            itemRender={(_, file, __, { remove }) => (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8', borderRadius: 6,
                                    padding: '8px 12px', marginTop: 16,
                                }}>
                                    <Text style={{ color: '#38bdf8', fontSize: 14, fontWeight: 500 }}>
                                        📄 {file.name}
                                    </Text>
                                    <Button type="text" size="small" danger onClick={remove} style={{ fontSize: 12, color: '#ef4444' }}>
                                        Remove
                                    </Button>
                                </div>
                            )}
                        >
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#38bdf8' }} /></p>
                            <p className="ant-upload-text" style={{ color: 'var(--text-main)', fontSize: 16 }}>Click or drag a Qianyi ERP file here</p>
                            <p className="ant-upload-hint" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Support for .xlsx or .csv files.</p>
                        </Dragger>

                        <Button
                            block
                            loading={loading}
                            onClick={handleUpload}
                            icon={<CloudUploadOutlined />}
                            style={{
                                height: 48, borderRadius: 8, fontWeight: 700, fontSize: 15,
                                background: 'var(--indigo)', color: '#fff', border: 'none',
                                boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                            }}
                        >
                            {loading ? 'Running Audit Diagnostics...' : 'Start Full Audit'}
                        </Button>
                    </div>

                    {/* RESULTS */}
                    {result && !loading && (
                        <div style={{ marginTop: 24 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />
                            <SectionHeading emoji="📊">Audit Output Summary</SectionHeading>

                            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                                <Col xs={24} md={8}>
                                    <div style={{...statCardStyle('#3b82f6', 'rgba(59, 130, 246, 0.15)'), borderLeft: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white' }}>
                                        <Text style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                                            Total Orders | 总订单数
                                        </Text>
                                        <div style={{ fontSize: 42, color: '#fff', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
                                            {result.summary.total_orders.toLocaleString()}
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={{...statCardStyle('#10b981', 'rgba(16, 185, 129, 0.05)'), borderLeft: '4px solid #10b981' }}>
                                        <Text style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                                            Safe Orders | 安全订单
                                        </Text>
                                        <div style={{ fontSize: 42, color: '#10b981', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
                                            {result.summary.safe_orders.toLocaleString()}
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={{...statCardStyle('#ec4899', 'rgba(236, 72, 153, 0.05)'), borderLeft: '4px solid #ec4899' }}>
                                        <Text style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                                            Diagnosed Issues | 诊断问题
                                        </Text>
                                        <div style={{ fontSize: 42, color: '#ec4899', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
                                            {result.summary.review_orders.toLocaleString()}
                                        </div>
                                    </div>
                                </Col>
                            </Row>

                            <SectionHeading emoji="💰">Financial Summary | 财务摘要</SectionHeading>
                            
                            <Row gutter={[16, 16]} style={{ marginBottom: 32, display: 'flex' }}>
                                <Col style={{ flex: '1 1 20%', minWidth: 150 }}>
                                    <div style={{...statCardStyle('#3b82f6', 'rgba(59,130,246,0.1)'), border: 'none', borderLeft: '4px solid #3b82f6', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                                            Total Transactions
                                        </Text>
                                        <div style={{ fontSize: 26, color: '#fff', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
                                            {result.summary.total_transactions.toLocaleString()}
                                        </div>
                                    </div>
                                </Col>
                                <Col style={{ flex: '1 1 20%', minWidth: 150 }}>
                                    <div style={{...statCardStyle('#f59e0b', 'rgba(245,158,11,0.05)'), border: '1px solid var(--border)', borderLeft: '4px solid #f59e0b' }}>
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                                            Sales Loss
                                        </Text>
                                        <div style={{ fontSize: 26, color: '#f59e0b', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
                                            {result.summary.sales_loss.toLocaleString()}
                                        </div>
                                    </div>
                                </Col>
                                <Col style={{ flex: '1 1 20%', minWidth: 150 }}>
                                    <div style={{...statCardStyle('#ec4899', 'rgba(236,72,153,0.05)'), border: '1px solid var(--border)', borderLeft: '4px solid #ec4899' }}>
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                                            After Sales Loss
                                        </Text>
                                        <div style={{ fontSize: 26, color: '#ec4899', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
                                            {result.summary.aftersales_loss.toLocaleString()}
                                        </div>
                                    </div>
                                </Col>
                                <Col style={{ flex: '1 1 20%', minWidth: 150 }}>
                                    <div style={{...statCardStyle('#10b981', 'rgba(16,185,129,0.05)'), border: '1px solid var(--border)', borderLeft: '4px solid #10b981' }}>
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                                            Total Profit
                                        </Text>
                                        <div style={{ fontSize: 26, color: '#10b981', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
                                            {result.summary.total_profit.toLocaleString()}
                                        </div>
                                    </div>
                                </Col>
                                <Col style={{ flex: '1 1 20%', minWidth: 150 }}>
                                    <div style={{...statCardStyle('#f8fafc', 'transparent'), border: '1px solid var(--border)', borderLeft: '4px solid #475569' }}>
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                                            Final Profit
                                        </Text>
                                        <div style={{ fontSize: 26, color: 'var(--text-main)', fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
                                            {result.summary.final_profit.toLocaleString()}
                                        </div>
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
                                Download Extensive Audit Report (.xlsx)
                            </Button>
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    );
};

export default OrderLossReview;

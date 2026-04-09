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

                            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                <Col xs={24} md={8}>
                                    <div style={statCardStyle('var(--indigo)', 'rgba(99,102,241,0.05)')}>
                                        <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>
                                            {result.summary.total_orders.toLocaleString()}
                                        </div>
                                        <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--indigo)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                            Total Orders Audited
                                        </Text>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={statCardStyle('#10b981', 'rgba(16,185,129,0.05)')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <CheckCircleFilled style={{ color: '#10b981', fontSize: 24 }} />
                                            <span style={{ fontSize: 36, fontWeight: 900, color: '#10b981', fontFamily: "'Outfit', sans-serif" }}>
                                                {result.summary.safe_orders.toLocaleString()}
                                            </span>
                                        </div>
                                        <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                            Safe & Profitable
                                        </Text>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={statCardStyle('#ef4444', 'rgba(239,68,68,0.05)')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <WarningOutlined style={{ color: '#ef4444', fontSize: 24 }} />
                                            <span style={{ fontSize: 36, fontWeight: 900, color: '#ef4444', fontFamily: "'Outfit', sans-serif" }}>
                                                {result.summary.review_orders.toLocaleString()}
                                            </span>
                                        </div>
                                        <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                            Diagnosed Issues
                                        </Text>
                                    </div>
                                </Col>
                            </Row>

                            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                                <Col xs={24} md={12}>
                                    <div style={{ background: 'var(--bg-panel)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                                                Sales Loss Detected
                                            </div>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', fontFamily: "'Outfit', sans-serif" }}>
                                                Rp {result.summary.sales_loss.toLocaleString()}
                                            </div>
                                        </div>
                                        <LineChartOutlined style={{ fontSize: 32, color: 'rgba(245, 158, 11, 0.2)' }} />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ background: 'var(--bg-panel)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                                                Final Calculated Profit
                                            </div>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: result.summary.final_profit > 0 ? '#10b981' : '#ef4444', fontFamily: "'Outfit', sans-serif" }}>
                                                Rp {result.summary.final_profit.toLocaleString()}
                                            </div>
                                        </div>
                                        <DollarOutlined style={{ fontSize: 32, color: result.summary.final_profit > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }} />
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

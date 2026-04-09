import React, { useState } from 'react';
import {
    Typography, Button, Row, Col, Upload, message, Spin, Divider, Table
} from 'antd';
import {
    InboxOutlined, CloudUploadOutlined, FileExcelOutlined,
    AppstoreOutlined, ShoppingCartOutlined, DollarOutlined, TagOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const SectionHeading = ({ emoji, children }) => (
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span>{emoji}</span> {children}
    </div>
);

const metricBoxStyle = (gradient) => ({
    background: gradient,
    padding: '20px',
    borderRadius: '12px',
    color: '#fff',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
});

const FailedDelivery = () => {
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleUpload = async () => {
        if (!fileList.length) {
            message.warning('Please upload a TikTok Order Export file (.csv or .xlsx)');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileList[0]);

        setLoading(true);
        setResult(null);

        try {
            const res = await api.post('/failed-delivery/calculate', formData);
            setResult(res.data);
            message.success('Analysis complete!');
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
        Object.assign(document.createElement('a'), { href: url, download: `TikTok_Failed_Delivery_Analysis.xlsx` }).click();
    };

    const topSkuColumns = [
        { title: 'Rank', dataIndex: 'rank', key: 'rank', width: 60, render: (_,__,i) => <span style={{color: 'var(--text-muted)'}}>{i + 1}</span> },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v) => <Text style={{fontWeight: 600, color: 'var(--text-main)'}}>{v}</Text> },
        { title: 'Product Name', dataIndex: 'name', key: 'name', ellipsis: true },
        { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 80, align: 'right', render: (v) => <Text strong>{v}</Text> },
    ];

    const simpleColumns = (titleCol) => [
        { title: 'Rank', dataIndex: 'rank', key: 'rank', width: 60, render: (_,__,i) => <span style={{color: 'var(--text-muted)'}}>{i + 1}</span> },
        { title: titleCol, dataIndex: 'key', key: 'key', render: (v) => <Text style={{fontWeight: 600, color: 'var(--text-main)'}}>{v}</Text> },
        { title: 'Count', dataIndex: 'count', key: 'count', width: 80, align: 'right', render: (v) => <Text strong>{v}</Text> },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: 'var(--text-main)', fontWeight: 800 }}>
                    TikTok Order Analyzer
                </Title>
                <Text style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Bilingual Analysis Tool for Tracking and Resolving Failed Deliveries
                </Text>
            </div>

            <Row gutter={24}>
                <Col xs={24} md={8}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                         <SectionHeading emoji="ℹ️">Instructions</SectionHeading>
                         <Text style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>
                            Extract data from TikTok Shop Seller Center: "Order SKU List".
                         </Text>
                         <Text style={{ fontSize: 12, color: '#ef4444', display: 'block' }}>
                            * Ensure the export has at least 55 columns (A-BC)
                         </Text>
                    </div>
                </Col>

                <Col xs={24} md={16}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
                        <SectionHeading emoji="📂">Upload Data Export</SectionHeading>
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
                                    <Button type="text" size="small" danger onClick={remove} style={{ fontSize: 12, color: '#ef4444' }}>Remove</Button>
                                </div>
                            )}
                        >
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#ec4899' }} /></p>
                            <p className="ant-upload-text" style={{ color: 'var(--text-main)', fontSize: 16 }}>Click or drag a TikTok CSV/Excel file here</p>
                        </Dragger>

                        <Button
                            block
                            loading={loading}
                            onClick={handleUpload}
                            icon={<CloudUploadOutlined />}
                            style={{
                                height: 48, borderRadius: 8, fontWeight: 700, fontSize: 15,
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#fff', border: 'none',
                                boxShadow: '0 4px 14px rgba(245,87,108,0.3)',
                            }}
                        >
                            {loading ? 'Processing Data...' : 'Analyze TikTok Orders'}
                        </Button>
                    </div>

                    {result && !loading && (
                        <div style={{ marginTop: 24 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />
                            <SectionHeading emoji="📈">Quick Overview</SectionHeading>

                            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                <Col xs={12} md={6}>
                                    <div style={metricBoxStyle('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')}>
                                        <div style={{ fontSize: 12, opacity: 0.9 }}><ShoppingCartOutlined /> Total Orders</div>
                                        <div style={{ fontSize: 28, fontWeight: 800 }}>{result.summary.total_orders.toLocaleString()}</div>
                                    </div>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div style={metricBoxStyle('linear-gradient(135deg, #f5576c 0%, #f093fb 100%)')}>
                                        <div style={{ fontSize: 12, opacity: 0.9 }}><AppstoreOutlined /> Total Items</div>
                                        <div style={{ fontSize: 28, fontWeight: 800 }}>{result.summary.total_items.toLocaleString()}</div>
                                    </div>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div style={metricBoxStyle('linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)')}>
                                        <div style={{ fontSize: 12, opacity: 0.9 }}><DollarOutlined /> Total Value</div>
                                        <div style={{ fontSize: 28, fontWeight: 800 }}>Rp {result.summary.total_value.toLocaleString()}</div>
                                    </div>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div style={metricBoxStyle('linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)')}>
                                        <div style={{ fontSize: 12, opacity: 0.9 }}><TagOutlined /> Unique SKUs</div>
                                        <div style={{ fontSize: 28, fontWeight: 800 }}>{result.summary.unique_skus.toLocaleString()}</div>
                                    </div>
                                </Col>
                            </Row>

                            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                <Col xs={24} md={12}>
                                    <div style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', height: '100%' }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>🏆 Top 5 SKUs</div>
                                        <Table 
                                            columns={topSkuColumns} 
                                            dataSource={result.summary.top_skus} 
                                            pagination={false} size="small" rowKey="sku"
                                        />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', height: '100%' }}>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>⚠️ Top 5 Cancel Reasons</div>
                                        <Table 
                                            columns={simpleColumns('Reason')} 
                                            dataSource={result.summary.top_reasons.map(r => ({key: r.reason, count: r.count}))} 
                                            pagination={false} size="small" rowKey="key"
                                        />
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

export default FailedDelivery;

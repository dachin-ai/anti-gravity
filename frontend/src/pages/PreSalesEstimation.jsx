import React, { useState } from 'react';
import {
    Typography, Button, Row, Col, Upload, message, Spin, Divider, Table
} from 'antd';
import {
    InboxOutlined, CloudUploadOutlined, FileExcelOutlined,
    ShoppingCartOutlined, CheckCircleOutlined, CodeSandboxOutlined
} from '@ant-design/icons';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Bi from '../components/Bi';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const SectionHeading = ({ emoji, children }) => (
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span>{emoji}</span> {children}
    </div>
);

const PreSalesEstimation = () => {
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { logActivity } = useAuth();

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
            const res = await api.post('/pre-sales/calculate', formData);
            setResult(res.data);
            message.success('Analysis complete!');
            logActivity('Pre-Sales Estimation');
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
        Object.assign(document.createElement('a'), { href: url, download: `PreSales_Estimation_Report.xlsx` }).click();
    };

    const topColumns = result?.summary?.top_rows?.length > 0 
        ? Object.keys(result.summary.top_rows[0]).slice(0, 6).map(key => ({
            title: key,
            dataIndex: key,
            key: key,
            ellipsis: true,
            render: (v) => <Text style={{ fontSize: 13, color: 'var(--text-main)' }}>{v}</Text>
          }))
        : [];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: 'var(--text-main)', fontWeight: 800 }}>
                    <Bi e="Pre-Sales Dashboard" c="预售看板" />
                </Title>
                <Text style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    <Bi e="Automated Logistics Intelligence & SKU Orchestration" c="自动化物流智能与 SKU 协同" />
                </Text>
            </div>

            <Row gutter={24}>
                <Col xs={24} md={8}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                         <SectionHeading emoji="⚙️"><Bi e="Engine Processing" c="处理引擎" /></SectionHeading>
                         <Text style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }}>
                            <Bi e="Extract raw data from TikTok Shop Seller Center. Ensure you include Column AM (Warehouse)." c="从 TikTok 卖家中心提取原始数据，请确保报表包含 AM 列（发货仓）。" />
                         </Text>
                         <ul style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 20, margin: 0 }}>
                            <li style={{ marginBottom: 6 }}><Bi e="Finds 'To Ship' orders" c="自动过滤并查找“待出货”订单" /></li>
                            <li style={{ marginBottom: 6 }}><Bi e="Reads QTY & Warehouses" c="读取商品数量与发货仓信息" /></li>
                            <li style={{ marginBottom: 6 }}><Bi e="Validates SKU length (≥11)" c="验证 SKU 格式与长度 (≥11)" /></li>
                            <li style={{ marginBottom: 0 }}><Bi e="Syncs with Master Data Google Sheet" c="与核心主数据 (Google Sheet) 实时同步" /></li>
                         </ul>
                    </div>
                </Col>

                <Col xs={24} md={16}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
                        <SectionHeading emoji="📂"><Bi e="Upload Target File" c="上传目标文件" /></SectionHeading>
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
                                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                            {file.size ? '(' + (file.size / 1024 / 1024 > 1 ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : (file.size / 1024).toFixed(2) + ' KB') + ')' : ''}
                                        </span>
                                    </Text>
                                    <Button type="text" size="small" danger onClick={remove} style={{ fontSize: 12, color: '#ef4444' }}><Bi e="Remove" c="移除" /></Button>
                                </div>
                            )}
                        >
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#001F3F' }} /></p>
                            <p className="ant-upload-text" style={{ color: 'var(--text-main)', fontSize: 16 }}><Bi e="Click or drag TikTok Raw Data here" c="点击或拖拽 TikTok原始数据到此处" /></p>
                        </Dragger>

                        <Button
                            block
                            loading={loading}
                            onClick={handleUpload}
                            icon={<CloudUploadOutlined />}
                            style={{
                                height: 48, borderRadius: 8, fontWeight: 700, fontSize: 15,
                                background: '#001F3F', color: '#fff', border: '1px solid #1e3a8a',
                                boxShadow: '0 4px 14px rgba(0,31,63,0.3)',
                            }}
                        >
                            {loading ? <Bi e="Initializing Robust Pipeline..." c="正在初始化数据管道..." /> : <Bi e="Generate Distribution" c="生成发货分布" />}
                        </Button>
                    </div>

                    {result && !loading && (
                        <div style={{ marginTop: 32 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />
                            <SectionHeading emoji="📑"><Bi e="Executive Summary" c="执行摘要" /></SectionHeading>

                            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                <Col xs={24} md={8}>
                                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}><ShoppingCartOutlined/> <Bi e="Orders Found" c="找到订单" /></div>
                                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)' }}>{result.summary.orders_found.toLocaleString()}</div>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}><CheckCircleOutlined/> <Bi e="Valid SKUs (≥11)" c="有效 SKU (≥11)" /></div>
                                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)' }}>{result.summary.valid_skus.toLocaleString()}</div>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}><CodeSandboxOutlined/> <Bi e="Total Item Volume" c="总出货量" /></div>
                                        <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{result.summary.total_volume.toLocaleString()}</div>
                                    </div>
                                </Col>
                            </Row>

                            <SectionHeading emoji="🧮"><Bi e="Analysis Matrix (Preview)" c="分析矩阵（预览）" /></SectionHeading>
                            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 24 }}>
                                <Table 
                                    columns={topColumns} 
                                    dataSource={result.summary.top_rows} 
                                    pagination={false} 
                                    size="small" 
                                    rowKey={(record) => record.SKU}
                                    scroll={{ x: 'max-content' }}
                                />
                            </div>

                            <Button
                                size="large"
                                onClick={handleDownload}
                                icon={<FileExcelOutlined />}
                                style={{
                                    height: 54, borderRadius: 8, fontWeight: 700, fontSize: 15,
                                    background: '#001F3F', color: '#fff', border: '1px solid #1e3a8a',
                                    boxShadow: '0 4px 14px rgba(0,31,63,0.3)', width: '100%',
                                }}
                            >
                                <Bi e="Export Full Report" c="导出完整报告" />
                            </Button>
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    );
};

export default PreSalesEstimation;

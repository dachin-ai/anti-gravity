import React, { useState } from 'react';
import {
    Tabs, Card, Button, Input, InputNumber,
    Row, Col, Typography, Table, Upload,
    message, Spin, Divider, Tag
} from 'antd';
import {
    InboxOutlined, SyncOutlined, CloudDownloadOutlined,
    CheckCircleFilled, CloseCircleFilled, FileExcelOutlined,
    DatabaseOutlined
} from '@ant-design/icons';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Bi from '../components/Bi';

const { Title, Text } = Typography;
const { Dragger } = Upload;

/* ─── Reusable UI helpers ─── */
const Label = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {children}
    </div>
);

const SectionHeading = ({ emoji, children }) => (
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span>{emoji}</span> {children}
    </div>
);

/* ─── Card style helpers ─── */
const stepCardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
};

const statCardStyle = (accentColor) => ({
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderTop: `4px solid ${accentColor}`,
    borderRadius: 12,
    padding: '20px 16px',
    textAlign: 'center',
});

/* ─── Main Component ─── */
const PriceChecker = () => {
    const [method, setMethod] = useState('Listing');
    const [loadingDb, setLoadingDb] = useState(false);
    const [calcLoading, setCalcLoading] = useState(false);
    const { logActivity } = useAuth();

    // Direct Input
    const [skuInput, setSkuInput] = useState('');
    const [targetPrice, setTargetPrice] = useState(0);
    const [directResult, setDirectResult] = useState(null);

    // Batch
    const [fileList, setFileList] = useState([]);
    const [batchOverview, setBatchOverview] = useState(null);

    const fetchReferenceData = async () => {
        setLoadingDb(true);
        try {
            const res = await api.get('/price-checker/refresh');
            message.success(`Database loaded! ${res.data.records} SKU pricing records available.`);
        } catch (err) {
            message.error(err.response?.data?.detail || 'Failed to connect to database');
        } finally { setLoadingDb(false); }
    };

    const syncNeonData = async () => {
        setLoadingDb(true);
        try {
            const res = await api.post('/price-checker/sync-neon');
            message.success(res.data.message);
            fetchReferenceData(); // refresh the loaded cache
            logActivity('Price Checker (Sync DB)');
        } catch (error) {
            message.error(error.response?.data?.detail || 'Failed to sync Google Sheets to Database');
        } finally { setLoadingDb(false); }
    };

    const downloadTemplate = async (tplMethod) => {
        try {
            const res = await api.get(`/price-checker/template/${tplMethod}`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data]));
            Object.assign(document.createElement('a'), { href: url, download: `PC_${tplMethod}_Template.xlsx` }).click();
        } catch (err) { message.error(err.response?.data?.detail || 'Failed to download template'); }
    };

    const doCalculateDirect = async () => {
        if (!skuInput) { message.warning('Please enter a SKU first'); return; }
        setCalcLoading(true); setDirectResult(null);
        try {
            const res = await api.post('/price-checker/calculate-direct', { sku_string: skuInput, target_price: targetPrice });
            setDirectResult(res.data);
            logActivity('Price Checker (Direct)');
        } catch (err) { message.error(err.response?.data?.detail || 'Calculation failed');
        } finally { setCalcLoading(false); }
    };

    const handleUpload = async () => {
        if (!fileList.length) { message.warning('Please upload a file first'); return; }
        const formData = new FormData();
        formData.append('file', fileList[0]);
        formData.append('method', method);
        setCalcLoading(true); setBatchOverview(null);
        try {
            const res = await api.post('/price-checker/calculate-batch', formData);
            setBatchOverview(res.data);
            message.success('Batch calculation complete! See overview below.');
            logActivity('Price Checker (Batch)');
        } catch (err) { message.error(err.response?.data?.detail || 'Batch calculation failed');
        } finally { setCalcLoading(false); }
    };

    const handleDownloadResult = () => {
        if (!batchOverview?.file_base64) return;
        const bytes = atob(batchOverview.file_base64);
        const buf = new Uint8Array(bytes.length).map((_, i) => bytes.charCodeAt(i));
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `PC_${method}_Result.xlsx` }).click();
    };

    /* ─── Table Column Definitions ─── */
    const evalColumns = [
        { title: 'Price Tier',    dataIndex: 'Tier',        key: 'Tier',        width: 160, fixed: 'left' },
        { title: 'System Price',  dataIndex: 'SystemPrice', key: 'sys',         width: 130, render: v => (!isNaN(Number(v)) && v !== '' && v !== 'Invalid') ? Number(v).toLocaleString() : v },
        { title: 'Target Price',  dataIndex: 'TargetPrice', key: 'tgt',         width: 130, render: v => (!isNaN(Number(v)) && v !== '' && v !== 'Invalid') ? Number(v).toLocaleString() : v },
        {
            title: 'Gap (Margin)', dataIndex: 'Gap', key: 'gap', width: 130,
            render: v => {
                if (v === 'Invalid') return <Text style={{ color: 'var(--text-muted)' }}>–</Text>;
                const n = Number(v);
                return <Text style={{ fontWeight: 700, color: n >= 0 ? '#10b981' : '#ef4444' }}>{n >= 0 ? '+' : ''}{n.toLocaleString()}</Text>;
            }
        },
        {
            title: 'Status', dataIndex: 'Status', key: 'status', width: 110,
            render: v => (
                <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                    fontSize: 12, fontWeight: 600,
                    background: v.includes('Safe') ? 'rgba(16,185,129,0.15)' : v.includes('Under') ? 'rgba(239,68,68,0.15)' : 'var(--bg-panel)',
                    color:      v.includes('Safe') ? '#10b981' : v.includes('Under') ? '#ef4444' : 'var(--text-muted)',
                }}>
                    {v}
                </span>
            ),
        },
    ];

    const breakdownColumns = [
        { title: 'SKU',              dataIndex: 'SKU',                        key: 'SKU',   width: 150, fixed: 'left' },
        { title: 'Product Name',     dataIndex: 'Product Name',               key: 'pn',    width: 240, ellipsis: true },
        { title: 'Base Price',       dataIndex: 'Base Price (Warning)',        key: 'bp',    width: 130, render: v => (!isNaN(Number(v)) && v !== '' && v !== 'Invalid') ? Number(v).toLocaleString() : v },
        { title: 'Logic Applied',    dataIndex: 'Logic Applied',              key: 'la',    width: 180 },
        { title: 'Contribution (IDR)', dataIndex: 'Total Contribution (IDR)', key: 'con',   width: 160, render: v => (!isNaN(Number(v)) && v !== '' && v !== 'Invalid') ? Number(v).toLocaleString() : v },
    ];

    const previewColumns = batchOverview?.preview?.length
        ? Object.keys(batchOverview.preview[0]).map(k => ({
            title: k, dataIndex: k, key: k, width: 160, ellipsis: true,
            render: (v) => {
                if (k === 'Gap Warning') {
                    if (v === 'Invalid') return <Text style={{ color: '#ef4444', fontWeight: 600 }}>Invalid</Text>;
                    const n = Number(v);
                    if (!isNaN(n)) return <Text style={{ color: n >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{n >= 0 ? '+' : ''}{n.toLocaleString()}</Text>;
                }
                return v ?? '–';
            },
          }))
        : [];

    /* ─── RENDER ─── */
    return (
        <div>
            {/* PAGE HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: 'var(--text-main)', fontWeight: 800 }}>
                        <Bi e="Price Checker & Comparator" c="价格检查与比较器" />
                    </Title>
                    <Text style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        <Bi e="Supports Listing Method, SKU Method, and Direct Input" c="支持列表法、SKU法和直接输入法" />
                    </Text>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                        icon={<DatabaseOutlined />}
                        onClick={fetchReferenceData}
                        loading={loadingDb}
                        style={{
                            height: 40, borderRadius: 8, fontWeight: 600, fontSize: 13,
                        }}
                    >
                        <Bi e="Load Database" c="加载数据库" />
                    </Button>
                    <Button
                        icon={<DatabaseOutlined />}
                        onClick={syncNeonData}
                        loading={loadingDb}
                        style={{
                            height: 40, borderRadius: 8, fontWeight: 600, fontSize: 13,
                            background: 'var(--indigo)', color: '#fff', border: 'none',
                            boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                        }}
                    >
                        <Bi e="🔄 Sync Prices 🔄" c="🔄 同步价格 🔄" />
                    </Button>
                </div>
            </div>

            {/* TABS */}
            <Tabs
                activeKey={method}
                onChange={(key) => { setMethod(key); setFileList([]); setDirectResult(null); setBatchOverview(null); }}
                type="card"
                items={[
                    { key: 'Listing', label: <span style={{ fontWeight: 600 }}><Bi e="📋 Listing Method" c="📋 列表法" /></span> },
                    { key: 'SKU',     label: <span style={{ fontWeight: 600 }}><Bi e="📦 SKU Method" c="📦 SKU法" /></span> },
                    { key: 'Direct',  label: <span style={{ fontWeight: 600 }}><Bi e="⚡ Direct Input" c="⚡ 直接输入" /></span> },
                ]}
            />

            {/* ─── BATCH METHODS ─── */}
            {method !== 'Direct' && (
                <div>
                    <Row gutter={20}>
                        {/* Step 1: Download Template */}
                        <Col xs={24} md={12}>
                            <div style={stepCardStyle}>
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
                                    <SectionHeading emoji="1️⃣"><Bi e="Download Template" c="下载模板" /></SectionHeading>
                                </div>
                                <div style={{ padding: '18px 20px' }}>
                                    <Text style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }}>
                                        <Bi e="Download the Excel template, fill in your data, then upload it in the next step." c="下载 Excel 模板，填写数据，然后在下一步中上传。" />
                                    </Text>
                                    <Button
                                        icon={<CloudDownloadOutlined />}
                                        block
                                        onClick={() => downloadTemplate(method)}
                                        style={{
                                            height: 44, borderRadius: 8, fontWeight: 600, fontSize: 13,
                                            background: 'var(--bg-panel)', color: 'var(--indigo)',
                                            border: '1.5px dashed var(--indigo)',
                                        }}
                                    >
                                        Download {method} Template
                                    </Button>
                                </div>
                            </div>
                        </Col>

                        {/* Step 2: Upload & Process */}
                        <Col xs={24} md={12}>
                            <div style={stepCardStyle}>
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
                                    <SectionHeading emoji="2️⃣"><Bi e="Upload & Process" c="上传并处理" /></SectionHeading>
                                </div>
                                <div style={{ padding: '18px 20px' }}>
                                    <Dragger
                                        maxCount={1}
                                        beforeUpload={(file) => { setFileList([file]); return false; }}
                                        onRemove={() => setFileList([])}
                                        fileList={fileList}
                                        style={{ borderRadius: 8, marginBottom: 14 }}
                                        itemRender={(_, file, __, { remove }) => (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: 6,
                                                padding: '8px 12px', marginTop: 8,
                                            }}>
                                                <Text style={{ color: '#10b981', fontSize: 13, fontWeight: 500 }}>
                                                    📄 {file.name}
                                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                            {file.size ? '(' + (file.size / 1024 / 1024 > 1 ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : (file.size / 1024).toFixed(2) + ' KB') + ')' : ''}
                                        </span>
                                                </Text>
                                                <Button
                                                    type="text" size="small" danger
                                                    onClick={remove}
                                                    style={{ fontSize: 12, color: '#ef4444', padding: '0 4px' }}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        )}
                                    >
                                        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                        <p className="ant-upload-text"><Bi e="Click or drag an Excel file here to upload" c="点击或拖拽 Excel 文件到此处上传" /></p>
                                    </Dragger>
                                    <Button
                                        block
                                        loading={calcLoading}
                                        onClick={handleUpload}
                                        style={{
                                            height: 44, borderRadius: 8, fontWeight: 700, fontSize: 14,
                                            background: 'var(--indigo)', color: '#fff', border: 'none',
                                            boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                                        }}
                                    >
                                        {calcLoading ? <Bi e="Processing..." c="处理中..." /> : <Bi e="Start Batch Calculation" c="开始批量计算" />}
                                    </Button>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    {/* ─── BATCH OVERVIEW ─── */}
                    {batchOverview && (
                        <div style={{ marginTop: 32 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />
                            <SectionHeading emoji="📑"><Bi e="Processing Overview" c="处理概览" /></SectionHeading>

                            {/* Stats */}
                            <Row gutter={16} style={{ marginBottom: 24 }}>
                                <Col xs={24} md={8}>
                                    <div style={statCardStyle('var(--indigo)')}>
                                        <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--indigo)', fontFamily: "'Outfit', sans-serif" }}>
                                            {batchOverview.summary.total}
                                        </div>
                                        <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}><Bi e="Total Rows Processed" c="处理的总行数" /></Text>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={statCardStyle('#10b981')}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            <CheckCircleFilled style={{ color: '#10b981', fontSize: 20 }} />
                                            <span style={{ fontSize: 40, fontWeight: 800, color: '#10b981', fontFamily: "'Outfit', sans-serif" }}>
                                                {batchOverview.summary.valid}
                                            </span>
                                        </div>
                                        <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}><Bi e="Valid Items" c="有效项目" /></Text>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={statCardStyle('#ef4444')}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            <CloseCircleFilled style={{ color: '#ef4444', fontSize: 20 }} />
                                            <span style={{ fontSize: 40, fontWeight: 800, color: '#ef4444', fontFamily: "'Outfit', sans-serif" }}>
                                                {batchOverview.summary.invalid}
                                            </span>
                                        </div>
                                        <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}><Bi e="Invalid / Flagged Items" c="无效 / 标记项目" /></Text>
                                    </div>
                                </Col>
                            </Row>

                            {/* Preview Table (scrollable) */}
                            <div style={{ marginBottom: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <Bi e="Data Preview — Top 10 Rows" c="数据预览 — 前 10 行" />
                                </Text>
                            </div>
                            <div style={{ marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <Table
                                    dataSource={batchOverview.preview}
                                    columns={previewColumns}
                                    pagination={false}
                                    size="small"
                                    rowKey={(_, i) => i}
                                    scroll={{ x: 'max-content' }}
                                />
                            </div>

                            {/* Download */}
                            <Button
                                size="large"
                                icon={<FileExcelOutlined />}
                                onClick={handleDownloadResult}
                                style={{
                                    height: 46, borderRadius: 8, fontWeight: 700, fontSize: 14,
                                    background: '#10b981', color: '#fff', border: 'none',
                                    boxShadow: '0 2px 10px rgba(16,185,129,0.3)', paddingInline: 28,
                                }}
                            >
                                <Bi e="Download Full Result (Excel)" c="下载完整结果 (Excel)" />
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ─── DIRECT INPUT ─── */}
            {method === 'Direct' && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px' }}>
                    <Row gutter={[20, 20]}>
                        <Col xs={24} md={16}>
                            <Label><Bi e="Bundle SKU — separate with + or comma" c="捆绑 SKU — 用 + 或逗号分隔" /></Label>
                            <Input
                                size="large"
                                placeholder="e.g. SKU_A + SKU_B + SKU_C"
                                value={skuInput}
                                onChange={e => setSkuInput(e.target.value)}
                                onPressEnter={doCalculateDirect}
                                style={{ borderRadius: 8, height: 46 }}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <Label><Bi e="Target Price (IDR)" c="目标价格 (IDR)" /></Label>
                            <InputNumber
                                size="large"
                                style={{ width: '100%', borderRadius: 8, height: 46 }}
                                min={0}
                                step={1000}
                                value={targetPrice}
                                onChange={setTargetPrice}
                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                parser={v => v.replace(/\./g, '')}
                            />
                        </Col>
                    </Row>

                    <Button
                        size="large"
                        loading={calcLoading}
                        onClick={doCalculateDirect}
                        style={{
                            marginTop: 16, height: 46, borderRadius: 8, fontWeight: 700, fontSize: 14,
                            background: 'var(--indigo)', color: '#fff', border: 'none',
                            boxShadow: '0 2px 8px rgba(99,102,241,0.25)', paddingInline: 32,
                        }}
                    >
                        <Bi e="Calculate Real-time" c="实时计算" />
                    </Button>

                    {calcLoading && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>Calculating prices...</div>
                        </div>
                    )}

                    {directResult && !calcLoading && (
                        <div style={{ marginTop: 28 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />

                            {/* Summary */}
                            <SectionHeading emoji="📊"><Bi e="Bundle Summary" c="捆绑摘要" /></SectionHeading>
                            <Row gutter={16} style={{ marginBottom: 24 }}>
                                {[
                                    { label: 'Bundle Discount', value: `${Number(directResult.summary.bundle_discount) * 100}%`, color: 'var(--indigo)' },
                                    { label: 'Clearance Status', value: directResult.summary.clearance, color: '#f59e0b' },
                                    { label: 'Gift Status',      value: directResult.summary.gift,      color: '#10b981' },
                                ].map(({ label, value, color }) => (
                                    <Col key={label} xs={24} md={8}>
                                        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            {/* Breakdown Table */}
                            <SectionHeading emoji="🧩"><Bi e="Price Composition Breakdown" c="价格构成明细" /></SectionHeading>
                            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 24 }}>
                                <Table
                                    dataSource={directResult.breakdown}
                                    columns={breakdownColumns}
                                    pagination={false}
                                    size="middle"
                                    rowKey="SKU"
                                    scroll={{ x: 'max-content' }}
                                />
                            </div>

                            {/* Evaluation Table */}
                            <SectionHeading emoji="📈"><Bi e="Price Evaluation by Tier" c="按层级进行价格评估" /></SectionHeading>
                            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <Table
                                    dataSource={directResult.evaluation}
                                    columns={evalColumns}
                                    pagination={false}
                                    size="middle"
                                    rowKey="Tier"
                                    scroll={{ x: 'max-content' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PriceChecker;

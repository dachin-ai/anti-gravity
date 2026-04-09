import React, { useState } from 'react';
import {
    Tabs, Card, Button, Input, InputNumber,
    Row, Col, Typography, Table, Upload,
    message, Spin, Divider
} from 'antd';
import {
    InboxOutlined, SyncOutlined, CloudDownloadOutlined,
    CheckCircleFilled, CloseCircleFilled, FileExcelOutlined,
    DatabaseOutlined
} from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Dragger } = Upload;

/* ─ tiny inline helpers ─ */
const Label = ({ children }) => (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {children}
    </div>
);

const SectionHeading = ({ emoji, children }) => (
    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate)', fontFamily: "'Outfit', sans-serif", display:'flex', alignItems:'center', gap:8, marginBottom: 16 }}>
        <span>{emoji}</span> {children}
    </div>
);

const PriceChecker = () => {
    const [method, setMethod] = useState("Listing");
    const [loadingDb, setLoadingDb] = useState(false);
    const [calcLoading, setCalcLoading] = useState(false);

    const [skuInput, setSkuInput] = useState('');
    const [targetPrice, setTargetPrice] = useState(0);
    const [directResult, setDirectResult] = useState(null);

    const [fileList, setFileList] = useState([]);
    const [batchOverview, setBatchOverview] = useState(null);

    /* ── API calls ── */
    const fetchReferenceData = async () => {
        setLoadingDb(true);
        try {
            const res = await api.get('/price-checker/refresh');
            message.success(`Sheet terhubung! ${res.data.records} SKU dimuat.`);
        } catch {
            message.error('Gagal mengambil data dari Google Sheets');
        } finally { setLoadingDb(false); }
    };

    const downloadTemplate = async (tplMethod) => {
        try {
            const response = await api.get(`/price-checker/template/${tplMethod}`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([response.data]));
            Object.assign(document.createElement('a'), { href: url, download: `PC_${tplMethod}_Template.xlsx` }).click();
        } catch { message.error('Gagal download template'); }
    };

    const doCalculateDirect = async () => {
        if (!skuInput) { message.warning("Masukkan SKU terlebih dahulu"); return; }
        setCalcLoading(true); setDirectResult(null);
        try {
            const res = await api.post('/price-checker/calculate-direct', { sku_string: skuInput, target_price: targetPrice });
            setDirectResult(res.data);
        } catch { message.error('Kalkulasi gagal');
        } finally { setCalcLoading(false); }
    };

    const handleUpload = async () => {
        if (!fileList.length) { message.warning("Upload file terlebih dahulu"); return; }
        const formData = new FormData();
        formData.append('file', fileList[0]);
        formData.append('method', method);
        setCalcLoading(true); setBatchOverview(null);
        try {
            const res = await api.post('/price-checker/calculate-batch', formData);
            setBatchOverview(res.data);
            message.success("Kalkulasi selesai! Cek overview di bawah.");
        } catch { message.error('Kalkulasi batch gagal');
        } finally { setCalcLoading(false); }
    };

    const handleDownloadResult = () => {
        if (!batchOverview?.file_base64) return;
        const bytes = atob(batchOverview.file_base64);
        const buf = new Uint8Array(bytes.length).map((_, i) => bytes.charCodeAt(i));
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `PC_${method}_Result.xlsx` }).click();
    };

    /* ── Column definitions ── */
    const evalCols = [
        { title: 'Price Tier', dataIndex: 'Tier', key: 'Tier', width: 160 },
        { title: 'System Price', dataIndex: 'SystemPrice', key: 'sys', render: v => v?.toLocaleString?.() ?? v },
        { title: 'Target Price', dataIndex: 'TargetPrice', key: 'tgt', render: v => v?.toLocaleString?.() ?? v },
        {
            title: 'Gap (Margin)', dataIndex: 'Gap', key: 'gap',
            render: v => {
                if (v === 'Invalid') return <Text style={{ color: '#94a3b8' }}>Invalid</Text>;
                const n = Number(v);
                return <Text style={{ fontWeight: 600, color: n >= 0 ? '#059669' : '#dc2626' }}>{n >= 0 ? '+' : ''}{n.toLocaleString()}</Text>;
            }
        },
        {
            title: 'Status', dataIndex: 'Status', key: 'status',
            render: v => (
                <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: v.includes('Safe') ? '#d1fae5' : v.includes('Under') ? '#fee2e2' : '#f1f5f9',
                    color: v.includes('Safe') ? '#059669' : v.includes('Under') ? '#dc2626' : '#64748b'
                }}>{v}</span>
            )
        },
    ];

    const breakCols = [
        { title: 'SKU', dataIndex: 'SKU', key: 'SKU', width: 140 },
        { title: 'Product Name', dataIndex: 'Product Name', key: 'pn', ellipsis: true },
        { title: 'Base Price', dataIndex: 'Base Price (Warning)', key: 'bp', render: v => Number(v)?.toLocaleString?.() ?? v },
        { title: 'Logic', dataIndex: 'Logic Applied', key: 'la' },
        { title: 'Contribution (IDR)', dataIndex: 'Total Contribution (IDR)', key: 'con', render: v => Number(v)?.toLocaleString?.() ?? v },
    ];

    const previewCols = batchOverview?.preview?.length
        ? Object.keys(batchOverview.preview[0]).map(k => ({
            title: k, dataIndex: k, key: k, ellipsis: true,
            render: (v) => {
                if (k === 'Gap Warning') {
                    if (v === 'Invalid') return <Text style={{ color: '#dc2626', fontWeight: 600 }}>Invalid</Text>;
                    const n = Number(v);
                    if (!isNaN(n)) return <Text style={{ color: n >= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>{n >= 0 ? '+' : ''}{n.toLocaleString()}</Text>;
                }
                return v;
            }
          }))
        : [];

    /* ── Reusable card styles ── */
    const stepCard = {
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--white)',
        boxShadow: 'none',
    };

    const statCard = (borderColor) => ({
        border: '1px solid var(--border)',
        borderTop: `4px solid ${borderColor}`,
        borderRadius: 12,
        background: 'var(--white)',
        textAlign: 'center',
        padding: '20px 16px',
    });

    /* ── RENDER ── */
    return (
        <div>
            {/* PAGE HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: 'var(--slate)', fontWeight: 800 }}>
                        Price Checker &amp; Comparator
                    </Title>
                    <Text style={{ color: 'var(--slate-light)', fontSize: 14 }}>
                        Supports Listing Method, SKU Method, and Direct Input
                    </Text>
                </div>
                <Button
                    icon={<DatabaseOutlined />}
                    onClick={fetchReferenceData}
                    loading={loadingDb}
                    style={{
                        height: 40, borderRadius: 8, fontWeight: 600,
                        background: 'var(--indigo)', color: '#fff', border: 'none',
                        boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                    }}
                >
                    Refresh Data Sheet
                </Button>
            </div>

            {/* TABS */}
            <Tabs
                activeKey={method}
                onChange={(key) => { setMethod(key); setFileList([]); setDirectResult(null); setBatchOverview(null); }}
                type="card"
                items={[
                    { key: 'Listing', label: <span style={{ fontWeight: 600 }}>📋 Listing Method</span> },
                    { key: 'SKU',     label: <span style={{ fontWeight: 600 }}>📦 SKU Method</span> },
                    { key: 'Direct',  label: <span style={{ fontWeight: 600 }}>⚡ Direct Input</span> },
                ]}
            />

            {/* BATCH METHODS */}
            {method !== 'Direct' && (
                <div>
                    <Row gutter={20}>
                        {/* Step 1 */}
                        <Col xs={24} md={12}>
                            <div style={stepCard} className="step-card">
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                    <SectionHeading emoji="1️⃣">Download Template</SectionHeading>
                                </div>
                                <div style={{ padding: '16px 20px' }}>
                                    <p style={{ fontSize: 13, color: 'var(--slate-light)', marginBottom: 16 }}>
                                        Unduh template Excel ini, isi data kamu, lalu upload di kolom sebelah kanan.
                                    </p>
                                    <Button
                                        icon={<CloudDownloadOutlined />}
                                        block
                                        onClick={() => downloadTemplate(method)}
                                        style={{
                                            height: 44, borderRadius: 8, fontWeight: 600,
                                            background: 'var(--indigo-light)', color: 'var(--indigo)',
                                            border: '1.5px dashed var(--indigo)'
                                        }}
                                    >
                                        Download {method} Template
                                    </Button>
                                </div>
                            </div>
                        </Col>

                        {/* Step 2 */}
                        <Col xs={24} md={12}>
                            <div style={stepCard}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                                    <SectionHeading emoji="2️⃣">Upload &amp; Process</SectionHeading>
                                </div>
                                <div style={{ padding: '16px 20px' }}>
                                    <Dragger
                                        maxCount={1}
                                        beforeUpload={(file) => { setFileList([file]); return false; }}
                                        onRemove={() => setFileList([])}
                                        fileList={fileList}
                                        style={{ borderRadius: 8, marginBottom: 14 }}
                                    >
                                        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                        <p className="ant-upload-text">Klik atau drag file Excel ke sini</p>
                                    </Dragger>
                                    <Button
                                        block
                                        loading={calcLoading}
                                        onClick={handleUpload}
                                        style={{
                                            height: 44, borderRadius: 8, fontWeight: 700, fontSize: 14,
                                            background: 'var(--indigo)', color: '#fff', border: 'none',
                                            boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                                        }}
                                    >
                                        {calcLoading ? 'Memproses...' : 'Mulai Kalkulasi Batch'}
                                    </Button>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    {/* BATCH OVERVIEW */}
                    {batchOverview && (
                        <div style={{ marginTop: 32 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />
                            <SectionHeading emoji="📑">Processing Overview</SectionHeading>

                            {/* Stats */}
                            <Row gutter={16} style={{ marginBottom: 24 }}>
                                <Col xs={24} md={8}>
                                    <div style={statCard('var(--indigo)')}>
                                        <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--indigo)', fontFamily: "'Outfit', sans-serif" }}>
                                            {batchOverview.summary.total}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-light)', marginTop: 4 }}>Total Baris Dicek</div>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={statCard('#059669')}>
                                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                                            <CheckCircleFilled style={{ color: '#059669', fontSize: 22 }}/>
                                            <span style={{ fontSize: 36, fontWeight: 800, color: '#059669', fontFamily: "'Outfit', sans-serif" }}>
                                                {batchOverview.summary.valid}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-light)', marginTop: 4 }}>Valid (Aman)</div>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={statCard('#dc2626')}>
                                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                                            <CloseCircleFilled style={{ color: '#dc2626', fontSize: 22 }}/>
                                            <span style={{ fontSize: 36, fontWeight: 800, color: '#dc2626', fontFamily: "'Outfit', sans-serif" }}>
                                                {batchOverview.summary.invalid}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-light)', marginTop: 4 }}>Invalid / Bermasalah</div>
                                    </div>
                                </Col>
                            </Row>

                            {/* Preview Table */}
                            <div style={{ marginBottom: 8 }}>
                                <Text style={{ fontSize: 13, color: 'var(--slate-light)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                                    Preview Data (Top 10)
                                </Text>
                            </div>
                            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20 }}>
                                <Table
                                    dataSource={batchOverview.preview}
                                    columns={previewCols}
                                    pagination={false}
                                    size="small"
                                    rowKey={(_, i) => i}
                                />
                            </div>

                            {/* Download Button */}
                            <Button
                                size="large"
                                icon={<FileExcelOutlined />}
                                onClick={handleDownloadResult}
                                style={{
                                    height: 48, borderRadius: 8, fontWeight: 700, fontSize: 15,
                                    background: '#059669', color: '#fff', border: 'none',
                                    boxShadow: '0 2px 10px rgba(5,150,105,0.3)', paddingInline: 28,
                                }}
                            >
                                Download Full Result (Excel)
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* DIRECT INPUT */}
            {method === 'Direct' && (
                <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px' }}>
                    <Row gutter={[20, 20]}>
                        <Col xs={24} md={16}>
                            <Label>Bundle SKU (pisahkan dengan + atau ,)</Label>
                            <Input
                                size="large"
                                placeholder="Contoh: SKU_A + SKU_B + SKU_C"
                                value={skuInput}
                                onChange={e => setSkuInput(e.target.value)}
                                onPressEnter={doCalculateDirect}
                                style={{ borderRadius: 8, height: 46 }}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <Label>Target Harga (IDR)</Label>
                            <InputNumber
                                size="large"
                                style={{ width: '100%', borderRadius: 8, height: 46 }}
                                min={0} step={1000}
                                value={targetPrice}
                                onChange={setTargetPrice}
                                formatter={v => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                parser={v => v.replace(/Rp\s?|[.]/g, '')}
                            />
                        </Col>
                    </Row>

                    <Button
                        size="large"
                        loading={calcLoading}
                        onClick={doCalculateDirect}
                        style={{
                            marginTop: 16, height: 46, borderRadius: 8, fontWeight: 700, fontSize: 15,
                            background: 'var(--indigo)', color: '#fff', border: 'none',
                            boxShadow: '0 2px 8px rgba(79,70,229,0.3)', paddingInline: 32,
                        }}
                    >
                        Hitung Real-time
                    </Button>

                    {calcLoading && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <Spin size="large" />
                            <div style={{ marginTop: 12, color: 'var(--slate-light)', fontSize: 13 }}>Menghitung harga...</div>
                        </div>
                    )}

                    {directResult && !calcLoading && (
                        <div style={{ marginTop: 28 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />
                            <SectionHeading emoji="📊">Bundle Summary</SectionHeading>

                            <Row gutter={16} style={{ marginBottom: 24 }}>
                                {[
                                    { label: 'Bundle Discount', value: `${Number(directResult.summary.bundle_discount) * 100}%`, color: 'var(--indigo)' },
                                    { label: 'Clearance Status', value: directResult.summary.clearance, color: '#b45309' },
                                    { label: 'Gift Status', value: directResult.summary.gift, color: '#059669' },
                                ].map(({ label, value, color }) => (
                                    <Col key={label} xs={24} md={8}>
                                        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-light)', marginTop: 4 }}>{label}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            <SectionHeading emoji="🧩">Price Breakdown</SectionHeading>
                            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 24 }}>
                                <Table dataSource={directResult.breakdown} columns={breakCols} pagination={false} size="middle" rowKey="SKU" />
                            </div>

                            <SectionHeading emoji="📈">Price Evaluation Table</SectionHeading>
                            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                                <Table dataSource={directResult.evaluation} columns={evalCols} pagination={false} size="middle" rowKey="Tier" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PriceChecker;

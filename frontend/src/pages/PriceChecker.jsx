import React, { useEffect, useState } from 'react';
import {
    Tabs, Card, Button, Input, InputNumber,
    Row, Col, Typography, Table, Upload,
    message, Spin, Divider, Tag
} from 'antd';
import {
    InboxOutlined, SyncOutlined, CloudDownloadOutlined,
    CheckCircleFilled, CloseCircleFilled, FileExcelOutlined,
    DatabaseOutlined, DownloadOutlined, UploadOutlined,
    FileTextOutlined, BarChartOutlined, AppstoreOutlined, RiseOutlined,
    UnorderedListOutlined, BarcodeOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Bi from '../components/Bi';
import PageHeader from '../components/PageHeader';

const { Title, Text } = Typography;
const { Dragger } = Upload;

/* ─── Reusable UI helpers ─── */
const Label = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {children}
    </div>
);

const SectionHeading = ({ icon, children, color = '#6366f1' }) => (
    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 28, height: 28, borderRadius: 6, background: `${color}20`, border: `1px solid ${color}35`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: 14, flexShrink: 0 }}>{icon}</span>
        {children}
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
    const [targetPrice, setTargetPrice] = useState(null);
    const [targetStock, setTargetStock] = useState(null);
    const [directResult, setDirectResult] = useState(null);

    // Batch
    const [fileList, setFileList] = useState([]);
    const [batchOverview, setBatchOverview] = useState(null);
    const [lastStockUploadAt, setLastStockUploadAt] = useState(null);
    const [downloadingWithPicture, setDownloadingWithPicture] = useState(false);

    const formatWibDateTime = (isoString) => {
        if (!isoString) return '-';
        try {
            const dt = new Date(isoString);
            if (Number.isNaN(dt.getTime())) return '-';
            const formatted = new Intl.DateTimeFormat('id-ID', {
                timeZone: 'Asia/Jakarta',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }).format(dt);
            return `${formatted} Jakarta Time`;
        } catch {
            return '-';
        }
    };

    const fetchStockUploadStatus = async () => {
        try {
            const res = await api.get('/price-checker/upload-stock-data/status');
            setLastStockUploadAt(res.data?.last_uploaded_at || null);
        } catch {
            setLastStockUploadAt(null);
        }
    };

    useEffect(() => {
        fetchStockUploadStatus();
    }, []);

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
            const res = await api.post('/price-checker/sync');
            message.success(res.data.message);
            fetchReferenceData(); // refresh the loaded cache
            logActivity('Price Checker (Sync DB)');
        } catch (error) {
            message.error(error.response?.data?.detail || 'Failed to sync Google Sheets to Database');
        } finally { setLoadingDb(false); }
    };

    const uploadStockData = async ({ file, onSuccess, onError }) => {
        setLoadingDb(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/price-checker/upload-stock-data', formData);
            message.success(res.data.message || 'Stock data uploaded.');
            setLastStockUploadAt(res.data?.last_uploaded_at || null);
            onSuccess?.(res.data);
            logActivity('Price Checker (Upload Stock Data)');
        } catch (error) {
            const msg = error.response?.data?.detail || 'Failed to upload stock data';
            message.error(msg);
            onError?.(new Error(msg));
        } finally {
            setLoadingDb(false);
        }
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
            const res = await api.post('/price-checker/calculate-direct', {
                sku_string: skuInput,
                target_price: Number(targetPrice || 0),
                target_stock: Number(targetStock || 0),
            });
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

    const handleDownloadWithPicture = async () => {
        if (!fileList.length) {
            message.warning('Please upload a file first');
            return;
        }
        setDownloadingWithPicture(true);
        try {
            const formData = new FormData();
            formData.append('file', fileList[0]);
            formData.append('method', method);
            formData.append('include_pictures', 'true');
            const res = await api.post('/price-checker/calculate-batch', formData);
            if (!res.data?.file_base64) {
                throw new Error('No file generated');
            }
            const bytes = atob(res.data.file_base64);
            const buf = new Uint8Array(bytes.length).map((_, i) => bytes.charCodeAt(i));
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `PC_${method}_Result_With_Picture.xlsx` }).click();
            message.success('Download with picture is ready.');
        } catch (err) {
            message.error(err.response?.data?.detail || err.message || 'Failed to generate file with pictures');
        } finally {
            setDownloadingWithPicture(false);
        }
    };

    /* ─── Table Column Definitions ─── */
    const copyableCellProps = (value) => ({
        style: { userSelect: 'text', cursor: 'copy' },
        onClick: () => {
            const v = value === null || value === undefined ? '' : String(value);
            navigator.clipboard.writeText(v).then(() => message.success(`Copied: ${v}`, 1));
        },
    });

    const isImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        return /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url) || url.includes('cdn') || url.includes('imgur.com');
    };

    const copyTable = (data, columns) => {
        const headers = columns.map(c => c.title).join('\t');
        const rows = data.map(row =>
            columns.map(c => {
                const v = row[c.dataIndex];
                return (v === null || v === undefined) ? '' : v;
            }).join('\t')
        ).join('\n');
        navigator.clipboard.writeText(headers + '\n' + rows)
            .then(() => message.success('Table copied! Paste into Excel.'))
            .catch(() => message.error('Copy failed.'));
    };

    const evalColumns = [
        { title: 'Price Tier',    dataIndex: 'Tier',        key: 'Tier',  width: 160, fixed: 'left', onCell: r => copyableCellProps(r.Tier) },
        { title: 'System Price', dataIndex: 'SystemPrice', key: 'sys',   width: 130, onCell: r => copyableCellProps(r.SystemPrice), render: v => (!isNaN(Number(v)) && v !== '' && v !== 'Invalid') ? Number(v).toLocaleString() : v },
        { title: 'Target Price', dataIndex: 'TargetPrice', key: 'tgt',   width: 130, onCell: r => copyableCellProps(r.TargetPrice), render: v => (!isNaN(Number(v)) && v !== '' && v !== 'Invalid') ? Number(v).toLocaleString() : v },
        { title: 'Gap (Margin)', dataIndex: 'Gap',         key: 'gap',   width: 130, onCell: r => copyableCellProps(r.Gap),
            render: v => {
                if (v === 'Invalid') return <span style={{ color: 'var(--text-muted)' }}>–</span>;
                const n = Number(v);
                return <span style={{ fontWeight: 700, color: n >= 0 ? '#10b981' : '#ef4444' }}>{n >= 0 ? '+' : ''}{n.toLocaleString()}</span>;
            }
        },
        { title: 'Status', dataIndex: 'Status', key: 'status', width: 110, onCell: r => copyableCellProps(r.Status),
            render: v => (
                <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                    fontSize: 12, fontWeight: 600,
                    background: v.includes('Safe') ? 'rgba(16,185,129,0.15)' : v.includes('Under') ? 'rgba(239,68,68,0.15)' : 'var(--bg-panel)',
                    color: v.includes('Safe') ? '#10b981' : v.includes('Under') ? '#ef4444' : 'var(--text-muted)',
                }}>{v}</span>
            ),
        },
    ];

    const breakdownColumns = [
        { title: 'SKU',               dataIndex: 'SKU',                     key: 'SKU',  width: 150, fixed: 'left', onCell: r => copyableCellProps(r['SKU']) },
        { title: 'Product Name',      dataIndex: 'Product Name',            key: 'pn',   width: 240, onCell: r => copyableCellProps(r['Product Name']) },
        { title: 'Base Price',        dataIndex: 'Base Price (Warning)',     key: 'bp',   width: 130, onCell: r => copyableCellProps(r['Base Price (Warning)']), render: v => (!isNaN(Number(v)) && v !== '' && v !== 'Invalid') ? Number(v).toLocaleString() : v },
        { title: 'Logic Applied',     dataIndex: 'Logic Applied',           key: 'la',   width: 180, onCell: r => copyableCellProps(r['Logic Applied']) },
        { title: 'Contribution (IDR)',dataIndex: 'Total Contribution (IDR)', key: 'con',  width: 160, onCell: r => copyableCellProps(r['Total Contribution (IDR)']), render: v => (!isNaN(Number(v)) && v !== '' && v !== 'Invalid') ? Number(v).toLocaleString() : v },
        { title: 'IDR-Ready',         dataIndex: 'IDR-Ready',               key: 'idr_r', width: 120, onCell: r => copyableCellProps(r['IDR-Ready']), render: v => Number(v || 0).toLocaleString() },
        { title: 'SBY-Ready',         dataIndex: 'SBY-Ready',               key: 'sby_r', width: 120, onCell: r => copyableCellProps(r['SBY-Ready']), render: v => Number(v || 0).toLocaleString() },
        { title: 'IDR-Lock',          dataIndex: 'IDR-Lock',                key: 'idr_l', width: 120, onCell: r => copyableCellProps(r['IDR-Lock']), render: v => Number(v || 0).toLocaleString() },
        { title: 'SBY-Lock',          dataIndex: 'SBY-Lock',                key: 'sby_l', width: 120, onCell: r => copyableCellProps(r['SBY-Lock']), render: v => Number(v || 0).toLocaleString() },
        { title: 'IDR-OTW',           dataIndex: 'IDR-OTW',                 key: 'idr_o', width: 120, onCell: r => copyableCellProps(r['IDR-OTW']), render: v => Number(v || 0).toLocaleString() },
        { title: 'SBY-OTW',           dataIndex: 'SBY-OTW',                 key: 'sby_o', width: 120, onCell: r => copyableCellProps(r['SBY-OTW']), render: v => Number(v || 0).toLocaleString() },
    ];

    const stockEvalColumns = [
        { title: 'Stock Type', dataIndex: 'StockType', key: 'StockType', width: 160 },
        { title: 'Current Stock', dataIndex: 'CurrentStock', key: 'CurrentStock', width: 130, render: v => Number(v || 0).toLocaleString() },
        { title: 'Target Stock', dataIndex: 'TargetStock', key: 'TargetStock', width: 130, render: v => Number(v || 0).toLocaleString() },
        {
            title: 'Gap',
            dataIndex: 'Gap',
            key: 'Gap',
            width: 130,
            render: v => {
                const n = Number(v || 0);
                return <span style={{ fontWeight: 700, color: n >= 0 ? '#10b981' : '#ef4444' }}>{n.toLocaleString()}</span>;
            },
        },
        {
            title: 'Status',
            dataIndex: 'Status',
            key: 'Status',
            width: 110,
            render: (v, row) => (
                (() => {
                    const gap = Number(row?.Gap);
                    const isNoStockLeft = Number.isFinite(gap) && gap === 0;
                    const isSafe = Number.isFinite(gap) ? gap > 0 : String(v || '').includes('Safe');
                    const label = isNoStockLeft ? '⚠️ No Stock Left' : (isSafe ? '✅ Safe' : '❌ Need Restock');
                    const bg = isSafe
                        ? 'rgba(16,185,129,0.15)'
                        : isNoStockLeft
                            ? 'rgba(250,173,20,0.18)'
                            : 'rgba(239,68,68,0.15)';
                    const fg = isSafe
                        ? '#10b981'
                        : isNoStockLeft
                            ? '#faad14'
                            : '#ef4444';
                    return (
                <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: bg,
                    color: fg,
                }}>{label}</span>
                    );
                })()
            ),
        },
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
            <PageHeader
                title={<Bi e="Price Checker & Comparator" c="价格检查与比较器" />}
                subtitle={<Bi e="Supports Listing Method, SKU Method, and Direct Input" c="支持列表法、SKU法和直接输入法" />}
                accent="#6366f1"
                actions={
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Upload
                                accept=".xlsx,.xls"
                                showUploadList={false}
                                customRequest={uploadStockData}
                            >
                                <Button
                                    icon={<UploadOutlined />}
                                    loading={loadingDb}
                                    style={{ height: 36, borderRadius: 8, fontWeight: 600, fontSize: 13 }}
                                >
                                    <Bi e="Upload Stock Data" c="上传库存数据" />
                                </Button>
                            </Upload>
                            <Button
                                icon={<DatabaseOutlined />}
                                onClick={syncNeonData}
                                loading={loadingDb}
                                style={{
                                    height: 36, borderRadius: 8, fontWeight: 600, fontSize: 13,
                                    background: 'var(--indigo)', color: '#fff', border: 'none',
                                    boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                                }}
                            >
                                <Bi e="Sync Price Data" c="同步价格数据" />
                            </Button>
                        </div>
                        <Text style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            <Bi
                                e={`Last stock upload: ${formatWibDateTime(lastStockUploadAt)}`}
                                c={`最后库存上传: ${formatWibDateTime(lastStockUploadAt)}`}
                            />
                        </Text>
                    </div>
                }
            />

            {/* TABS */}
            <Tabs
                activeKey={method}
                onChange={(key) => { setMethod(key); setFileList([]); setDirectResult(null); setBatchOverview(null); }}
                type="card"
                className="tabs-nav-only"
                items={[
                    { key: 'Listing', label: <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><UnorderedListOutlined /><Bi e="Listing Method" c="列表法" /></span> },
                    { key: 'SKU',     label: <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><BarcodeOutlined /><Bi e="SKU Method" c="SKU法" /></span> },
                    { key: 'Direct',  label: <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><ThunderboltOutlined /><Bi e="Direct Input" c="直接输入" /></span> },
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
                                    <SectionHeading icon={<DownloadOutlined />}><Bi e="Download Template" c="下载模板" /></SectionHeading>
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
                                    <SectionHeading icon={<UploadOutlined />}><Bi e="Upload & Process" c="上传并处理" /></SectionHeading>
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
                                                    <SyncOutlined style={{ color: '#10b981', marginRight: 6 }} />{file.name}
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
                            <SectionHeading icon={<FileTextOutlined />}><Bi e="Processing Overview" c="处理概览" /></SectionHeading>

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
                                    className="price-checker-center-table"
                                />
                            </div>

                            {/* Download */}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                                <Button
                                    size="large"
                                    icon={<FileExcelOutlined />}
                                    loading={downloadingWithPicture}
                                    onClick={handleDownloadWithPicture}
                                    style={{
                                        height: 46, borderRadius: 8, fontWeight: 700, fontSize: 14,
                                        background: '#f59e0b', color: '#fff', border: 'none',
                                        boxShadow: '0 2px 10px rgba(245,158,11,0.35)', paddingInline: 28,
                                    }}
                                >
                                    <Bi e="Download with Picture" c="下载带图片结果" />
                                </Button>
                            </div>
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
                        <Col xs={24} md={4}>
                            <Label><Bi e="Target Price (IDR)" c="目标价格 (IDR)" /></Label>
                            <InputNumber
                                size="large"
                                style={{ width: '100%', borderRadius: 8, height: 46 }}
                                placeholder="Enter target price"
                                min={0}
                                step={1000}
                                value={targetPrice}
                                onChange={setTargetPrice}
                                onFocus={() => { if (targetPrice === 0) setTargetPrice(null); }}
                                formatter={(v) => (v === null || v === undefined || v === '' ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
                                parser={(v) => (v ? v.replace(/\./g, '') : '')}
                            />
                        </Col>
                        <Col xs={24} md={4}>
                            <Label><Bi e="Target Stock" c="目标库存" /></Label>
                            <InputNumber
                                size="large"
                                style={{ width: '100%', borderRadius: 8, height: 46 }}
                                placeholder="Enter target stock"
                                min={0}
                                step={1}
                                value={targetStock}
                                onChange={setTargetStock}
                                onFocus={() => { if (targetStock === 0) setTargetStock(null); }}
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

                            {/* SKU Preview */}
                            {directResult.items?.length > 0 && (
                                <div style={{ marginBottom: 28 }}>
                                    <SectionHeading icon={<AppstoreOutlined />}><Bi e="Item Preview" c="商品预览" /></SectionHeading>
                                    <div style={{ display: 'grid', gridTemplateColumns: directResult.items.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
                                        {directResult.items.map((item, idx) => (
                                            <div key={`${item.sku}-${idx}`} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', minHeight: 220, display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', padding: 16, background: '#0f172a' }}>
                                                    <div style={{ width: 120, minWidth: 120, aspectRatio: '1 / 1', position: 'relative', overflow: 'hidden', borderRadius: 18, background: '#111827' }}>
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.name || item.sku} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                                                                <Text style={{ fontSize: 12 }}>No image available</Text>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                                                    <div>
                                                        <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 15 }}>{item.name || item.sku}</Text>
                                                        <Text type="secondary" style={{ display: 'block', fontSize: 12, wordBreak: 'break-all' }}>{item.sku}</Text>
                                                        {item.stock && (
                                                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                                                {Object.entries(item.stock).filter(([, v]) => Number(v) > 0).map(([k, v]) => `${k}: ${Number(v).toLocaleString()}`).join(' | ') || 'No Stock'}
                                                            </Text>
                                                        )}
                                                    </div>
                                                    {item.link ? (
                                                        <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--indigo)' }}>
                                                            Open product link
                                                        </a>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            <SectionHeading icon={<BarChartOutlined />}><Bi e="Bundle Summary" c="捆绑摘要" /></SectionHeading>
                            <Row gutter={16} style={{ marginBottom: 24 }}>
                                {[
                                    { label: 'Bundle Discount', value: `${Number(directResult.summary.bundle_discount) * 100}%`, color: 'var(--indigo)' },
                                    { label: 'Clearance Status', value: directResult.summary.clearance, color: '#f59e0b' },
                                    { label: 'Gift Status',      value: directResult.summary.gift,      color: '#10b981' },
                                    { label: 'Available Stock',  value: directResult.summary.available_stock || 'No Stock', color: '#06b6d4' },
                                ].map(({ label, value, color }) => (
                                    <Col key={label} xs={24} md={12}>
                                        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>

                            {/* Breakdown Table */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <SectionHeading icon={<AppstoreOutlined />}><Bi e="Price Composition Breakdown" c="价格构成明细" /></SectionHeading>
                                <Button size="small" icon={<FileTextOutlined />} onClick={() => copyTable(directResult.breakdown, breakdownColumns)} style={{ fontSize: 12 }}>Copy Table</Button>
                            </div>
                            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 24 }}>
                                <Table
                                    dataSource={directResult.breakdown}
                                    columns={breakdownColumns}
                                    pagination={false}
                                    size="middle"
                                    rowKey="SKU"
                                    scroll={{ x: 'max-content' }}
                                    className="copyable-table price-checker-center-table"
                                />
                            </div>

                            {/* Evaluation Table */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <SectionHeading icon={<RiseOutlined />}><Bi e="Price Evaluation by Tier" c="按层级进行价格评估" /></SectionHeading>
                                <Button size="small" icon={<FileTextOutlined />} onClick={() => copyTable(directResult.evaluation, evalColumns)} style={{ fontSize: 12 }}>Copy Table</Button>
                            </div>
                            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <Table
                                    dataSource={directResult.evaluation}
                                    columns={evalColumns}
                                    pagination={false}
                                    size="middle"
                                    rowKey="Tier"
                                    scroll={{ x: 660 }}
                                    className="copyable-table price-checker-center-table"
                                />
                            </div>

                            {/* Stock Evaluation Table */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 8px' }}>
                                <SectionHeading icon={<BarChartOutlined />}><Bi e="Stock Evaluation by Type" c="按库存类型进行评估" /></SectionHeading>
                                <Button
                                    size="small"
                                    icon={<FileTextOutlined />}
                                    onClick={() => copyTable(directResult.stock_evaluation || [], stockEvalColumns)}
                                    style={{ fontSize: 12 }}
                                >
                                    Copy Table
                                </Button>
                            </div>
                            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <Table
                                    dataSource={directResult.stock_evaluation || []}
                                    columns={stockEvalColumns}
                                    pagination={false}
                                    size="middle"
                                    rowKey="StockType"
                                    scroll={{ x: 660 }}
                                    className="price-checker-center-table"
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

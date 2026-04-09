import React, { useState } from 'react';
import {
    Typography, Button, Row, Col, InputNumber, Divider,
    Table, message, Tabs, Tag, Tooltip
} from 'antd';
import {
    ThunderboltOutlined, FileExcelOutlined,
    PlusOutlined, DeleteOutlined, WarningOutlined
} from '@ant-design/icons';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

/* ─── Editable cell table builder ─── */
const EditableNumberInput = ({ value, onChange, placeholder, min, style, formatter, parser }) => (
    <InputNumber
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        style={{ width: '100%', background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text-main)', ...style }}
        controls={false}
        size="small"
        formatter={formatter}
        parser={parser}
    />
);

const SectionHeading = ({ emoji, children }) => (
    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span>{emoji}</span> {children}
    </div>
);

/* ─── Generic editable grid ─── */
const EditableGrid = ({ rows, setRows, columns, addLabel }) => {
    const addRow = () => setRows(prev => [...prev, columns.reduce((acc, c) => ({ ...acc, [c.key]: c.default ?? '' }), {})]);
    const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));
    const updateRow = (i, key, val) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: `${columns.map(c => c.width || '1fr').join(' ')} 40px`, gap: 6, marginBottom: 8 }}>
                {columns.map(c => (
                    <div key={c.key} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                ))}
                <div />
            </div>
            {rows.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: `${columns.map(c => c.width || '1fr').join(' ')} 40px`, gap: 6, marginBottom: 6 }}>
                    {columns.map(c => (
                        <div key={c.key}>
                            {c.type === 'text' ? (
                                <input
                                    value={row[c.key] || ''}
                                    onChange={e => updateRow(i, c.key, e.target.value)}
                                    placeholder={c.placeholder || ''}
                                    style={{
                                        width: '100%', padding: '5px 8px', borderRadius: 6, fontSize: 13,
                                        background: 'var(--bg-panel)', border: '1px solid var(--border)',
                                        color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box'
                                    }}
                                />
                            ) : (
                                <EditableNumberInput
                                    value={row[c.key] || ''}
                                    onChange={v => updateRow(i, c.key, v)}
                                    placeholder={c.placeholder || ''}
                                    min={c.min}
                                    formatter={c.formatter}
                                    parser={c.parser}
                                />
                            )}
                        </div>
                    ))}
                    <Button
                        type="text" size="small" danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeRow(i)}
                        style={{ color: '#ef4444', padding: 0, width: 32, height: 32 }}
                        disabled={rows.length <= 1}
                    />
                </div>
            ))}
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addRow}
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', marginTop: 4, fontSize: 12 }}>
                {addLabel}
            </Button>
        </div>
    );
};

/* ─── Main Component ─── */
const WarehouseOrder = () => {
    const { logActivity } = useAuth();

    const [aov, setAov] = useState(null);
    const [totalDays, setTotalDays] = useState(31);
    const [platforms, setPlatforms] = useState([
        { name: 'Shopee', number: 1, target: 10000000 },
        { name: 'Lazada', number: 2, target: null },
        { name: 'Tokopedia', number: 3, target: null },
        { name: 'TikTok', number: 4, target: 8000000 },
    ]);
    const [warehouses, setWarehouses] = useState([
        { name: 'Cikarang', number: 1, proportion: 85 },
        { name: 'Surabaya', number: 2, proportion: 15 },
        { name: 'Medan', number: 3, proportion: 0 },
    ]);
    const [events, setEvents] = useState([
        { name: 'Pay Day', dates_str: '25', proportion: 20 },
        { name: 'Double Day', dates_str: '4', proportion: 30 },
        { name: 'Special Day', dates_str: '5+6+7+8', proportion: 25 },
    ]);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleCalculate = async () => {
        if (!aov || aov <= 0) { message.warning('Please set a valid Average Order Value (AOV)'); return; }
        setLoading(true);
        setResult(null);
        try {
            const res = await api.post('/warehouse-order/calculate', {
                aov,
                total_days: totalDays,
                platforms,
                warehouses,
                events,
            });
            setResult(res.data);
            message.success('Estimation generated!');
            logActivity('Warehouse Order Estimator');
        } catch (err) {
            message.error(err.response?.data?.detail || 'Calculation failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!result?.excel_b64) return;
        const bytes = atob(result.excel_b64);
        const buf = new Uint8Array(bytes.length).map((_, i) => bytes.charCodeAt(i));
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'warehouse_order_estimation.xlsx' }).click();
    };

    /* ─── Matrix Table (scrollable horizontal) ─── */
    const renderMatrix = () => {
        if (!result) return null;
        const { matrix_rows, days, platform_names, warehouse_names } = result;

        // Build ant-design columns: fixed Warehouse + one per (day × platform)
        const cols = [
            {
                title: 'Warehouse',
                dataIndex: 'Warehouse',
                key: 'Warehouse',
                fixed: 'left',
                width: 110,
                render: v => <Text strong style={{ color: 'var(--text-main)', fontSize: 12 }}>{v}</Text>
            },
            ...days.map(d => ({
                title: <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 11, color: '#94a3b8' }}>Day {d}</div>,
                key: `day_${d}`,
                children: platform_names.map(p => ({
                    title: <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>{p}</div>,
                    dataIndex: `D${d}|${p}`,
                    key: `D${d}|${p}`,
                    width: 72,
                    align: 'right',
                    render: val => val != null
                        ? <span style={{ fontSize: 12, fontWeight: 600, color: val > 0 ? '#38bdf8' : 'var(--text-muted)' }}>{val.toLocaleString()}</span>
                        : <span style={{ color: '#334155', fontSize: 11 }}>—</span>
                }))
            }))
        ];

        return (
            <Table
                dataSource={matrix_rows.map((r, i) => ({ ...r, key: i }))}
                columns={cols}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
                bordered
                style={{ fontSize: 12 }}
            />
        );
    };

    const platCols = [
        { key: 'name', label: 'Platform', type: 'text', placeholder: 'e.g. Shopee', width: '2fr' },
        { key: 'number', label: '#', type: 'number', placeholder: '1', min: 1, width: '0.7fr' },
        { 
            key: 'target', 
            label: 'Monthly Target (Rp)', 
            type: 'number', 
            placeholder: 'e.g. 10000000', 
            width: '2fr',
            formatter: v => v ? `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '',
            parser: v => v?.replace(/Rp\s?|(,*)/g, '')
        },
    ];
    const whCols = [
        { key: 'name', label: 'Warehouse', type: 'text', placeholder: 'e.g. Cikarang', width: '2fr' },
        { key: 'number', label: '#', type: 'number', placeholder: '1', min: 1, width: '0.7fr' },
        { key: 'proportion', label: 'Proportion (%)', type: 'number', placeholder: '85', min: 0, width: '1.5fr' },
    ];
    const evCols = [
        { key: 'name', label: 'Event Name', type: 'text', placeholder: 'Pay Day', width: '1.5fr' },
        { key: 'dates_str', label: 'Dates (e.g. 25 or 5+6+7)', type: 'text', placeholder: '25', width: '2fr' },
        { key: 'proportion', label: 'Total Proportion (%)', type: 'number', placeholder: '20', min: 0, width: '1.5fr' },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: 'var(--text-main)', fontWeight: 800 }}>
                    🏭 Warehouse Order Estimator
                </Title>
                <Text style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Calculate daily order estimations per warehouse & platform based on monthly targets
                </Text>
            </div>

            <Row gutter={[20, 20]}>
                {/* LEFT: Config Panel */}
                <Col xs={24} lg={9}>
                    {/* General Params */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <SectionHeading emoji="⚙️">General Parameters</SectionHeading>
                        <Row gutter={12}>
                            <Col span={14}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Average Order Value (AOV)</div>
                                <InputNumber
                                    value={aov}
                                    onChange={setAov}
                                    placeholder="e.g. 50000"
                                    min={1}
                                    style={{ width: '100%', background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
                                    formatter={v => v ? `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                    parser={v => v?.replace(/Rp\s?|(,*)/g, '')}
                                    size="large"
                                />
                            </Col>
                            <Col span={10}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Days in Month</div>
                                <InputNumber
                                    value={totalDays}
                                    onChange={v => setTotalDays(v || 31)}
                                    min={1} max={31}
                                    style={{ width: '100%', background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
                                    size="large"
                                />
                            </Col>
                        </Row>
                    </div>

                    {/* Platform Config */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <SectionHeading emoji="🛒">Platform Configuration</SectionHeading>
                        <Text style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>
                            Leave Target empty to exclude platform from estimation
                        </Text>
                        <EditableGrid rows={platforms} setRows={setPlatforms} columns={platCols} addLabel="Add Platform" />
                    </div>

                    {/* Warehouse Config */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <SectionHeading emoji="🏭">Warehouse Configuration</SectionHeading>
                        <EditableGrid rows={warehouses} setRows={setWarehouses} columns={whCols} addLabel="Add Warehouse" />
                        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
                            <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                                Total proportion: <strong style={{ color: warehouses.reduce((s, w) => s + (Number(w.proportion) || 0), 0) === 100 ? '#10b981' : '#f59e0b' }}>
                                    {warehouses.reduce((s, w) => s + (Number(w.proportion) || 0), 0)}%
                                </strong>
                                {warehouses.reduce((s, w) => s + (Number(w.proportion) || 0), 0) !== 100 && (
                                    <Tooltip title="Total should be 100% for accurate results"><WarningOutlined style={{ color: '#f59e0b', marginLeft: 6 }} /></Tooltip>
                                )}
                            </Text>
                        </div>
                    </div>

                    {/* Event Config */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                        <SectionHeading emoji="📅">Event Configuration</SectionHeading>
                        <Text style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>
                            Use <code style={{ color: '#38bdf8' }}>+</code> to specify multiple dates (e.g. <code style={{ color: '#38bdf8' }}>5+6+7+8</code>).
                            Remaining days become "Regular Day".
                        </Text>
                        <EditableGrid rows={events} setRows={setEvents} columns={evCols} addLabel="Add Event" />
                    </div>

                    {/* Generate Button */}
                    <Button
                        block loading={loading} onClick={handleCalculate}
                        icon={<ThunderboltOutlined />}
                        style={{
                            height: 52, borderRadius: 10, fontWeight: 700, fontSize: 16,
                            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                            color: '#fff', border: 'none',
                            boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                        }}
                    >
                        {loading ? 'Generating Estimation...' : 'Generate Estimation Output'}
                    </Button>
                </Col>

                {/* RIGHT: Results */}
                <Col xs={24} lg={15}>
                    {!result && !loading && (
                        <div style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                            padding: '60px 40px', textAlign: 'center', height: '100%', display: 'flex',
                            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12
                        }}>
                            <div style={{ fontSize: 52 }}>🏭</div>
                            <Text style={{ fontSize: 16, color: 'var(--text-muted)' }}>Configure parameters on the left and click <strong>Generate</strong></Text>
                            <Text style={{ fontSize: 13, color: '#475569' }}>The estimation matrix will appear here</Text>
                        </div>
                    )}

                    {result && !loading && (
                        <div>
                            {/* Summary Cards */}
                            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                                <Col xs={12} md={6}>
                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '4px solid #6366f1', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#6366f1', fontFamily: "'Outfit', sans-serif" }}>
                                            Rp {result.aov?.toLocaleString()}
                                        </div>
                                        <Text style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>AOV</Text>
                                    </div>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '4px solid #10b981', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981', fontFamily: "'Outfit', sans-serif" }}>
                                            {result.warehouse_names?.length}
                                        </div>
                                        <Text style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Warehouses</Text>
                                    </div>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '4px solid #38bdf8', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#38bdf8', fontFamily: "'Outfit', sans-serif" }}>
                                            {result.platform_names?.filter(p => result.platforms?.find(pl => pl.name === p && pl.target)).length}
                                        </div>
                                        <Text style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Active Platforms</Text>
                                    </div>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '4px solid #f59e0b', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', fontFamily: "'Outfit', sans-serif" }}>
                                            {result.total_wh_prop?.toFixed(0)}%
                                        </div>
                                        <Text style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>WH Coverage</Text>
                                    </div>
                                </Col>
                            </Row>

                            {/* Proportion Summary */}
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                                <SectionHeading emoji="📊">Proportion Distribution Summary</SectionHeading>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {result.summary?.map((s, i) => (
                                        <div key={i} style={{
                                            background: 'var(--bg-panel)', border: '1px solid var(--border)',
                                            borderRadius: 8, padding: '10px 14px', minWidth: 140
                                        }}>
                                            <Text style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>{s.Event}</Text>
                                            <Text style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s['Days Count']} days · {s['Each Day (%)']}/day</Text>
                                            <div style={{ marginTop: 4 }}>
                                                <Tag color="blue" style={{ fontSize: 10 }}>{s['Total Prop (%)']}</Tag>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Matrix */}
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16, overflow: 'hidden' }}>
                                <SectionHeading emoji="📈">Order Estimation Matrix</SectionHeading>
                                <Text style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>
                                    Scroll horizontally to see all days. Values = estimated order count per warehouse per day.
                                </Text>
                                {renderMatrix()}
                            </div>

                            {/* Download */}
                            <Button
                                block size="large" onClick={handleDownload} icon={<FileExcelOutlined />}
                                style={{
                                    height: 54, borderRadius: 10, fontWeight: 700, fontSize: 15,
                                    background: '#10b981', color: '#fff', border: 'none',
                                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                                }}
                            >
                                Download Estimation Report (.xlsx)
                            </Button>
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    );
};

export default WarehouseOrder;

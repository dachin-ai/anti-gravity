import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Card, Typography, Select, DatePicker, Upload, Button,
  Table, message, Space, Row, Col, Tag, Tooltip, Spin, Segmented
} from 'antd';
import {
  InboxOutlined, CheckCircleFilled, MinusCircleFilled,
  ShopOutlined, UploadOutlined, ReloadOutlined,
  DownloadOutlined, BarChartOutlined, FileTextOutlined,
  RiseOutlined, FallOutlined, MinusOutlined,
  DeleteOutlined, ExclamationCircleFilled,
  CloudUploadOutlined, AppstoreOutlined, LineChartOutlined,
  SwapOutlined
} from '@ant-design/icons';
import { Modal } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { RangePicker } = DatePicker;

const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/shopee-affiliate`
  : 'http://localhost:8000/api/shopee-affiliate';

// ── Design tokens ─────────────────────────────────────────────────────────────
const S = {
  page:    { padding: 24, minHeight: '100vh', background: 'var(--bg-app, #0f172a)' },
  card:    { background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 },
  infoBox: { padding: '10px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8 },
  warnBox: { padding: '10px 14px', background: 'rgba(250,173,20,0.08)', border: '1px solid rgba(250,173,20,0.25)', borderRadius: 8 },
  label:   { color: '#94a3b8', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' },
};

const fmtRp = n => n != null
  ? new Intl.NumberFormat('id-ID').format(Math.round(n))
  : '—';

// Professional table header override
const tblScroll = { x: 'max-content', y: 480 };
const tblHeaderStyle = {
  background: '#1a3a5c !important',
  color: '#fff !important',
  fontWeight: '700 !important',
  borderRight: '1px solid #2d5a8e !important',
};
const getHeaderCell = () => ({
  style: {
    background: '#1a3a5c',
    color: '#ffffff',
    fontWeight: 700,
    borderRight: '1px solid #2d5a8e',
    borderBottom: '1px solid #2d5a8e',
    fontSize: 12,
  }
});
const getBodyRowStyle = (_, idx) => ({
  style: { background: idx % 2 === 0 ? 'rgba(30,41,59,0.8)' : 'rgba(15,23,42,0.8)' }
});

// ─────────────────────────────────────────────────────────────────────────────
const ShopeeAffiliate = () => {
  const [stores, setStores]               = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await axios.get(`${API}/stores`);
        setStores(res.data.stores || []);
      } catch { message.error('Failed to load stores from AT1.'); }
      finally { setStoresLoading(false); }
    };
    fetchStores();
  }, []);

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg,#ff4d4f,#ff7a45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(255,77,79,0.4)' }}>
          <ShopOutlined style={{ color: '#fff', fontSize: 22 }} />
        </div>
        <div>
          <Title level={3} style={{ margin: 0, color: '#f1f5f9', fontFamily: "'Outfit',sans-serif" }}>
            Shopee Affiliate Hub
          </Title>
          <Text style={{ color: '#64748b', fontSize: 13 }}>
            Centralized data integration & analytics for Product · Creator · Conversion
          </Text>
        </div>
      </div>

      <Card style={S.card} bodyStyle={{ padding: 0 }}>
        <Tabs size="large" style={{ padding: '0 8px' }} items={[
          { key: 'upload',      label: <span><CloudUploadOutlined /> Upload Data</span>,       children: <UploadTab    stores={stores} storesLoading={storesLoading} /> },
          { key: 'checker',     label: <span><AppstoreOutlined /> Checker Matrix</span>,       children: <CheckerTab   stores={stores} /> },
          { key: 'analytics',   label: <span><LineChartOutlined /> Analytics</span>,            children: <AnalyticsTab stores={stores} /> },
          { key: 'report',      label: <span><FileTextOutlined /> Full Report</span>,           children: <ReportTab    stores={stores} /> },
          { key: 'comparison',  label: <span><SwapOutlined /> Period Comparison</span>,         children: <ComparisonTab stores={stores} /> },
        ]} />
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ① Upload Tab
// ─────────────────────────────────────────────────────────────────────────────
const UploadTab = ({ stores, storesLoading }) => {
  const [uploadType,    setUploadType]    = useState('conversion');
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());     // for conversion
  const [manualDate,    setManualDate]    = useState(null);         // for product/creator (optional)
  const [uploading,     setUploading]     = useState(false);
  const [fileList,      setFileList]      = useState([]);

  const isConversion = uploadType === 'conversion';
  const needsManual  = !isConversion;  // product or creator

  const handleUpload = async () => {
    if (!selectedStore)                          return message.warning('Please select a store first.');
    if (!fileList.length)                        return message.warning('Select or drag CSV files to upload.');
    if (isConversion && fileList.length > 1)     return message.warning('Conversion: only 1 file per month is allowed.');

    setUploading(true);
    let ok = 0, fail = 0;
    for (const fo of fileList) {
      const fd = new FormData();
      fd.append('file',       fo.originFileObj);
      fd.append('file_type',  uploadType);
      fd.append('store_id',   selectedStore);
      if (isConversion)                      fd.append('manual_date', selectedMonth.format('YYYY-MM'));
      if (needsManual && manualDate)         fd.append('manual_date', manualDate.format('YYYY-MM-DD'));
      try {
        const res = await axios.post(`${API}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        res.data.succeed ? ok++ : (fail++, message.error(`${fo.name}: ${res.data.message}`));
      } catch (e) {
        fail++;
        message.error(`${fo.name}: ${e.response?.data?.detail || e.message}`);
      }
    }
    if (ok) message.success(`✅ Successfully processed ${ok} file(s)!`);
    if (!fail) setFileList([]);
    setUploading(false);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={12}>
            <div style={S.label}>Data Type</div>
            <Select style={{ width: '100%', marginTop: 6 }} value={uploadType}
              onChange={v => { setUploadType(v); setFileList([]); }}
              options={[
                { value: 'conversion', label: '📋 Conversion (1 file/month)' },
                { value: 'product',    label: '📦 Product (batch)' },
                { value: 'creator',    label: '🎬 Creator (batch)' },
              ]} />
          </Col>
          <Col span={12}>
            <div style={S.label}>Select Store</div>
            <Select showSearch loading={storesLoading} placeholder="Select a Shopee store..."
              style={{ width: '100%', marginTop: 6 }} value={selectedStore} onChange={setSelectedStore}
              options={stores.map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }))} />
          </Col>
        </Row>

        {isConversion && (
          <div>
            <div style={S.label}>Report Month (Conversion)</div>
            <DatePicker picker="month" style={{ width: '100%', marginTop: 6 }}
              value={selectedMonth} onChange={d => d && setSelectedMonth(d)} allowClear={false} />
            <div style={{ ...S.warnBox, marginTop: 10, fontSize: 12, color: '#faad14' }}>
              ⚠️ Conversion data for this store and month will be <strong>overwritten</strong> if re-uploaded.
            </div>
          </div>
        )}
        {needsManual && (
          <div>
            <div style={S.label}>
              Manual Date Override <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — fill only if filename has no date)</span>
            </div>
            <DatePicker
              style={{ width: '100%', marginTop: 6 }}
              value={manualDate}
              onChange={setManualDate}
              placeholder="Leave blank to auto-detect from filename"
              allowClear
            />
            {manualDate
              ? (
                <div style={{ ...S.warnBox, marginTop: 8, fontSize: 12, color: '#faad14' }}>
                  📅 All uploaded files in this batch will be tagged as <strong>{manualDate.format('DD MMMM YYYY')}</strong>.
                </div>
              ) : (
                <div style={{ ...S.infoBox, color: '#a5b4fc', fontSize: 12, marginTop: 8 }}>
                  💡 Dates are <strong>auto-detected</strong> from filenames (e.g. <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 5px', borderRadius: 4 }}>_20260401</code> or <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 5px', borderRadius: 4 }}>202604101458</code>). Batch uploading is allowed.
                </div>
              )
            }
          </div>
        )}

        <Dragger multiple={!isConversion} fileList={fileList}
          onChange={info => setFileList(info.fileList)} beforeUpload={() => false}
          style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#ff4d4f', fontSize: 36 }} /></p>
          <p style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 500 }}>Click or Drag CSV files here</p>
          <p style={{ color: '#64748b', fontSize: 13 }}>Upload raw files directly from Shopee Affiliate portal</p>
        </Dragger>

        <Button type="primary" block size="large" icon={<UploadOutlined />}
          loading={uploading} onClick={handleUpload}
          style={{ background: 'linear-gradient(135deg,#ff4d4f,#ff7a45)', border: 'none', fontWeight: 600, height: 48 }}>
          Start ETL Process
        </Button>
      </Space>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ② Checker Matrix
// ─────────────────────────────────────────────────────────────────────────────
const CheckerTab = ({ stores }) => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [matrixData,    setMatrixData]    = useState([]);
  const [loading,       setLoading]       = useState(false);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/checker-matrix`, {
        params: { year: selectedMonth.format('YYYY'), month: selectedMonth.format('MM') }
      });
      setMatrixData(res.data.matrix || []);
    } catch { message.error('Failed to load Checker Matrix.'); }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  const activeStoreCodes = [...new Set(matrixData.flatMap(r => Object.keys(r.stores || {})))].sort();
  const getStoreName = code => { const s = stores.find(x => x.code === code); return s ? s.name.split(' - ').slice(-1)[0] : code; };

  const handleDelete = (date) => {
    Modal.confirm({
      title: 'Delete Data',
      icon: <ExclamationCircleFilled />,
      content: `All Product, Creator, and Conversion data for ${dayjs(date).format('DD MMM YYYY')} will be permanently deleted. Continue?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const res = await axios.delete(`${API}/data`, { params: { date } });
          message.success(res.data.message);
          fetchMatrix();
        } catch (e) {
          message.error(e.response?.data?.detail || 'Failed to delete data.');
        }
      }
    });
  };

  const Tick = ({ val }) => val
    ? <CheckCircleFilled  style={{ color: '#22c55e', fontSize: 15 }} />
    : <MinusCircleFilled  style={{ color: '#1e3a5f', fontSize: 13 }} />;

  const hasAnyData = (row) => {
    return Object.values(row.stores || {}).some(s => s.product || s.creator || s.conversion);
  };

  const columns = [
    {
      title: 'Date', dataIndex: 'date', fixed: 'left', width: 110,
      onHeaderCell: getHeaderCell,
      render: t => <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{dayjs(t).format('DD MMM YYYY')}</span>,
    },
    ...activeStoreCodes.map(code => ({
      title: <span style={{ color: '#93c5fd' }}>{getStoreName(code)}</span>,
      onHeaderCell: getHeaderCell,
      children: [
        { title: <span style={{ color: '#86efac', fontSize: 10 }}>Prod</span>, align: 'center', width: 52, onHeaderCell: getHeaderCell, render: (_, r) => <Tick val={r.stores[code]?.product} /> },
        { title: <span style={{ color: '#fbbf24', fontSize: 10 }}>Crtr</span>, align: 'center', width: 52, onHeaderCell: getHeaderCell, render: (_, r) => <Tick val={r.stores[code]?.creator} /> },
        { title: <span style={{ color: '#60a5fa', fontSize: 10 }}>Conv</span>, align: 'center', width: 52, onHeaderCell: getHeaderCell, render: (_, r) => <Tick val={r.stores[code]?.conversion} /> },
      ]
    })),
    {
      title: '', fixed: 'right', width: 50, align: 'center',
      onHeaderCell: getHeaderCell,
      render: (_, row) => hasAnyData(row) ? (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => handleDelete(row.date)}
          style={{ opacity: 0.6 }}
        />
      ) : null
    }
  ];

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text style={{ color: '#94a3b8' }}>Filter Month:</Text>
          <DatePicker picker="month" value={selectedMonth} onChange={d => d && setSelectedMonth(d)} allowClear={false} />
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchMatrix} loading={loading}>Refresh</Button>
      </div>
      <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
        <CheckCircleFilled style={{ color: '#22c55e' }} /> = Data available &nbsp;&nbsp;
        <MinusCircleFilled style={{ color: '#1e3a5f' }} /> = Missing data &nbsp;&nbsp;
        <DeleteOutlined style={{ color: '#ef4444' }} /> = Click to delete all data for that date
      </div>
      <Table columns={columns} dataSource={matrixData} rowKey="date" loading={loading}
        bordered size="small" pagination={false} scroll={tblScroll} style={{ background: 'transparent' }}
        onRow={getBodyRowStyle} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ③ Analytics (quick top list with bars)
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsTab = ({ stores }) => {
  const [dateRange,     setDateRange]     = useState([dayjs().startOf('month'), dayjs()]);
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [data,          setData]          = useState({ topProducts: [], topCreators: [] });
  const [loading,       setLoading]       = useState(false);

  const fetch = useCallback(async () => {
    if (!dateRange || dateRange.length !== 2) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/analytics`, {
        params: { start_date: dateRange[0].format('YYYY-MM-DD'), end_date: dateRange[1].format('YYYY-MM-DD'), store_id: selectedStore }
      });
      setData(res.data);
    } catch { message.error('Failed to load Analytics.'); }
    setLoading(false);
  }, [dateRange, selectedStore]);

  useEffect(() => { fetch(); }, [fetch]);

  const maxProd = Math.max(...data.topProducts.map(p => p.gmv || 0), 1);
  const maxCrtr = Math.max(...data.topCreators.map(c => c.gmv || 0), 1);

  const BarRow = ({ label, sub, gmv, max }) => (
    <div style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: '#e2e8f0', fontSize: 13, maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 13 }}>Rp {fmtRp(gmv)}</span>
      </div>
      {sub && <div style={{ color: '#64748b', fontSize: 11, marginBottom: 3 }}>{sub}</div>}
      <div style={{ height: 3, background: '#1e293b', borderRadius: 4 }}>
        <div style={{ height: '100%', width: `${(gmv / max) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#22c55e)', borderRadius: 4 }} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: '20px 24px' }}>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={14}>
          <div style={S.label}>Date Range</div>
          <RangePicker style={{ width: '100%', marginTop: 6 }} value={dateRange} onChange={setDateRange} />
        </Col>
        <Col span={10}>
          <div style={S.label}>Store</div>
          <Select showSearch style={{ width: '100%', marginTop: 6 }} value={selectedStore} onChange={setSelectedStore}
            options={[{ value: 'ALL', label: '🌐 All Stores' }, ...stores.map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }))]} />
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Card title={<span style={{ color: '#e2e8f0' }}>🏆 Top 15 Products (GMV)</span>} style={{ ...S.card }} bodyStyle={{ padding: '8px 16px' }}>
            {loading ? <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
              : data.topProducts.length ? data.topProducts.map((p, i) => <BarRow key={i} label={p.name} sub={`PID: ${p.product_id}`} gmv={p.gmv} max={maxProd} />)
              : <div style={{ textAlign: 'center', padding: 32, color: '#475569' }}>No product data</div>}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<span style={{ color: '#e2e8f0' }}>🎬 Top 15 Creators (GMV)</span>} style={{ ...S.card }} bodyStyle={{ padding: '8px 16px' }}>
            {loading ? <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
              : data.topCreators.length ? data.topCreators.map((c, i) => <BarRow key={i} label={c.name || c.username} sub={`@${c.username}`} gmv={c.gmv} max={maxCrtr} />)
              : <div style={{ textAlign: 'center', padding: 32, color: '#475569' }}>No creator data</div>}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ④ Laporan Lengkap
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_DIMS = [
  { value: 'by_store',   label: '🏪 By Store' },
  { value: 'by_creator', label: '🎬 By Creator' },
  { value: 'by_product', label: '📦 By Product' },
];

const ReportTab = ({ stores }) => {
  const [dateRange,     setDateRange]     = useState([dayjs().startOf('month'), dayjs()]);
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [dimension,     setDimension]     = useState('by_creator');
  const [data,          setData]          = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [downloading,   setDownloading]   = useState(false);
  const [expanded,      setExpanded]      = useState([]);

  const fetchReport = useCallback(async () => {
    if (!dateRange || dateRange.length !== 2) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/report`, {
        params: {
          start_date:  dateRange[0].format('YYYY-MM-DD'),
          end_date:    dateRange[1].format('YYYY-MM-DD'),
          report_type: dimension,
          store_id:    selectedStore
        }
      });
      setData(res.data.data || []);
    } catch { message.error('Failed to load report.'); }
    setLoading(false);
  }, [dateRange, selectedStore, dimension]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleDownload = async () => {
    if (!dateRange || dateRange.length !== 2) return;
    setDownloading(true);
    try {
      const res = await axios.get(`${API}/report/download`, {
        params: {
          start_date:  dateRange[0].format('YYYY-MM-DD'),
          end_date:    dateRange[1].format('YYYY-MM-DD'),
          report_type: dimension,
          store_id:    selectedStore
        },
        responseType: 'blob'
      });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `Shopee_Affiliate_${dimension}_${dateRange[0].format('YYYYMMDD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch { message.error('Failed to download report.'); }
    setDownloading(false);
  };

  // ── Build columns based on dimension ───────────────────────
  const numCol = (title, key, prefix = '') => ({
    title, dataIndex: key, align: 'right', width: 140, onHeaderCell: getHeaderCell,
    sorter: (a, b) => (a[key] || 0) - (b[key] || 0),
    render: v => <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{prefix}{fmtRp(v)}</span>
  });
  const roiCol = () => ({
    title: 'ROI', dataIndex: 'roi', align: 'right', width: 90, onHeaderCell: getHeaderCell,
    sorter: (a, b) => (a.roi || 0) - (b.roi || 0),
    render: v => {
      const col = v >= 5 ? '#22c55e' : v >= 2 ? '#faad14' : '#ef4444';
      return <span style={{ color: col, fontWeight: 700 }}>{(v || 0).toFixed(2)}x</span>;
    }
  });

  let columns = [];
  if (dimension === 'by_store') {
    columns = [
      { title: 'No', render: (_, __, i) => i+1, width: 50, align: 'center', onHeaderCell: getHeaderCell },
      { title: 'Store ID', dataIndex: 'store_id', width: 150, onHeaderCell: getHeaderCell, render: v => <Tag color="blue">{v}</Tag> },
      numCol('GMV Completed', 'gmv_completed', 'Rp '),
      numCol('GMV Pending', 'gmv_pending', 'Rp '),
      numCol('GMV Potential', 'gmv_potential', 'Rp '),
      numCol('GMV Canceled', 'gmv_canceled', 'Rp '),
      numCol('Commission (Rp)', 'commission', 'Rp '),
      roiCol(),
      numCol('Units Sold', 'units'),
      numCol('Clicks', 'clicks'),
      { title: 'Creators', dataIndex: 'creator_count', align: 'right', width: 90, onHeaderCell: getHeaderCell, render: v => <span style={{ color: '#a5b4fc' }}>{v}</span> }
    ];
  } else if (dimension === 'by_creator') {
    columns = [
      { title: 'No', render: (_, __, i) => i+1, width: 50, align: 'center', onHeaderCell: getHeaderCell },
      { title: 'Username', dataIndex: 'username', width: 180, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>@{v}</span> },
      { title: 'Creator Name', dataIndex: 'name', width: 200, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#e2e8f0' }}>{v}</span> },
      numCol('GMV Completed', 'gmv_completed', 'Rp '),
      numCol('GMV Pending', 'gmv_pending', 'Rp '),
      numCol('GMV Potential', 'gmv_potential', 'Rp '),
      numCol('GMV Canceled', 'gmv_canceled', 'Rp '),
      numCol('Commission (Rp)', 'commission', 'Rp '),
      roiCol(),
      numCol('Units Sold', 'units'),
      numCol('Clicks', 'clicks'),
      { title: 'Stores', dataIndex: 'store_count', align: 'right', width: 80, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#fbbf24' }}>{v}</span> },
    ];
  } else if (dimension === 'by_product') {
    columns = [
      { title: 'No', render: (_, __, i) => i+1, width: 50, align: 'center', onHeaderCell: getHeaderCell },
      { title: 'PID', dataIndex: 'product_id', width: 120, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>{v}</span> },
      { title: 'Product Name', dataIndex: 'product_name', width: 280, ellipsis: true, onHeaderCell: getHeaderCell,
        render: v => <Tooltip title={v}><span style={{ color: '#e2e8f0' }}>{v}</span></Tooltip> },
      numCol('GMV Completed', 'gmv_completed', 'Rp '),
      numCol('GMV Pending', 'gmv_pending', 'Rp '),
      numCol('GMV Potential', 'gmv_potential', 'Rp '),
      numCol('GMV Canceled', 'gmv_canceled', 'Rp '),
      numCol('Commission (Rp)', 'commission', 'Rp '),
      roiCol(),
      numCol('Units Sold', 'units'),
      { title: 'Creators', dataIndex: 'creator_count', align: 'right', width: 80, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#fbbf24' }}>{v}</span> },
    ];
  }

  // Creator sub-table for by_product
  const expandedRow = record => {
    const subCols = [
      { title: 'Username', dataIndex: 'username', width: 180, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#a5b4fc' }}>@{v}</span> },
      { title: 'Creator Name', dataIndex: 'name', width: 200, onHeaderCell: getHeaderCell },
      { title: 'GMV Potential (Rp)', dataIndex: 'gmv_potential', align: 'right', width: 150, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#22c55e', fontFamily: 'monospace' }}>Rp {fmtRp(v)}</span> },
      { title: 'Commission (Rp)', dataIndex: 'commission', align: 'right', width: 150, onHeaderCell: getHeaderCell,
        render: v => <span style={{ fontFamily: 'monospace' }}>Rp {fmtRp(v)}</span> },
    ];
    return (
      <div style={{ padding: '8px 32px', background: 'rgba(10,20,35,0.8)' }}>
        <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 8, display: 'block' }}>Creators who drove this product:</Text>
        <Table columns={subCols} dataSource={record.creators} rowKey="username"
          bordered size="small" pagination={false} scroll={{ x: 'max-content' }}
          style={{ background: 'transparent' }} onRow={getBodyRowStyle} />
      </div>
    );
  };

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Controls */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={11}>
          <div style={S.label}>Date Range</div>
          <RangePicker style={{ width: '100%', marginTop: 6 }} value={dateRange} onChange={setDateRange} />
        </Col>
        <Col span={8}>
          <div style={S.label}>Store</div>
          <Select showSearch style={{ width: '100%', marginTop: 6 }} value={selectedStore} onChange={setSelectedStore}
            options={[{ value: 'ALL', label: '🌐 All Stores' }, ...stores.map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }))]} />
        </Col>
        <Col span={5}>
          <div style={S.label}>Download</div>
          <Button block icon={<DownloadOutlined />} loading={downloading} onClick={handleDownload}
            style={{ marginTop: 6, background: 'linear-gradient(135deg,#1a3a5c,#2d5a8e)', color: '#fff', border: 'none', fontWeight: 600 }}>
            Export Excel
          </Button>
        </Col>
      </Row>

      {/* Dimension Segmented */}
      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={dimension}
          onChange={setDimension}
          options={REPORT_DIMS}
          style={{ background: 'rgba(15,23,42,0.8)' }}
        />
        <Text style={{ color: '#475569', fontSize: 12, marginLeft: 12 }}>
          {data.length} rows · {dateRange?.[0]?.format('DD MMM')} – {dateRange?.[1]?.format('DD MMM YYYY')}
        </Text>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey={r => r.store_id || r.username || r.product_id}
        loading={loading}
        bordered
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['25','50','100'] }}
        scroll={tblScroll}
        style={{ background: 'transparent' }}
        onRow={getBodyRowStyle}
        expandable={dimension === 'by_product' ? {
          expandedRowRender: expandedRow,
          expandedRowKeys: expanded,
          onExpandedRowsChange: setExpanded,
          rowExpandable: r => r.creators?.length > 0
        } : undefined}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ Komparasi Periode
// ─────────────────────────────────────────────────────────────────────────────
const ComparisonTab = ({ stores }) => {
  const [periodA,       setPeriodA]       = useState([dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')]);
  const [periodB,       setPeriodB]       = useState([dayjs().startOf('month'), dayjs()]);
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [dimension,     setDimension]     = useState('by_creator');
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);

  const fetchComparison = useCallback(async () => {
    if (!periodA || !periodB) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/comparison`, {
        params: {
          period_a_start: periodA[0].format('YYYY-MM-DD'),
          period_a_end:   periodA[1].format('YYYY-MM-DD'),
          period_b_start: periodB[0].format('YYYY-MM-DD'),
          period_b_end:   periodB[1].format('YYYY-MM-DD'),
          dimension,
          store_id:       selectedStore
        }
      });
      setData(res.data);
    } catch { message.error('Failed to load comparison data.'); }
    setLoading(false);
  }, [periodA, periodB, selectedStore, dimension]);

  useEffect(() => { fetchComparison(); }, [fetchComparison]);

  const DeltaBadge = ({ val }) => {
    if (val == null) return <span style={{ color: '#475569' }}>—</span>;
    const up    = val > 0;
    const zero  = val === 0;
    const color = up ? '#22c55e' : zero ? '#64748b' : '#ef4444';
    const icon  = up ? <RiseOutlined /> : zero ? <MinusOutlined /> : <FallOutlined />;
    return (
      <span style={{ color, fontWeight: 700, fontSize: 12 }}>
        {icon} {up ? '+' : ''}{val}%
      </span>
    );
  };

  const metricCols = (metricKey, label, prefix = 'Rp ') => [
    {
      title: <span style={{ color: '#93c5fd' }}>{label} A</span>,
      align: 'right', width: 140, onHeaderCell: getHeaderCell,
      render: r => <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{prefix}{fmtRp(r[`a_${metricKey}`])}</span>
    },
    {
      title: <span style={{ color: '#fbbf24' }}>{label} B</span>,
      align: 'right', width: 140, onHeaderCell: getHeaderCell,
      render: r => <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{prefix}{fmtRp(r[`b_${metricKey}`])}</span>
    },
    {
      title: <span style={{ color: '#a5b4fc' }}>Δ {label}</span>,
      align: 'center', width: 110, onHeaderCell: getHeaderCell,
      sorter: (a, b) => (a[`delta_${metricKey}`] || -999) - (b[`delta_${metricKey}`] || -999),
      render: r => <DeltaBadge val={r[`delta_${metricKey}`]} />
    }
  ];

  const roiCompCols = () => [
    {
      title: <span style={{ color: '#93c5fd' }}>ROI A</span>,
      align: 'right', width: 100, onHeaderCell: getHeaderCell,
      render: r => {
        const v = r.a_roi || 0;
        const col = v >= 5 ? '#22c55e' : v >= 2 ? '#faad14' : '#ef4444';
        return <span style={{ color: col, fontWeight: 700 }}>{v.toFixed(2)}x</span>;
      }
    },
    {
      title: <span style={{ color: '#fbbf24' }}>ROI B</span>,
      align: 'right', width: 100, onHeaderCell: getHeaderCell,
      render: r => {
        const v = r.b_roi || 0;
        const col = v >= 5 ? '#22c55e' : v >= 2 ? '#faad14' : '#ef4444';
        return <span style={{ color: col, fontWeight: 700 }}>{v.toFixed(2)}x</span>;
      }
    },
    {
      title: <span style={{ color: '#a5b4fc' }}>Δ ROI</span>,
      align: 'center', width: 110, onHeaderCell: getHeaderCell,
      sorter: (a, b) => (a.delta_roi || -999) - (b.delta_roi || -999),
      render: r => <DeltaBadge val={r.delta_roi} />
    }
  ];

  const labelCol = dimension === 'by_store'
    ? { title: 'Store ID',  render: r => <Tag color="blue">{r.label}</Tag>, width: 140 }
    : dimension === 'by_creator'
    ? { title: 'Creator',   render: r => <span style={{ color: '#e2e8f0' }}>{r.label}</span>, width: 240 }
    : { title: 'Product',   render: r => <Tooltip title={r.label}><span style={{ color: '#e2e8f0' }}>{r.label}</span></Tooltip>, width: 280, ellipsis: true };

  const columns = [
    { title: 'No', render: (_, __, i) => i+1, width: 45, align: 'center', onHeaderCell: getHeaderCell },
    { ...labelCol, onHeaderCell: getHeaderCell },
    ...metricCols('gmv',        'GMV'),
    ...metricCols('commission', 'Commission'),
    ...roiCompCols(),
    ...metricCols('units',      'Units', ''),
    ...metricCols('clicks',     'Clicks', ''),
  ];

  const rows = data?.rows || [];

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Period pickers */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={7}>
          <div style={S.label}>📅 Period A (Baseline)</div>
          <RangePicker style={{ width: '100%', marginTop: 6 }} value={periodA} onChange={setPeriodA}
            placeholder={['A Start', 'A End']} />
        </Col>
        <Col span={7}>
          <div style={S.label}>📅 Period B (Comparison)</div>
          <RangePicker style={{ width: '100%', marginTop: 6 }} value={periodB} onChange={setPeriodB}
            placeholder={['B Start', 'B End']} />
        </Col>
        <Col span={6}>
          <div style={S.label}>Store</div>
          <Select showSearch style={{ width: '100%', marginTop: 6 }} value={selectedStore} onChange={setSelectedStore}
            options={[{ value: 'ALL', label: '🌐 All Stores' }, ...stores.map(s => ({ value: s.code, label: s.code }))]} />
        </Col>
        <Col span={4}>
          <div style={S.label}>&nbsp;</div>
          <Button block icon={<ReloadOutlined />} onClick={fetchComparison} loading={loading} style={{ marginTop: 6 }}>
            Refresh
          </Button>
        </Col>
      </Row>

      {/* Dimension picker */}
      <div style={{ marginBottom: 16 }}>
        <Segmented value={dimension} onChange={setDimension}
          options={REPORT_DIMS} style={{ background: 'rgba(15,23,42,0.8)' }} />
      </div>

      {/* Legend */}
      {data && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 24 }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '8px 16px' }}>
            <Text style={{ color: '#93c5fd', fontWeight: 600, fontSize: 12 }}>Period A</Text>
            <div style={{ color: '#e2e8f0', fontSize: 12 }}>{data.period_a}</div>
          </div>
          <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, padding: '8px 16px' }}>
            <Text style={{ color: '#fbbf24', fontWeight: 600, fontSize: 12 }}>Period B</Text>
            <div style={{ color: '#e2e8f0', fontSize: 12 }}>{data.period_b}</div>
          </div>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 16px' }}>
            <Text style={{ color: '#22c55e', fontSize: 12 }}><RiseOutlined /> Positive Δ = Period B is better than A</Text>
          </div>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={rows}
        rowKey="key"
        loading={loading}
        bordered
        size="small"
        pagination={{ pageSize: 50 }}
        scroll={tblScroll}
        style={{ background: 'transparent' }}
        onRow={getBodyRowStyle}
      />
    </div>
  );
};

export default ShopeeAffiliate;

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Card, Typography, Select, DatePicker, Upload, Button,
  Table, message, Space, Row, Col, Tag, Tooltip, Spin, Segmented
} from 'antd';
import {
  InboxOutlined, CheckCircleFilled, MinusCircleFilled,
  ShopOutlined, UploadOutlined, ReloadOutlined,
  DownloadOutlined, BarChartOutlined, FileTextOutlined,
  RiseOutlined, FallOutlined, MinusOutlined
} from '@ant-design/icons';
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
    (async () => {
      try {
        const res = await axios.get(`${API}/stores`);
        setStores(res.data.stores || []);
      } catch { message.error('Gagal memuat daftar toko dari AT1.'); }
      finally { setStoresLoading(false); }
    })();
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
            Sentral integrasi & analisis data Product · Creator · Conversion
          </Text>
        </div>
      </div>

      <Card style={S.card} bodyStyle={{ padding: 0 }}>
        <Tabs size="large" style={{ padding: '0 8px' }} items={[
          { key: 'upload',      label: '① Upload Data',         children: <UploadTab    stores={stores} storesLoading={storesLoading} /> },
          { key: 'checker',     label: '② Checker Matrix',      children: <CheckerTab   stores={stores} /> },
          { key: 'analytics',   label: '③ Analytics',           children: <AnalyticsTab stores={stores} /> },
          { key: 'report',      label: <span><FileTextOutlined /> ④ Laporan Lengkap</span>,    children: <ReportTab    stores={stores} /> },
          { key: 'comparison',  label: <span><BarChartOutlined /> ⑤ Komparasi Periode</span>, children: <ComparisonTab stores={stores} /> },
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
    if (!selectedStore)                          return message.warning('Pilih toko terlebih dahulu.');
    if (!fileList.length)                        return message.warning('Pilih atau tarik file untuk diunggah.');
    if (isConversion && fileList.length > 1)     return message.warning('Conversion: upload 1 file per bulan saja.');

    setUploading(true);
    let ok = 0, fail = 0;
    for (const fo of fileList) {
      const fd = new FormData();
      fd.append('file',       fo.originFileObj);
      fd.append('file_type',  uploadType);
      fd.append('store_id',   selectedStore);
      if (isConversion)                      fd.append('manual_date', selectedMonth.format('YYYY-MM'));
      if (needsManual && manualDate)         fd.append('manual_date', manualDate.format('YYYY-MM-DD'));
      // If neither → backend will auto-detect from filename
      try {
        const res = await axios.post(`${API}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        res.data.succeed ? ok++ : (fail++, message.error(`${fo.name}: ${res.data.message}`));
      } catch (e) {
        fail++;
        message.error(`${fo.name}: ${e.response?.data?.detail || e.message}`);
      }
    }
    if (ok) message.success(`✅ Berhasil memproses ${ok} file!`);
    if (!fail) setFileList([]);
    setUploading(false);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={12}>
            <div style={S.label}>Tipe Data</div>
            <Select style={{ width: '100%', marginTop: 6 }} value={uploadType}
              onChange={v => { setUploadType(v); setFileList([]); }}
              options={[
                { value: 'conversion', label: '📋 Conversion (1 file/bulan)' },
                { value: 'product',    label: '📦 Product (batch)' },
                { value: 'creator',    label: '🎬 Creator (batch)' },
              ]} />
          </Col>
          <Col span={12}>
            <div style={S.label}>Pilih Toko</div>
            <Select showSearch loading={storesLoading} placeholder="Pilih toko Shopee..."
              style={{ width: '100%', marginTop: 6 }} value={selectedStore} onChange={setSelectedStore}
              options={stores.map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }))} />
          </Col>
        </Row>

        {isConversion && (
          <div>
            <div style={S.label}>Bulan Laporan (Conversion)</div>
            <DatePicker picker="month" style={{ width: '100%', marginTop: 6 }}
              value={selectedMonth} onChange={d => d && setSelectedMonth(d)} allowClear={false} />
            <div style={{ ...S.warnBox, marginTop: 10, fontSize: 12, color: '#faad14' }}>
              ⚠️ Data Conversion toko ini untuk bulan dipilih akan <strong>ditimpa</strong> jika upload ulang.
            </div>
          </div>
        )}
        {needsManual && (
          <div>
            <div style={S.label}>
              Tanggal Manual <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional — isi jika nama file sudah diubah)</span>
            </div>
            <DatePicker
              style={{ width: '100%', marginTop: 6 }}
              value={manualDate}
              onChange={setManualDate}
              placeholder="Biarkan kosong untuk deteksi otomatis dari nama file"
              allowClear
            />
            {manualDate
              ? (
                <div style={{ ...S.warnBox, marginTop: 8, fontSize: 12, color: '#faad14' }}>
                  📅 Semua file yang diupload sekarang akan ditandai tanggal <strong>{manualDate.format('DD MMMM YYYY')}</strong>.
                </div>
              ) : (
                <div style={{ ...S.infoBox, color: '#a5b4fc', fontSize: 12, marginTop: 8 }}>
                  💡 Tanggal terdeteksi <strong>otomatis</strong> dari nama file (cth: <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 5px', borderRadius: 4 }}>_20260401</code> atau <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 5px', borderRadius: 4 }}>202604101458</code>). Batch upload diperbolehkan.
                </div>
              )
            }
          </div>
        )}

        <Dragger multiple={!isConversion} fileList={fileList}
          onChange={info => setFileList(info.fileList)} beforeUpload={() => false}
          style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#ff4d4f', fontSize: 36 }} /></p>
          <p style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 500 }}>Klik atau Tarik file CSV ke sini</p>
          <p style={{ color: '#64748b', fontSize: 13 }}>Upload file mentah langsung dari Shopee tanpa diubah strukturnya</p>
        </Dragger>

        <Button type="primary" block size="large" icon={<UploadOutlined />}
          loading={uploading} onClick={handleUpload}
          style={{ background: 'linear-gradient(135deg,#ff4d4f,#ff7a45)', border: 'none', fontWeight: 600, height: 48 }}>
          Mulai Ekstraksi Data (ETL)
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
    } catch { message.error('Gagal menarik Data Checker Matrix.'); }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  const activeStoreCodes = [...new Set(matrixData.flatMap(r => Object.keys(r.stores || {})))].sort();
  const getStoreName = code => { const s = stores.find(x => x.code === code); return s ? s.name.split(' - ').slice(-1)[0] : code; };

  const Tick = ({ val }) => val
    ? <CheckCircleFilled  style={{ color: '#22c55e', fontSize: 15 }} />
    : <MinusCircleFilled  style={{ color: '#1e3a5f', fontSize: 13 }} />;

  const columns = [
    {
      title: 'Tanggal', dataIndex: 'date', fixed: 'left', width: 110,
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
    }))
  ];

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text style={{ color: '#94a3b8' }}>Filter Bulan:</Text>
          <DatePicker picker="month" value={selectedMonth} onChange={d => d && setSelectedMonth(d)} allowClear={false} />
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchMatrix} loading={loading}>Refresh</Button>
      </div>
      <div style={{ fontSize: 12, color: '#475569', marginBottom: 10 }}>
        <CheckCircleFilled style={{ color: '#22c55e' }} /> = Ada data &nbsp;&nbsp;
        <MinusCircleFilled style={{ color: '#1e3a5f' }} /> = Kosong
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
    } catch { message.error('Gagal mengambil Analytics.'); }
    setLoading(false);
  }, [dateRange, selectedStore]);

  useEffect(() => { fetch(); }, [fetch]);

  const maxProd = Math.max(...data.topProducts.map(p => p.gmv || 0), 1);
  const maxCrtr = Math.max(...data.topCreators.map(c => c.gmv || 0), 1);

  const BarRow = ({ rank, label, sub, gmv, max }) => (
    <div style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: '#e2e8f0', fontSize: 13, maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ color: '#64748b', marginRight: 6, fontSize: 11 }}>#{rank}</span>{label}
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
          <div style={S.label}>Rentang Tanggal</div>
          <RangePicker style={{ width: '100%', marginTop: 6 }} value={dateRange} onChange={setDateRange} />
        </Col>
        <Col span={10}>
          <div style={S.label}>Toko</div>
          <Select showSearch style={{ width: '100%', marginTop: 6 }} value={selectedStore} onChange={setSelectedStore}
            options={[{ value: 'ALL', label: '🌐 Semua Toko' }, ...stores.map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }))]} />
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Card title={<span style={{ color: '#e2e8f0' }}>🏆 Top 15 Produk (GMV)</span>} style={{ ...S.card }} bodyStyle={{ padding: '8px 16px' }}>
            {loading ? <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
              : data.topProducts.length ? data.topProducts.map((p, i) => <BarRow key={i} rank={i+1} label={p.name} gmv={p.gmv} max={maxProd} />)
              : <div style={{ textAlign: 'center', padding: 32, color: '#475569' }}>Belum ada data produk</div>}
          </Card>
        </Col>
        <Col span={12}>
          <Card title={<span style={{ color: '#e2e8f0' }}>🎬 Top 15 Creator (GMV)</span>} style={{ ...S.card }} bodyStyle={{ padding: '8px 16px' }}>
            {loading ? <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
              : data.topCreators.length ? data.topCreators.map((c, i) => <BarRow key={i} rank={i+1} label={c.name || c.username} sub={`@${c.username}`} gmv={c.gmv} max={maxCrtr} />)
              : <div style={{ textAlign: 'center', padding: 32, color: '#475569' }}>Belum ada data creator</div>}
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
  { value: 'by_store',   label: '🏪 Per Toko' },
  { value: 'by_creator', label: '🎬 Per Creator' },
  { value: 'by_product', label: '📦 Per Produk' },
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
    } catch { message.error('Gagal memuat laporan.'); }
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
    } catch { message.error('Gagal mengunduh laporan.'); }
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
      numCol('GMV (Rp)', 'gmv', 'Rp '),
      numCol('Komisi (Rp)', 'commission', 'Rp '),
      roiCol(),
      numCol('Unit Terjual', 'units'),
      numCol('Klik', 'clicks'),
      { title: 'Creator', dataIndex: 'creator_count', align: 'right', width: 90, onHeaderCell: getHeaderCell, render: v => <span style={{ color: '#a5b4fc' }}>{v}</span> }
    ];
  } else if (dimension === 'by_creator') {
    columns = [
      { title: 'No', render: (_, __, i) => i+1, width: 50, align: 'center', onHeaderCell: getHeaderCell },
      { title: 'Username', dataIndex: 'username', width: 180, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>@{v}</span> },
      { title: 'Nama Creator', dataIndex: 'name', width: 200, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#e2e8f0' }}>{v}</span> },
      numCol('GMV (Rp)', 'gmv', 'Rp '),
      numCol('Komisi (Rp)', 'commission', 'Rp '),
      roiCol(),
      numCol('Unit Terjual', 'units'),
      numCol('Klik', 'clicks'),
      { title: 'Toko', dataIndex: 'store_count', align: 'right', width: 80, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#fbbf24' }}>{v}</span> },
    ];
  } else if (dimension === 'by_product') {
    columns = [
      { title: 'No', render: (_, __, i) => i+1, width: 50, align: 'center', onHeaderCell: getHeaderCell },
      { title: 'Nama Produk', dataIndex: 'product_name', width: 300, ellipsis: true, onHeaderCell: getHeaderCell,
        render: v => <Tooltip title={v}><span style={{ color: '#e2e8f0' }}>{v}</span></Tooltip> },
      numCol('Total GMV (Rp)', 'gmv', 'Rp '),
      numCol('Komisi (Rp)', 'commission', 'Rp '),
      roiCol(),
      numCol('Total Order', 'orders'),
      { title: 'Creator', dataIndex: 'creator_count', align: 'right', width: 80, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#fbbf24' }}>{v}</span> },
    ];
  }

  // Creator sub-table for by_product
  const expandedRow = record => {
    const subCols = [
      { title: 'Username', dataIndex: 'username', width: 180, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#a5b4fc' }}>@{v}</span> },
      { title: 'Nama Creator', dataIndex: 'name', width: 200, onHeaderCell: getHeaderCell },
      { title: 'GMV (Rp)', dataIndex: 'gmv', align: 'right', width: 150, onHeaderCell: getHeaderCell,
        render: v => <span style={{ color: '#22c55e', fontFamily: 'monospace' }}>Rp {fmtRp(v)}</span> },
      { title: 'Komisi (Rp)', dataIndex: 'commission', align: 'right', width: 150, onHeaderCell: getHeaderCell,
        render: v => <span style={{ fontFamily: 'monospace' }}>Rp {fmtRp(v)}</span> },
      { title: 'Order', dataIndex: 'orders', align: 'right', width: 90, onHeaderCell: getHeaderCell },
    ];
    return (
      <div style={{ padding: '8px 32px', background: 'rgba(10,20,35,0.8)' }}>
        <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 8, display: 'block' }}>Creator yang mendrive produk ini:</Text>
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
          <div style={S.label}>Rentang Tanggal</div>
          <RangePicker style={{ width: '100%', marginTop: 6 }} value={dateRange} onChange={setDateRange} />
        </Col>
        <Col span={8}>
          <div style={S.label}>Toko</div>
          <Select showSearch style={{ width: '100%', marginTop: 6 }} value={selectedStore} onChange={setSelectedStore}
            options={[{ value: 'ALL', label: '🌐 Semua Toko' }, ...stores.map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }))]} />
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
          {data.length} baris · {dateRange?.[0]?.format('DD MMM')} – {dateRange?.[1]?.format('DD MMM YYYY')}
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
    } catch { message.error('Gagal memuat data komparasi.'); }
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

  const metricCols = (metricKey, label) => [
    {
      title: <span style={{ color: '#93c5fd' }}>{label} A</span>,
      align: 'right', width: 140, onHeaderCell: getHeaderCell,
      render: r => <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>Rp {fmtRp(r[`a_${metricKey}`])}</span>
    },
    {
      title: <span style={{ color: '#fbbf24' }}>{label} B</span>,
      align: 'right', width: 140, onHeaderCell: getHeaderCell,
      render: r => <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>Rp {fmtRp(r[`b_${metricKey}`])}</span>
    },
    {
      title: <span style={{ color: '#a5b4fc' }}>Δ {label}</span>,
      align: 'center', width: 110, onHeaderCell: getHeaderCell,
      sorter: (a, b) => (a[`delta_${metricKey}`] || -999) - (b[`delta_${metricKey}`] || -999),
      render: r => <DeltaBadge val={r[`delta_${metricKey}`]} />
    }
  ];

  const labelCol = dimension === 'by_store'
    ? { title: 'Store ID',  render: r => <Tag color="blue">{r.label}</Tag>, width: 140 }
    : dimension === 'by_creator'
    ? { title: 'Creator',   render: r => <span style={{ color: '#e2e8f0' }}>{r.label}</span>, width: 240 }
    : { title: 'Produk',    render: r => <Tooltip title={r.label}><span style={{ color: '#e2e8f0' }}>{r.label}</span></Tooltip>, width: 280, ellipsis: true };

  const columns = [
    { title: 'No', render: (_, __, i) => i+1, width: 45, align: 'center', onHeaderCell: getHeaderCell },
    { ...labelCol, onHeaderCell: getHeaderCell },
    ...metricCols('gmv',        'GMV'),
    ...metricCols('commission', 'Komisi'),
    ...metricCols('units',      'Unit'),
    ...metricCols('clicks',     'Klik'),
  ];

  const rows = data?.rows || [];

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Period pickers */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={7}>
          <div style={S.label}>📅 Periode A (Pembanding)</div>
          <RangePicker style={{ width: '100%', marginTop: 6 }} value={periodA} onChange={setPeriodA}
            placeholder={['A Start', 'A End']} />
        </Col>
        <Col span={7}>
          <div style={S.label}>📅 Periode B (Acuan)</div>
          <RangePicker style={{ width: '100%', marginTop: 6 }} value={periodB} onChange={setPeriodB}
            placeholder={['B Start', 'B End']} />
        </Col>
        <Col span={6}>
          <div style={S.label}>Toko</div>
          <Select showSearch style={{ width: '100%', marginTop: 6 }} value={selectedStore} onChange={setSelectedStore}
            options={[{ value: 'ALL', label: '🌐 Semua Toko' }, ...stores.map(s => ({ value: s.code, label: s.code }))]} />
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
            <Text style={{ color: '#93c5fd', fontWeight: 600, fontSize: 12 }}>Periode A</Text>
            <div style={{ color: '#e2e8f0', fontSize: 12 }}>{data.period_a}</div>
          </div>
          <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, padding: '8px 16px' }}>
            <Text style={{ color: '#fbbf24', fontWeight: 600, fontSize: 12 }}>Periode B</Text>
            <div style={{ color: '#e2e8f0', fontSize: 12 }}>{data.period_b}</div>
          </div>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 16px' }}>
            <Text style={{ color: '#22c55e', fontSize: 12 }}><RiseOutlined /> Δ positif = Periode A lebih baik dari B</Text>
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

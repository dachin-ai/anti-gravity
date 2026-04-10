import React, { useState, useEffect } from 'react';
import { 
  Tabs, Card, Typography, Select, DatePicker, Upload, Button, 
  Table, message, RangePicker, Space, Row, Col, Statistic, Tag 
} from 'antd';
import { InboxOutlined, CheckCircleFilled, CloseCircleFilled, ShopOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { RangePicker: AntRangePicker } = DatePicker;

const API_BASE_URL = 'http://localhost:8000/api/shopee-affiliate';

const ShopeeAffiliate = () => {
  const [stores, setStores] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  
  // Fetch Stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/stores`);
        setStores(response.data.stores || []);
      } catch (error) {
        message.error('Gagal mengambil daftar toko dari Google Sheets.');
      }
    };
    fetchStores();
  }, []);

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#ff4d4f' }}>
          <ShopOutlined /> Shopee Affiliate Hub
        </Title>
        <Text type="secondary">Sentral integrasi data Product, Creator, dan Conversion dari Shopee Affiliate.</Text>
      </div>

      <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          items={[
            {
              key: 'upload',
              label: '1. Uploader',
              children: <UploadTab stores={stores} />
            },
            {
              key: 'checker',
              label: '2. Data Checker Matrix',
              children: <CheckerTab stores={stores} />
            },
            {
              key: 'analytics',
              label: '3. Analytics Dashboard',
              children: <AnalyticsTab stores={stores} />
            }
          ]}
        />
      </Card>
    </div>
  );
};

// --- 1. Uploader Tab ---
const UploadTab = ({ stores }) => {
  const [uploadType, setUploadType] = useState('product');
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);

  const handleUpload = async () => {
    if (!selectedStore) {
      return message.warning('Silakan pilih toko terlebih dahulu.');
    }
    if (fileList.length === 0) {
      return message.warning('Silakan pilih atau tarik file untuk diunggah.');
    }
    
    // For conversion, ensure only 1 file is uploaded at a time
    if (uploadType === 'conversion' && fileList.length > 1) {
      return message.warning('Untuk Conversion, silakan upload 1 file saja per bulan.');
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const fileObj of fileList) {
      const file = fileObj.originFileObj;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', uploadType);
      formData.append('store_id', selectedStore);
      
      if (uploadType === 'conversion') {
          formData.append('manual_date', selectedMonth.format('YYYY-MM'));
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data.succeed) {
          successCount++;
        } else {
          failCount++;
          message.error(`Gagal memproses file ${file.name}: ${response.data.message}`);
        }
      } catch (error) {
        failCount++;
        message.error(`Error file ${file.name}: ${error.response?.data?.detail || error.message}`);
      }
    }

    if (successCount > 0) message.success(`Berhasil memproses ${successCount} file!`);
    if (failCount === 0 && successCount > 0) setFileList([]);
    setUploading(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text strong>Tipe Data:</Text>
            <br />
            <Select 
              style={{ width: '100%', marginTop: 8 }}
              value={uploadType} 
              onChange={setUploadType}
              options={[
                { value: 'product', label: 'Produk (Batch - Max 30 files)' },
                { value: 'creator', label: 'Creator (Batch - Max 30 files)' },
                { value: 'conversion', label: 'Conversion (Single File per Month)' }
              ]}
            />
          </Col>
          <Col span={12}>
            <Text strong>Pilih Toko:</Text>
            <br />
            <Select 
              showSearch
              placeholder="Cari toko berdasarkan dari AT1..."
              style={{ width: '100%', marginTop: 8 }}
              value={selectedStore} 
              onChange={setSelectedStore}
              options={stores.map(s => ({ value: s.code, label: s.name }))}
            />
          </Col>
        </Row>

        {uploadType === 'conversion' && (
          <div>
            <Text strong>Pilih Bulan Laporan (Khusus Conversion):</Text>
            <br />
            <DatePicker 
              picker="month" 
              style={{ width: '100%', marginTop: 8 }} 
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              * Data conversion di database untuk Toko x Bulan ini akan dihapus/ditimpa jika Anda mengupload ulang.
            </Text>
          </div>
        )}
        
        {uploadType !== 'conversion' && (
          <div style={{ padding: '8px 12px', background: '#e6f7ff', borderLeft: '4px solid #1890ff' }}>
            <Text>💡 Sistem akan otomatis melacak tanggal masing-masing file melalui pola (contoh: <code>_20260401</code>).</Text>
          </div>
        )}

        <Dragger 
          multiple={uploadType !== 'conversion'} 
          fileList={fileList}
          onChange={(info) => setFileList(info.fileList)}
          beforeUpload={() => false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#ff4d4f' }} />
          </p>
          <p className="ant-upload-text">Klik atau Tarik file CSV/Excel ke area ini</p>
          <p className="ant-upload-hint">
            Mohon unggah file mentah langsung dari Shopee tanpa diubah strukturnya.
          </p>
        </Dragger>

        <Button 
          type="primary" 
          block 
          size="large" 
          icon={<UploadOutlined />} 
          loading={uploading}
          onClick={handleUpload}
          style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}
        >
          Mulai Ekstraksi Data (ETL)
        </Button>
      </Space>
    </div>
  );
};

// --- 2. Checker Matrix Tab ---
const CheckerTab = ({ stores }) => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [matrixData, setMatrixData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const year = selectedMonth.format('YYYY');
      const month = selectedMonth.format('MM');
      const response = await axios.get(`${API_BASE_URL}/checker-matrix`, { params: { year, month } });
      setMatrixData(response.data.matrix || []);
    } catch (error) {
      message.error("Gagal menarik data checker matrix.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatrix();
  }, [selectedMonth]);

  // Dynamically build columns based on stores that have data, or show all top AT1 stores if preferred.
  // We'll show columns for stores that are present in the AT1 sheet (limited to make it legible maybe? Or just dynamic).
  // Dynamic approach: get all store keys across all dates.
  const activeStoreCodes = new Set();
  matrixData.forEach(row => {
    Object.keys(row.stores || {}).forEach(k => activeStoreCodes.add(k));
  });

  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
      fixed: 'left',
      width: 120,
      render: (text) => <strong>{dayjs(text).format('DD MMM')}</strong>,
    }
  ];

  const getStoreName = (code) => {
    const s = stores.find(x => x.code === code);
    return s ? s.name.split(' - ')[0] : code; // Shorten display name
  };

  Array.from(activeStoreCodes).sort().forEach(code => {
    columns.push({
      title: getStoreName(code),
      children: [
        {
          title: 'Prod',
          align: 'center',
          render: (_, record) => {
             const val = record.stores[code]?.product;
             return val ? <CheckCircleFilled style={{ color: '#52c41a' }}/> : <CloseCircleFilled style={{ color: '#ff4d4f', opacity: 0.2 }}/>;
          }
        },
        {
          title: 'Crtr',
          align: 'center',
          render: (_, record) => {
             const val = record.stores[code]?.creator;
             return val ? <CheckCircleFilled style={{ color: '#52c41a' }}/> : <CloseCircleFilled style={{ color: '#ff4d4f', opacity: 0.2 }}/>;
          }
        },
        {
          title: 'Conv',
          align: 'center',
          render: (_, record) => {
             const val = record.stores[code]?.conversion;
             return val ? <CheckCircleFilled style={{ color: '#1890ff' }}/> : <CloseCircleFilled style={{ color: '#ff4d4f', opacity: 0.2 }}/>;
          }
        }
      ]
    });
  });

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Text strong>Filter Bulan Validation:</Text>
          <DatePicker 
            picker="month" 
            value={selectedMonth} 
            onChange={(d) => { if(d) setSelectedMonth(d) }} 
            allowClear={false}
          />
        </Space>
        <Button onClick={fetchMatrix} loading={loading}>Refresh Matrix</Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={matrixData} 
        rowKey="date" 
        loading={loading}
        bordered
        size="small"
        pagination={false}
        scroll={{ x: 'max-content', y: 500 }}
      />
    </div>
  );
};

// --- 3. Analytics Dashboard Tab ---
const AnalyticsTab = ({ stores }) => {
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [data, setData] = useState({ topProducts: [], topCreators: [] });
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    if (!dateRange || dateRange.length !== 2) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics`, {
        params: {
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD'),
          store_id: selectedStore
        }
      });
      setData(response.data);
    } catch (error) {
      message.error('Gagal mengambil data analytics.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedStore]);

  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);

  return (
    <div>
      <Card style={{ marginBottom: 24, background: '#fafafa', border: '1px solid #f0f0f0' }}>
        <Row gutter={24}>
          <Col span={12}>
            <Text strong>Rentang Waktu Laporan:</Text>
            <br />
            <AntRangePicker 
              style={{ width: '100%', marginTop: 8 }} 
              value={dateRange}
              onChange={setDateRange}
            />
          </Col>
          <Col span={12}>
            <Text strong>Pilih Toko:</Text>
            <br />
            <Select 
              showSearch
              style={{ width: '100%', marginTop: 8 }}
              value={selectedStore} 
              onChange={setSelectedStore}
              options={[{ value: 'ALL', label: 'Semua Toko' }, ...stores.map(s => ({ value: s.code, label: s.name }))]}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        <Col span={12}>
          <Card title="Top 15 Produk" bordered={false} bodyStyle={{ padding: 0 }}>
            <Table 
              dataSource={data.topProducts} 
              loading={loading}
              rowKey="name" 
              pagination={false}
              size="small"
              columns={[
                { title: 'Nama Produk', dataIndex: 'name', key: 'name', ellipsis: true },
                { title: 'Total GMV', dataIndex: 'gmv', key: 'gmv', align: 'right', render: formatRp }
              ]}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Top 15 Creator" bordered={false} bodyStyle={{ padding: 0 }}>
            <Table 
              dataSource={data.topCreators} 
              loading={loading}
              rowKey="username" 
              pagination={false}
              size="small"
              columns={[
                { title: 'Creator', dataIndex: 'name', key: 'name', render: (t, r) => <span><Text strong>{t || r.username}</Text><br/><Text type="secondary" style={{fontSize: 12}}>@{r.username}</Text></span> },
                { title: 'Total GMV', dataIndex: 'gmv', key: 'gmv', align: 'right', render: formatRp }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ShopeeAffiliate;

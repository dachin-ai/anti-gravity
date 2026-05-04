import React, { useState } from 'react';
import {
    Typography, Button, Row, Col, Upload, message, Spin, Divider, Table
} from 'antd';
import {
    InboxOutlined, CloudUploadOutlined, FileExcelOutlined,
    ShoppingCartOutlined, CheckCircleOutlined, CodeSandboxOutlined,
    SettingOutlined, FolderOpenOutlined, FileTextOutlined, TableOutlined
} from '@ant-design/icons';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Bi from '../components/Bi';
import PageHeader from '../components/PageHeader';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const SectionHeading = ({ icon, children, color = '#ec4899' }) => (
    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 28, height: 28, borderRadius: 6, background: `${color}20`, border: `1px solid ${color}35`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: 14, flexShrink: 0 }}>{icon}</span>
        {children}
    </div>
);

const PreSalesEstimation = () => {
    const { t } = useTranslation();
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { logActivity } = useAuth();

    const handleUpload = async () => {
        if (!fileList.length) {
            message.warning(t('preSales.uploadWarn'));
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
            <PageHeader
                title={<Bi i18nKey="preSales.title" />}
                subtitle={<Bi i18nKey="preSales.subtitle" />}
                accent="#ec4899"
            />

            <Row gutter={24}>
                <Col xs={24} md={8}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                         <SectionHeading icon={<SettingOutlined />}><Bi i18nKey="preSales.engine" /></SectionHeading>
                         <Text style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 16 }}>
                            <Bi i18nKey="preSales.engineIntro" />
                         </Text>
                         <ul style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 20, margin: 0 }}>
                            <li style={{ marginBottom: 6 }}><Bi i18nKey="preSales.li1" /></li>
                            <li style={{ marginBottom: 6 }}><Bi i18nKey="preSales.li2" /></li>
                            <li style={{ marginBottom: 6 }}><Bi i18nKey="preSales.li3" /></li>
                            <li style={{ marginBottom: 0 }}><Bi i18nKey="preSales.li4" /></li>
                         </ul>
                    </div>
                </Col>

                <Col xs={24} md={16}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
                        <SectionHeading icon={<FolderOpenOutlined />}><Bi i18nKey="preSales.uploadFile" /></SectionHeading>
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
                                    <Button type="text" size="small" danger onClick={remove} style={{ fontSize: 12, color: '#ef4444' }}><Bi i18nKey="preSales.remove" /></Button>
                                </div>
                            )}
                        >
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#001F3F' }} /></p>
                            <p className="ant-upload-text" style={{ color: 'var(--text-main)', fontSize: 16 }}><Bi i18nKey="preSales.uploadHint" /></p>
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
                            {loading ? <Bi i18nKey="preSales.initPipeline" /> : <Bi i18nKey="preSales.generateDist" />}
                        </Button>
                    </div>

                    {result && !loading && (
                        <div style={{ marginTop: 32 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />
                            <SectionHeading icon={<FileTextOutlined />}><Bi i18nKey="preSales.execSummary" /></SectionHeading>

                            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                <Col xs={24} md={8}>
                                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}><ShoppingCartOutlined/> <Bi i18nKey="preSales.ordersFound" /></div>
                                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)' }}>{result.summary.orders_found.toLocaleString()}</div>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}><CheckCircleOutlined/> <Bi i18nKey="preSales.validSkus" /></div>
                                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)' }}>{result.summary.valid_skus.toLocaleString()}</div>
                                    </div>
                                </Col>
                                <Col xs={24} md={8}>
                                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}><CodeSandboxOutlined/> <Bi i18nKey="preSales.totalVolume" /></div>
                                        <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{result.summary.total_volume.toLocaleString()}</div>
                                    </div>
                                </Col>
                            </Row>

                            <SectionHeading icon={<TableOutlined />}><Bi i18nKey="preSales.matrixPreview" /></SectionHeading>
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
                                <Bi i18nKey="preSales.exportReport" />
                            </Button>
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    );
};

export default PreSalesEstimation;

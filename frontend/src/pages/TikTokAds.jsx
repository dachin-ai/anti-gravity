import React, { useState } from 'react';
import {
    Typography, Button, Row, Col, Upload, message, Divider, Table, Tabs
} from 'antd';
import {
    InboxOutlined, CloudUploadOutlined, FileExcelOutlined,
    InfoCircleOutlined, FolderOpenOutlined, BarChartOutlined
} from '@ant-design/icons';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
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

const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

const TikTokAds = () => {
    const { t } = useTranslation();
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { logActivity } = useAuth();

    const handleUpload = async () => {
        if (!fileList.length) {
            message.warning(t('tiktokAds.uploadWarn'));
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const filesPayload = [];
            for (const file of fileList) {
                const b64 = await getBase64(file.originFileObj || file);
                filesPayload.push({
                    filename: file.name,
                    content_b64: b64
                });
            }

            const res = await api.post('/tiktok-ads/analyze', {
                files: filesPayload,
            });

            setResult(res.data);
            message.success(t('tiktokAds.analysisComplete'));
            logActivity('TikTok Ads Analysis');
        } catch (err) {
            message.error(err.response?.data?.detail || t('tiktokAds.calcFail'));
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!result?.file_base64 || !result?.file_name) return;
        const bytes = atob(result.file_base64);
        const buf = new Uint8Array(bytes.length).map((_, i) => bytes.charCodeAt(i));
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: result.file_name }).click();
    };

    const beforeUpload = (file, fileListNew) => {
        // Keep only the latest uploader snapshot to prevent duplicated entries.
        const deduped = [];
        const seen = new Set();
        for (const f of fileListNew) {
            const key = `${f.name}-${f.size}-${f.lastModified}`;
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(f);
            }
        }
        setFileList(deduped);
        return false;
    };

    const onRemove = (file) => {
        setFileList(prev => prev.filter(f => f.uid !== file.uid));
    };

    const renderPreviewTable = (tableData) => {
        if (!tableData || !tableData.columns || !tableData.rows) return null;
        
        // Take top 10 rows for preview
        const previewRows = tableData.rows.slice(0, 10);
        const columns = tableData.columns.map(col => ({
            title: col,
            dataIndex: col,
            key: col,
            ellipsis: true,
            width: 120
        }));

        return (
            <Table
                columns={columns}
                dataSource={previewRows.map((r, i) => ({ ...r, key: i }))}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
                style={{ marginBottom: 16 }}
            />
        );
    };

    return (
        <div>
            <PageHeader
                title={<Bi i18nKey="tiktokAds.title" />}
                subtitle={<Bi i18nKey="tiktokAds.subtitle" />}
                accent="#ec4899"
            />

            <Row gutter={24}>
                <Col xs={24} md={6}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                         <SectionHeading icon={<InfoCircleOutlined />}><Bi i18nKey="tiktokAds.instructions" /></SectionHeading>
                         <Text style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>
                            <Bi i18nKey="tiktokAds.instrBody" />
                         </Text>
                        <div style={{ marginTop: 24, padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Text strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 10 }}>
                                <Bi i18nKey="tiktokAds.analysisMode" />
                            </Text>
                            <Text style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 10 }}>
                                {t('tiktokAds.analysisModeHelp')}
                            </Text>
                         </div>
                    </div>
                </Col>

                <Col xs={24} md={18}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
                        <SectionHeading icon={<FolderOpenOutlined />}><Bi i18nKey="tiktokAds.uploadData" /></SectionHeading>
                        <Dragger
                            multiple
                            beforeUpload={beforeUpload}
                            onRemove={onRemove}
                            fileList={fileList}
                            style={{ borderRadius: 8, marginBottom: 24, padding: '20px 0' }}
                        >
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#ec4899' }} /></p>
                            <p className="ant-upload-text" style={{ color: 'var(--text-main)', fontSize: 16 }}>
                                <Bi i18nKey="tiktokAds.uploadHint" />
                            </p>
                            <p className="ant-upload-hint" style={{ color: 'var(--text-muted)' }}>
                                <Bi i18nKey="tiktokAds.bulkHint" />
                            </p>
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
                            {loading ? t('tiktokAds.processingData') : t('tiktokAds.analyzeBtn')}
                        </Button>
                    </div>

                    {result && !loading && (
                        <div style={{ marginTop: 24 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />
                            <SectionHeading icon={<BarChartOutlined />}><Bi i18nKey="tiktokAds.preview" /></SectionHeading>

                            <Tabs
                                items={[
                                    {
                                        key: 'summary',
                                        label: 'Summary',
                                        children: (
                                            <div style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                                                {renderPreviewTable(result.summary)}
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'top10',
                                        label: 'Top 10 Revenue',
                                        children: (
                                            <Row gutter={16}>
                                                <Col xs={24} xl={8}>
                                                    <div style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 12 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Top 10 Product Card Revenue</div>
                                                        {renderPreviewTable(result.top_card)}
                                                    </div>
                                                </Col>
                                                <Col xs={24} xl={8}>
                                                    <div style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 12 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Top 10 Video Revenue</div>
                                                        {renderPreviewTable(result.top_video)}
                                                    </div>
                                                </Col>
                                                <Col xs={24} xl={8}>
                                                    <div style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 12 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>Top 10 Overall Revenue</div>
                                                        {renderPreviewTable(result.top_overall)}
                                                    </div>
                                                </Col>
                                            </Row>
                                        ),
                                    },
                                    {
                                        key: 'active-zero',
                                        label: 'Active Zero Revenue',
                                        children: (
                                            <div style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                                                {renderPreviewTable(result.active_zero)}
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'excluded-zero',
                                        label: 'Excluded Zero Revenue',
                                        children: (
                                            <div style={{ background: 'var(--bg-panel)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                                                {renderPreviewTable(result.excluded_zero)}
                                            </div>
                                        ),
                                    },
                                ]}
                            />

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
                                Download Excel Report
                            </Button>
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    );
};

export default TikTokAds;

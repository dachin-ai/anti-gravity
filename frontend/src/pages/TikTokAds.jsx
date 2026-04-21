import React, { useState } from 'react';
import {
    Typography, Button, Row, Col, Upload, message, Divider, Table, Tabs
} from 'antd';
import {
    InboxOutlined, CloudUploadOutlined, FileExcelOutlined,
    InfoCircleOutlined, FolderOpenOutlined, BarChartOutlined
} from '@ant-design/icons';
import api from '../api';
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
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { logActivity } = useAuth();

    const handleUpload = async () => {
        if (!fileList.length) {
            message.warning('Please upload at least one TikTok Ads Export file (.csv or .xlsx)');
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
            message.success('Analysis complete!');
            logActivity('TikTok Ads Analysis');
        } catch (err) {
            message.error(err.response?.data?.detail || 'Calculation failed. Please check the file structure.');
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
                title={<Bi e="Ads Analyzer" c="广告分析" />}
                subtitle={<Bi e="Analyze and consolidate your TikTok Ads performance data" c="分析并整合您的 TikTok Ads 表现数据" />}
                accent="#ec4899"
            />

            <Row gutter={24}>
                <Col xs={24} md={6}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
                         <SectionHeading icon={<InfoCircleOutlined />}><Bi e="Instructions" c="操作说明" /></SectionHeading>
                         <Text style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>
                            <Bi e="Upload your exported TikTok Ads performance reports. You can upload multiple files at once." c="上传您的 TikTok Ads 表现报告，支持同时上传多个文件。" />
                         </Text>
                        <div style={{ marginTop: 24, padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Text strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 10 }}>
                                <Bi e="Analysis Mode" c="分析模式" />
                            </Text>
                            <Text style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 10 }}>
                                Aggregate mode combines all uploaded files into one summary.
                            </Text>
                         </div>
                    </div>
                </Col>

                <Col xs={24} md={18}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px' }}>
                        <SectionHeading icon={<FolderOpenOutlined />}><Bi e="Upload Data Export" c="上传数据" /></SectionHeading>
                        <Dragger
                            multiple
                            beforeUpload={beforeUpload}
                            onRemove={onRemove}
                            fileList={fileList}
                            style={{ borderRadius: 8, marginBottom: 24, padding: '20px 0' }}
                        >
                            <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#ec4899' }} /></p>
                            <p className="ant-upload-text" style={{ color: 'var(--text-main)', fontSize: 16 }}>
                                <Bi e="Click or drag TikTok Ads files here" c="点击或拖拽 TikTok Ads 文件到此处" />
                            </p>
                            <p className="ant-upload-hint" style={{ color: 'var(--text-muted)' }}>
                                <Bi e="Support for a single or bulk upload." c="支持单个或批量上传" />
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
                            {loading ? 'Processing Data...' : 'Analyze Ads Data'}
                        </Button>
                    </div>

                    {result && !loading && (
                        <div style={{ marginTop: 24 }}>
                            <Divider style={{ borderColor: 'var(--border)' }} />
                            <SectionHeading icon={<BarChartOutlined />}><Bi e="Preview Results" c="结果预览" /></SectionHeading>

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

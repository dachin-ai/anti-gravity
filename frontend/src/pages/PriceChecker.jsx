import React, { useState } from 'react';
import { Tabs, Card, Button, Input, InputNumber, Row, Col, Typography, Table, Upload, message, Spin, Alert } from 'antd';
import { InboxOutlined, SyncOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const PriceChecker = () => {
    const [method, setMethod] = useState("Listing");
    const [loadingDb, setLoadingDb] = useState(false);
    const [calcLoading, setCalcLoading] = useState(false);
    
    // Direct Input State
    const [skuInput, setSkuInput] = useState('');
    const [targetPrice, setTargetPrice] = useState(0);
    const [directResult, setDirectResult] = useState(null);

    // Batch File State
    const [fileList, setFileList] = useState([]);

    const fetchReferenceData = async () => {
        setLoadingDb(true);
        try {
            const res = await api.get('/price-checker/refresh');
            message.success(`Data Sheet terhubung! (${res.data.records} SKU Pricing dimuat)`);
        } catch (error) {
            message.error('Gagal mengambil data dari Google Sheets');
        } finally {
            setLoadingDb(false);
        }
    };

    const downloadTemplate = async (templateMethod) => {
        try {
            const response = await api.get(`/price-checker/template/${templateMethod}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Price_Checker_${templateMethod}_Template.xlsx`);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            message.error('Failed to download template');
        }
    };

    const doCalculateDirect = async () => {
        if (!skuInput) {
            message.warning("Please enter SKU first");
            return;
        }
        setCalcLoading(true);
        try {
            const res = await api.post('/price-checker/calculate-direct', {
                sku_string: skuInput,
                target_price: targetPrice
            });
            setDirectResult(res.data);
        } catch (error) {
            message.error('Calculation failed');
        } finally {
            setCalcLoading(false);
        }
    };

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning("Please upload a file");
            return;
        }
        const formData = new FormData();
        formData.append('file', fileList[0]);
        formData.append('method', method);

        setCalcLoading(true);
        try {
            const response = await api.post('/price-checker/calculate-batch', formData, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Price_Check_${method}_Result.xlsx`);
            document.body.appendChild(link);
            link.click();
            message.success("Batch calculation complete! File downloaded.");
        } catch (error) {
            message.error('Batch calculation failed');
        } finally {
            setCalcLoading(false);
        }
    };

    const evaluationColumns = [
        { title: 'Price Tier', dataIndex: 'Tier', key: 'Tier' },
        { title: 'System Price', dataIndex: 'SystemPrice', key: 'SystemPrice' },
        { title: 'Target Price', dataIndex: 'TargetPrice', key: 'TargetPrice' },
        { title: 'Gap (Margin)', dataIndex: 'Gap', key: 'Gap', render: (text) => <Text type={text === 'Invalid' ? 'secondary' : text < 0 ? "danger" : "success"}>{text}</Text> },
        { title: 'Status', dataIndex: 'Status', key: 'Status' }
    ];

    const breakdownColumns = [
        { title: 'SKU', dataIndex: 'SKU', key: 'SKU' },
        { title: 'Product Name', dataIndex: 'Product Name', key: 'Product Name' },
        { title: 'Base Price', dataIndex: 'Base Price (Warning)', key: 'Base Price (Warning)' },
        { title: 'Logic Applied', dataIndex: 'Logic Applied', key: 'Logic Applied' },
        { title: 'Contribution', dataIndex: 'Total Contribution (IDR)', key: 'Total Contribution (IDR)' }
    ];

    return (
        <div style={{ padding: 24 }} className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>🏷️ Price Checker & Comparator</Title>
                <Button type="primary" icon={<SyncOutlined />} onClick={fetchReferenceData} loading={loadingDb} size="large" style={{ borderRadius: 8 }}>
                    Refresh Data Reference
                </Button>
            </div>
            
            <Alert 
                message={<span style={{ fontWeight: 600 }}>Operational Guidelines</span>}
                description="Supports 3 Methods: Listing (Merge ID), SKU (File Batch), & Direct Input (Real-time). Robust calculation including Gift Logic, Fallback SKU, and Detailed SKU Info." 
                type="info" 
                showIcon 
                style={{ marginBottom: 24, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', border: '1px solid var(--primary)', color: 'var(--text-main)' }} 
            />

            <Tabs 
                activeKey={method} 
                onChange={(key) => {setMethod(key); setFileList([]); setDirectResult(null);}}
                type="card"
                items={[
                    { label: '📋 Listing Method', key: 'Listing' },
                    { label: '📦 SKU Batch Mode', key: 'SKU' },
                    { label: '⚡ Direct Input', key: 'Direct' }
                ]}
            />

            <Card bordered={false} className="glass-card" style={{ marginTop: 8 }}>
                {method !== "Direct" && (
                    <Row gutter={[24, 24]}>
                        <Col span={12}>
                            <Card title="1️⃣ Download Template" size="small" className="glass-card" bordered={false}>
                                <Button 
                                    type="dashed" 
                                    icon={<CloudDownloadOutlined />} 
                                    block 
                                    onClick={() => downloadTemplate(method)}
                                    style={{ height: 50, fontWeight: 600, borderColor: 'var(--primary)', color: 'var(--primary)' }}
                                >
                                    Download {method} Template
                                </Button>
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card title={`2️⃣ Upload & Process (${method})`} size="small" className="glass-card" bordered={false}>
                                <Dragger 
                                    maxCount={1}
                                    beforeUpload={(file) => {
                                        setFileList([file]);
                                        return false;
                                    }}
                                    onRemove={() => setFileList([])}
                                    fileList={fileList}
                                    style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--glass-border)' }}
                                >
                                    <p className="ant-upload-drag-icon" style={{ color: 'var(--primary)' }}><InboxOutlined /></p>
                                    <p className="ant-upload-text" style={{ color: 'var(--text-muted)' }}>Click or drag Excel file to this area</p>
                                </Dragger>
                                <Button 
                                    type="primary" 
                                    block 
                                    style={{ marginTop: 16, height: 40, fontWeight: 600 }} 
                                    loading={calcLoading} 
                                    onClick={handleUpload}
                                >
                                    Start Batch Calculation
                                </Button>
                            </Card>
                        </Col>
                    </Row>
                )}

                {method === "Direct" && (
                    <>
                        <Row gutter={[16, 16]}>
                            <Col span={16}>
                                <div>
                                    <Text strong style={{ color: 'var(--text-muted)' }}>Enter Bundle SKU (Separate with + or ,)</Text>
                                    <Input 
                                        size="large"
                                        placeholder="Example: SKU_A + SKU_B + SKU_C" 
                                        value={skuInput} 
                                        onChange={e => setSkuInput(e.target.value)} 
                                        style={{ marginTop: 8, borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}
                                    />
                                </div>
                            </Col>
                            <Col span={8}>
                                <div>
                                    <Text strong style={{ color: 'var(--text-muted)' }}>Target Price (IDR)</Text><br/>
                                    <InputNumber 
                                        size="large"
                                        style={{ width: '100%', marginTop: 8, borderRadius: 8, background: 'rgba(0,0,0,0.2)' }} 
                                        min={0} 
                                        step={1000} 
                                        value={targetPrice} 
                                        onChange={setTargetPrice} 
                                    />
                                </div>
                            </Col>
                        </Row>
                        <Button type="primary" size="large" style={{ marginTop: 24, fontWeight: 600, borderRadius: 8 }} loading={calcLoading} onClick={doCalculateDirect}>
                            Calculate Real-time
                        </Button>

                        {calcLoading && <div style={{ textAlign: 'center', marginTop: 30 }}><Spin size="large" /></div>}

                        {directResult && (
                            <div style={{ marginTop: 32 }}>
                                <Title level={4} style={{ fontFamily: "'Outfit', sans-serif" }}>📊 Bundle Rule Summary</Title>
                                <Row gutter={16} style={{ marginBottom: 24 }}>
                                    <Col span={8}>
                                        <Card size="small" className="glass-card" style={{textAlign: 'center'}}>
                                            <Title level={2} style={{margin: 0, color: 'var(--primary)'}}>{Number(directResult.summary.bundle_discount) * 100}%</Title>
                                            <Text type="secondary" strong>Bundle Discount</Text>
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card size="small" className="glass-card" style={{textAlign: 'center'}}>
                                            <Title level={2} style={{margin: 0, color: '#ec4899'}}>{directResult.summary.clearance}</Title>
                                            <Text type="secondary" strong>Clearance Status</Text>
                                        </Card>
                                    </Col>
                                    <Col span={8}>
                                        <Card size="small" className="glass-card" style={{textAlign: 'center'}}>
                                            <Title level={2} style={{margin: 0, color: '#10b981'}}>{directResult.summary.gift}</Title>
                                            <Text type="secondary" strong>Gift Status</Text>
                                        </Card>
                                    </Col>
                                </Row>

                                <Title level={4} style={{ marginTop: 24, fontFamily: "'Outfit', sans-serif" }}>🧩 Price Composition Breakdown</Title>
                                <div className="glass-card" style={{ overflow: 'hidden', padding: 8 }}>
                                    <Table 
                                        dataSource={directResult.breakdown} 
                                        columns={breakdownColumns} 
                                        pagination={false} 
                                        size="middle" 
                                        rowKey="SKU"
                                    />
                                </div>

                                <Title level={4} style={{ marginTop: 24, fontFamily: "'Outfit', sans-serif" }}>📈 Overall Price Evaluation</Title>
                                <div className="glass-card" style={{ overflow: 'hidden', padding: 8 }}>
                                    <Table 
                                        dataSource={directResult.evaluation} 
                                        columns={evaluationColumns} 
                                        pagination={false} 
                                        size="middle"
                                        rowKey="Tier"
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};

export default PriceChecker;

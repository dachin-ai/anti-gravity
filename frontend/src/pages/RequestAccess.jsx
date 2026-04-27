import React, { useState, useEffect } from 'react';
import { Select, Button, Card, Tag, Typography, Space, Empty, Table, message } from 'antd';
import { SendOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { submitAccessRequest, getMyAccessRequests } from '../api';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;

const ALL_TOOLS = [
    { key: 'price_checker',         label: 'Price Checker' },
    { key: 'order_planner',         label: 'Order Planner' },
    { key: 'product_performance',   label: 'Product Performance' },
    { key: 'order_review',          label: 'Order Review' },
    { key: 'affiliate_performance', label: 'Shopee Affiliate Performance' },
    { key: 'livestream_display',    label: 'Livestream Display' },
    { key: 'pre_sales',             label: 'Pre-Sales Checker' },
    { key: 'affiliate_analyzer',    label: 'Affiliate Analyzer' },
    { key: 'ads_analyzer',          label: 'TikTok Ads Analyzer' },
];

const statusTag = (status) => {
    if (status === 'pending')  return <Tag icon={<ClockCircleOutlined />}  color="gold">Pending</Tag>;
    if (status === 'approved') return <Tag icon={<CheckCircleOutlined />}  color="success">Approved</Tag>;
    return                            <Tag icon={<CloseCircleOutlined />}  color="error">Rejected</Tag>;
};

export default function RequestAccess() {
    const { hasAccess } = useAuth();
    const [selected, setSelected] = useState(null);
    const [loading, setLoading]   = useState(false);
    const [requests, setRequests] = useState([]);
    const [fetching, setFetching] = useState(true);

    const availableTools = ALL_TOOLS.filter(t => !hasAccess(t.key));

    const fetchRequests = async () => {
        try {
            const res = await getMyAccessRequests();
            setRequests(res.data);
        } catch {
            // silently fail
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleSubmit = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            await submitAccessRequest(selected);
            message.success('Request submitted! Admin will review soon.');
            setSelected(null);
            fetchRequests();
        } catch (err) {
            message.error(err.response?.data?.detail || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Tool',
            dataIndex: 'tool_key',
            render: v => ALL_TOOLS.find(t => t.key === v)?.label || v,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: statusTag,
            width: 140,
        },
        {
            title: 'Requested At',
            dataIndex: 'created_at',
            width: 180,
            render: v => v ? new Date(v).toLocaleString() : '—',
        },
    ];

    // Filter out tools that already have a pending request
    const pendingKeys = requests.filter(r => r.status === 'pending').map(r => r.tool_key);
    const selectableTools = availableTools.filter(t => !pendingKeys.includes(t.key));

    return (
        <div style={{ padding: '24px 32px', maxWidth: 720, margin: '0 auto' }}>
            <PageHeader
                title="Request Access"
                subtitle="Request access to tools you need. Admin will review your request."
            />

            <Card
                style={{
                    marginBottom: 24,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                }}
            >
                {selectableTools.length === 0 ? (
                    <Empty description={
                        <Text style={{ color: 'var(--text-muted)' }}>
                            {availableTools.length === 0
                                ? 'You already have access to all tools!'
                                : 'All your requests are already pending or approved.'}
                        </Text>
                    } />
                ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <Text style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                            Select the tool you want to request access to:
                        </Text>
                        <Space.Compact style={{ width: '100%' }}>
                            <Select
                                style={{ flex: 1 }}
                                placeholder="Select a tool..."
                                value={selected}
                                onChange={setSelected}
                                size="large"
                                options={selectableTools.map(t => ({ value: t.key, label: t.label }))}
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handleSubmit}
                                loading={loading}
                                disabled={!selected}
                                size="large"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#3b82f6)', border: 'none' }}
                            >
                                Submit
                            </Button>
                        </Space.Compact>
                    </Space>
                )}
            </Card>

            {(fetching || requests.length > 0) && (
                <Card
                    title={<Text style={{ color: 'var(--text-main)', fontWeight: 600 }}>My Requests</Text>}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16 }}
                >
                    <Table
                        dataSource={requests}
                        columns={columns}
                        rowKey="id"
                        loading={fetching}
                        pagination={false}
                        size="middle"
                    />
                </Card>
            )}
        </div>
    );
}

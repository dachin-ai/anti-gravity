import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Table, Button, Tag, Checkbox, message, Typography, Space, Badge } from 'antd';
import {
    CheckOutlined, CloseOutlined, ReloadOutlined,
    ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import {
    getAccessRequests, approveAccessRequest, rejectAccessRequest,
    getAllUsersWithPermissions, updateUserPermissions,
} from '../api';
import PageHeader from '../components/PageHeader';
import UserActivity from './UserActivity';

const { Text } = Typography;

// group: 'admin' | 'freemir' | 'shopee' | 'tiktok'
const ALL_TOOLS = [
    { key: 'admin',                 label: 'Admin',              group: 'admin'   },
    { key: 'price_checker',         label: 'Price Checker',      group: 'freemir' },
    { key: 'order_planner',         label: 'Order Planner',      group: 'freemir' },
    { key: 'product_performance',   label: 'Product Perf.',      group: 'freemir' },
    { key: 'order_review',          label: 'Order Review',       group: 'shopee'  },
    { key: 'affiliate_performance', label: 'Shopee Affiliate',   group: 'shopee'  },
    { key: 'livestream_display',    label: 'LS Display',         group: 'shopee'  },
    { key: 'pre_sales',             label: 'Pre-Sales',          group: 'tiktok'  },
    { key: 'affiliate_analyzer',    label: 'Affiliate Analyzer', group: 'tiktok'  },
    { key: 'ads_analyzer',          label: 'TikTok Ads',         group: 'tiktok'  },
];

const GROUP_STYLE = {
    admin:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
    freemir: { color: '#6366f1', bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.25)' },
    shopee:  { color: '#f97316', bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.25)' },
    tiktok:  { color: '#ec4899', bg: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.25)' },
};

const statusTag = (status) => {
    if (status === 'pending')  return <Tag icon={<ClockCircleOutlined />}  color="gold">Pending</Tag>;
    if (status === 'approved') return <Tag icon={<CheckCircleOutlined />}  color="success">Approved</Tag>;
    return                            <Tag icon={<CloseCircleOutlined />}  color="error">Rejected</Tag>;
};

/* ─────────────── Tab 1: Access Requests ─────────────── */
function AccessRequestsTab() {
    const [data, setData]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [acting, setActing]   = useState(null); // id being processed

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAccessRequests();
            setData(res.data);
        } catch {
            message.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleApprove = async (id) => {
        setActing(id);
        try {
            await approveAccessRequest(id);
            message.success('Request approved');
            fetchData();
        } catch (err) {
            message.error(err.response?.data?.detail || 'Failed to approve');
        } finally {
            setActing(null);
        }
    };

    const handleReject = async (id) => {
        setActing(id);
        try {
            await rejectAccessRequest(id);
            message.success('Request rejected');
            fetchData();
        } catch (err) {
            message.error(err.response?.data?.detail || 'Failed to reject');
        } finally {
            setActing(null);
        }
    };

    const pendingCount = data.filter(r => r.status === 'pending').length;

    const columns = [
        { title: 'Username',    dataIndex: 'username',  key: 'username', width: 160 },
        {
            title: 'Tool',
            dataIndex: 'tool_key',
            key: 'tool',
            render: v => ALL_TOOLS.find(t => t.key === v)?.label || v,
        },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: statusTag },
        {
            title: 'Requested At',
            dataIndex: 'created_at',
            key: 'time',
            width: 180,
            render: v => v ? new Date(v).toLocaleString() : '—',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 180,
            render: (_, row) => row.status !== 'pending' ? null : (
                <Space size={8}>
                    <Button
                        size="small"
                        type="primary"
                        icon={<CheckOutlined />}
                        loading={acting === row.id}
                        onClick={() => handleApprove(row.id)}
                        style={{ background: '#10b981', border: 'none', borderRadius: 6 }}
                    >
                        Approve
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<CloseOutlined />}
                        loading={acting === row.id}
                        onClick={() => handleReject(row.id)}
                        style={{ borderRadius: 6 }}
                    >
                        Reject
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Space>
                    <Text style={{ color: 'var(--text-muted)' }}>
                        {pendingCount > 0
                            ? <><Badge color="gold" /><span style={{ marginLeft: 6 }}>{pendingCount} pending review</span></>
                            : 'No pending requests'}
                    </Text>
                </Space>
                <Button icon={<ReloadOutlined />} onClick={fetchData} size="small">Refresh</Button>
            </div>
            <Table
                dataSource={data}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
                size="middle"
            />
        </div>
    );
}

/* ─────────────── Tab 2: User Permissions Matrix ─────────────── */
function UserPermissionsTab() {
    const [users, setUsers]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(null); // username being saved

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAllUsersWithPermissions();
            setUsers(res.data);
        } catch {
            message.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const togglePermission = async (username, toolKey, currentValue) => {
        const newValue = currentValue === 1 ? 0 : 1;
        // Optimistic update
        setUsers(prev => prev.map(u =>
            u.username === username
                ? { ...u, permissions: { ...u.permissions, [toolKey]: newValue } }
                : u
        ));
        setSaving(username);
        try {
            const user = users.find(u => u.username === username);
            const updatedPerms = { ...(user?.permissions || {}), [toolKey]: newValue };
            await updateUserPermissions(username, updatedPerms);
        } catch (err) {
            message.error('Failed to update permission');
            // Revert on failure
            setUsers(prev => prev.map(u =>
                u.username === username
                    ? { ...u, permissions: { ...u.permissions, [toolKey]: currentValue } }
                    : u
            ));
        } finally {
            setSaving(null);
        }
    };

    const toolColumns = ALL_TOOLS.map(tool => {
        const gs = GROUP_STYLE[tool.group] || GROUP_STYLE.freemir;
        return {
            title: (
                <div style={{
                    background: gs.bg,
                    border: `1px solid ${gs.border}`,
                    borderRadius: 6,
                    padding: '2px 6px',
                    color: gs.color,
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                }}>
                    {tool.label}
                </div>
            ),
            key: tool.key,
            width: 110,
            align: 'center',
            render: (_, row) => (
                <Checkbox
                    checked={row.permissions?.[tool.key] === 1}
                    disabled={saving === row.username}
                    onChange={() => togglePermission(row.username, tool.key, row.permissions?.[tool.key] ?? 0)}
                />
            ),
        };
    });

    const columns = [
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
            fixed: 'left',
            width: 150,
            render: v => <Text strong style={{ color: 'var(--text-main)' }}>{v}</Text>,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 220,
            render: v => <Text style={{ color: 'var(--text-muted)', fontSize: 13 }}>{v}</Text>,
        },
        ...toolColumns,
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button icon={<ReloadOutlined />} onClick={fetchUsers} size="small">Refresh</Button>
            </div>
            <Table
                dataSource={users}
                columns={columns}
                rowKey="username"
                loading={loading}
                scroll={{ x: 'max-content' }}
                pagination={false}
                size="middle"
            />
        </div>
    );
}

/* ─────────────── Main Page ─────────────── */
export default function AccessManagement() {
    // TODO: Ganti dengan pengecekan permission admin dari context/auth jika sudah ada
    const isAdmin = true;
    const tabItems = [
        {
            key: 'requests',
            label: 'Access Requests',
            children: <AccessRequestsTab />,
        },
        {
            key: 'permissions',
            label: 'User Permissions',
            children: <UserPermissionsTab />,
        },
    ];
    if (isAdmin) {
        tabItems.push({
            key: 'user-activity',
            label: 'User Activity',
            children: <UserActivity />,
        });
    }
    return (
        <div style={{ padding: '24px 32px' }}>
            <PageHeader
                title="Access Management"
                subtitle="Review access requests and manage user permissions"
                accent="#f59e0b"
            />
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: 24,
            }}>
                <Tabs
                    defaultActiveKey="requests"
                    items={tabItems}
                />
            </div>
        </div>
    );
}

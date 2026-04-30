import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Button, Tooltip, message, Modal, Form, Input } from 'antd';
import { LogoutOutlined, HomeOutlined, LockOutlined, AppstoreOutlined, ShoppingOutlined, PlaySquareOutlined, VideoCameraOutlined, SunOutlined, MoonOutlined, KeyOutlined, UnlockOutlined, TeamOutlined, BarChartOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Bi from '../components/Bi';
import Panda from '../components/Panda';
import { changePassword } from '../api';

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [changePwdLoading, setChangePwdLoading] = useState(false);
  const [pwdForm] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasAccess } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const lockedLabel = (label, toolKey) => {
    if (toolKey && !hasAccess(toolKey)) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 6 }}>
          <span style={{ opacity: 0.45 }}>{label}</span>
          <LockOutlined style={{ color: '#f87171', fontSize: 11, flexShrink: 0 }} />
        </span>
      );
    }
    return label;
  };

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Bi e="Lobby" c="智能中心" /> },
    {
      key: 'group-freemir',
      label: <Bi e="Freemir Suite" c="Freemir 套件" />, 
      icon: <AppstoreOutlined />,
      children: [
        { key: '/price-checker', label: lockedLabel(<Bi e="Price Checker" c="查价仪" />, 'price_checker'), style: !hasAccess('price_checker') ? { opacity: 0.6 } : {} },
        { key: '/warehouse-order', label: lockedLabel(<Bi e="Order Planner" c="备货预估" />, 'order_planner'), style: !hasAccess('order_planner') ? { opacity: 0.6 } : {} },
        { key: '/product-performance', label: lockedLabel(<Bi e="Product Performance" c="商品表现" />, 'product_performance'), style: !hasAccess('product_performance') ? { opacity: 0.6 } : {} },
      ]
    },
    {
      key: 'group-shopee',
      label: <Bi e="Shopee Suite" c="Shopee 套件" />,
      icon: <ShoppingOutlined />,
      children: [
        { key: '/order-loss', label: lockedLabel(<Bi e="Order Review" c="订单亏损审查" />, 'order_review'), style: !hasAccess('order_review') ? { opacity: 0.6 } : {} },
        { key: '/shopee-affiliate', label: lockedLabel(<Bi e="Affiliate Performance" c="联盟中心" />, 'affiliate_performance'), style: !hasAccess('affiliate_performance') ? { opacity: 0.6 } : {} },
        { key: '/livestream-display', label: lockedLabel(<Bi e="Livestream Display" c="直播展示" />, 'livestream_display'), style: !hasAccess('livestream_display') ? { opacity: 0.6 } : {} },
      ]
    },
    {
      key: 'group-tiktok',
      label: <Bi e="TikTok Suite" c="TikTok 套件" />,
      icon: <PlaySquareOutlined />,
      children: [
        { key: '/pre-sales', label: lockedLabel(<Bi e="Pre-Sales Checker" c="预售预估" />, 'pre_sales'), style: !hasAccess('pre_sales') ? { opacity: 0.6 } : {} },
        { key: '/affiliate-analyzer', label: lockedLabel(<Bi e="Affiliate Analyzer" c="联盟数据分析" />, 'affiliate_analyzer'), style: !hasAccess('affiliate_analyzer') ? { opacity: 0.6 } : {} },
        { key: '/tiktok-ads', label: lockedLabel(<Bi e="Ads Analyzer" c="广告分析" />, 'ads_analyzer'), style: !hasAccess('ads_analyzer') ? { opacity: 0.6 } : {} },
      ]
    },
    { key: '/request-access', icon: <UnlockOutlined />, label: <Bi e="Request Access" c="申请权限" /> },
    ...(hasAccess('admin') ? [{ key: '/access-management', icon: <TeamOutlined />, label: <Bi e="Access Management" c="权限管理" /> }] : []),
  ];

  // Map route → toolKey to determine if restricted
  const ROUTE_TOOL_MAP = {
    '/price-checker': 'price_checker',
    '/warehouse-order': 'order_planner',
    '/order-loss': 'order_review',
    '/shopee-affiliate': 'affiliate_performance',
    '/pre-sales': 'pre_sales',
    '/affiliate-analyzer': 'affiliate_analyzer',
    '/tiktok-ads': 'ads_analyzer',
    '/access-management': 'admin',
    '/product-performance': 'product_performance',
    '/livestream-display': 'livestream_display',
  };

  const handleMenuClick = ({ key }) => {
    const toolKey = ROUTE_TOOL_MAP[key];
    if (toolKey && !hasAccess(toolKey)) {
      message.warning({ content: '🔒 Access restricted. Contact admin to request access.', key: 'restricted-tool', duration: 3 });
      return;
    }
    navigate(key);
  };

  /* Automatically auto-expand all menus based on current location */
  const openKeys = menuItems.filter(i => i.children?.some(c => c.key === location.pathname)).map(i => i.key);

  const onChangePwd = async (values) => {
    if (values.new_password !== values.confirm_password) {
      message.error('New passwords do not match.');
      return;
    }
    setChangePwdLoading(true);
    try {
      const res = await changePassword(values.current_password, values.new_password);
      message.success(res.data?.message || 'Password changed successfully.');
      setChangePwdOpen(false);
      pwdForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setChangePwdLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>

      {/* ── DARK SIDEBAR ── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        style={{
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          boxShadow: isDark ? '2px 0 16px rgba(0,0,0,0.5)' : '2px 0 12px rgba(0,0,0,0.08)',
          position: 'relative',
        }}
      >
        <div style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 10,
          gap: 12,
        }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/logo.png" alt="Freemir Logo" style={{ height: 44, objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.5)',
            }}>
              <span style={{ color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>F</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <Menu
          selectedKeys={[location.pathname]}
          defaultOpenKeys={openKeys}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
          style={{ background: 'transparent', border: 'none', padding: '0 8px' }}
          theme={isDark ? 'dark' : 'light'}
        />

        {/* 🐼 Panda mascot */}
        <Panda />
      </Sider>

      {/* ── MAIN AREA ── */}
      <Layout style={{ background: 'var(--bg-app)' }}>

        {/* Top Bar — dark gradient */}
        <div style={{
          height: 64,
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}>
          <Text style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            <Bi e="Business Intelligence Tools" c="商业智能工具" />
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Theme toggle */}
            <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <Button
                type="text"
                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                style={{
                  color: isDark ? '#fbbf24' : '#6366f1',
                  fontSize: 18,
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  background: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(99,102,241,0.1)',
                  border: `1px solid ${isDark ? 'rgba(251,191,36,0.25)' : 'rgba(99,102,241,0.25)'}`,
                  transition: 'all 0.25s ease',
                }}
              />
            </Tooltip>
            <div className="wajan-container" title="Freemir Wajan Tech" style={{ width: 40, height: 40 }}>
              <svg viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
                {/* Outer glow blob */}
                <circle cx="32" cy="32" r="20" fill="rgba(99,102,241,0.18)" stroke="none" />

                {/* Wok rim (outer wall) */}
                <circle cx="32" cy="32" r="18" stroke={isDark ? 'rgba(255,255,255,0.88)' : 'rgba(30,41,59,0.75)'} strokeWidth="2.2" />

                {/* Wok concave side walls */}
                <circle cx="32" cy="32" r="12" stroke={isDark ? 'rgba(255,255,255,0.38)' : 'rgba(30,41,59,0.25)'} strokeWidth="1.4" fill={isDark ? 'rgba(255,255,255,0.025)' : 'rgba(30,41,59,0.03)'} />

                {/* Wok flat base */}
                <circle cx="32" cy="32" r="6" stroke="rgba(99,102,241,0.95)" strokeWidth="1.5" fill="rgba(99,102,241,0.14)" />

                {/* Center heat dot */}
                <circle cx="32" cy="32" r="2" fill="rgba(99,102,241,1)" stroke="none" />

                {/* Scan crosshair inside */}
                <line x1="32" y1="20" x2="32" y2="44" stroke="rgba(99,102,241,0.32)" strokeWidth="0.8" strokeDasharray="2 3" />
                <line x1="20" y1="32" x2="44" y2="32" stroke="rgba(99,102,241,0.32)" strokeWidth="0.8" strokeDasharray="2 3" />

                {/* Long handle (gagang) - top view, slightly tapered */}
                <path d="M50 30.2 L62 29 L62 35 L50 33.8 Z" fill={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(30,41,59,0.05)'} stroke={isDark ? 'rgba(255,255,255,0.82)' : 'rgba(30,41,59,0.7)'} strokeWidth="1.7" strokeLinejoin="round" />
                {/* Handle grip ridges */}
                <line x1="53.5" y1="30.6" x2="53.5" y2="33.4" stroke={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(30,41,59,0.35)'} strokeWidth="1" />
                <line x1="56.5" y1="30.3" x2="56.5" y2="33.7" stroke={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(30,41,59,0.35)'} strokeWidth="1" />
                <line x1="59.5" y1="29.9" x2="59.5" y2="34.1" stroke={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(30,41,59,0.35)'} strokeWidth="1" />

                {/* Small ear handle (kuping) opposite side */}
                <path d="M14 29.5 Q7.5 32 14 34.5" stroke={isDark ? 'rgba(255,255,255,0.75)' : 'rgba(30,41,59,0.65)'} strokeWidth="2.3" fill="none" />

                {/* Scan nodes at top & bottom of rim */}
                <circle cx="32" cy="14" r="1.8" fill="rgba(99,102,241,0.85)" stroke="rgba(99,102,241,0.4)" strokeWidth="1" />
                <circle cx="32" cy="50" r="1.8" fill="rgba(99,102,241,0.85)" stroke="rgba(99,102,241,0.4)" strokeWidth="1" />

                {/* Futuristic orbit ring */}
                <circle className="wajan-ring" cx="32" cy="32" r="27" strokeDasharray="1.2 5" strokeLinecap="round" strokeWidth="1.8" />
              </svg>
            </div>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tooltip title="Change Password">
                  <Avatar
                    size={32}
                    style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => setChangePwdOpen(true)}
                  >
                    {(user.name || user.username)[0].toUpperCase()}
                  </Avatar>
                </Tooltip>
                <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: 500 }}>
                  {user.name || user.username}
                </Text>
                <Tooltip title="Logout">
                  <Button
                    type="text"
                    icon={<LogoutOutlined />}
                    onClick={logout}
                    style={{ color: '#ef4444', fontSize: 14 }}
                  />
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <Content style={{ padding: '32px', overflowY: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>

      {/* ── CHANGE PASSWORD MODAL ── */}
      <Modal
        open={changePwdOpen}
        onCancel={() => { setChangePwdOpen(false); pwdForm.resetFields(); }}
        footer={null}
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><KeyOutlined style={{ color: '#6366f1' }} /> Change Password</span>}
        width={400}
        styles={{ content: { background: isDark ? '#1e293b' : '#ffffff', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }, header: { background: isDark ? '#1e293b' : '#ffffff' } }}
      >
        <Form form={pwdForm} onFinish={onChangePwd} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="current_password" label="Current Password" rules={[{ required: true, message: 'Enter your current password' }]}>
            <Input.Password placeholder="Current password" />
          </Form.Item>
          <Form.Item name="new_password" label="New Password" rules={[{ required: true, min: 6, message: 'Min. 6 characters' }]}>
            <Input.Password placeholder="New password (min. 6 characters)" />
          </Form.Item>
          <Form.Item name="confirm_password" label="Confirm New Password" rules={[{ required: true, message: 'Please confirm your new password' }]}>
            <Input.Password placeholder="Repeat new password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button htmlType="submit" type="primary" loading={changePwdLoading} block
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)', border: 'none', height: 42, fontWeight: 600 }}>
              {changePwdLoading ? 'Saving...' : 'Save New Password'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default MainLayout;

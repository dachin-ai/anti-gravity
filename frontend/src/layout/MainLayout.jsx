import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Button, Tooltip } from 'antd';
import { TagOutlined, SettingOutlined, LogoutOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: 'Dashboard Lobby' },
    { key: '/price-checker', icon: <TagOutlined />, label: 'Price Checker' },
    { key: '/order-loss', icon: <TagOutlined />, label: 'Order Loss Review' },
    { key: '/failed-delivery', icon: <TagOutlined />, label: 'Failed Delivery' },
    { key: '/pre-sales', icon: <TagOutlined />, label: 'Pre-Sales Estimation' },
    { key: '/erp-oos', icon: <TagOutlined />, label: 'ERP OOS Calculate' },
    { key: '/sku-plan', icon: <TagOutlined />, label: 'SKU Monthly Plan' },
    { key: '/conversion-cleaner', icon: <TagOutlined />, label: 'Conversion Cleaner' },
    { key: '/order-match', icon: <TagOutlined />, label: 'Order Match Checker' },
    { key: '/warehouse-order', icon: <TagOutlined />, label: 'Warehouse Order Estimator' },
    { key: '/socmed-scraping', icon: <TagOutlined />, label: 'Socmed Scraper' },
    { key: '/affiliate-analyzer', icon: <TagOutlined />, label: 'Affiliate Analyzer' },
    { key: '/shopee-affiliate', icon: <TagOutlined />, label: 'Shopee Affiliate Hub' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>

      {/* ── DARK SIDEBAR ── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        style={{
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          boxShadow: '2px 0 16px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid var(--border)',
          marginBottom: 10,
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'var(--indigo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(99,102,241,0.5)',
          }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>F</span>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>Freemir</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', lineHeight: 1.4 }}>
                Tools
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <Menu
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 'none', padding: '0 8px' }}
          theme="dark"
        />
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
            freemir Tools Dashboard
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="digital-sphere">
              <div className="sphere-ring"></div>
              <div className="sphere-ring"></div>
              <div className="sphere-ring"></div>
              <div className="sphere-ring"></div>
              <div className="sphere-ring"></div>
            </div>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar size={32} style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', fontSize: 14, fontWeight: 700 }}>
                  {user.username[0].toUpperCase()}
                </Avatar>
                <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>{user.username}</Text>
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
    </Layout>
  );
};

export default MainLayout;

import React, { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { TagOutlined, SettingOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <SettingOutlined />, label: 'Dashboard Lobby' },
    { key: '/price-checker', icon: <TagOutlined />, label: 'Price Checker' },
    { key: '/order-loss', icon: <SettingOutlined />, label: 'Order Loss Review' },
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
          <div className="digital-sphere">
            <div className="sphere-ring"></div>
            <div className="sphere-ring"></div>
            <div className="sphere-ring"></div>
            <div className="sphere-ring"></div>
            <div className="sphere-ring"></div>
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

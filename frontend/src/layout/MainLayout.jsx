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
    { key: '/price-checker', icon: <TagOutlined />, label: 'Price Checker' },
    { key: '/settings',      icon: <SettingOutlined />, label: 'Settings' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--off-white)' }}>

      {/* ── DARK SIDEBAR ── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1a2540 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '2px 0 16px rgba(0,0,0,0.15)',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 10,
          gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: 'var(--indigo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79,70,229,0.4)',
          }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>F</span>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>Freemir</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.6px', textTransform: 'uppercase', lineHeight: 1.4 }}>
                Operational Hub
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
          style={{ background: 'transparent', border: 'none', padding: '0 0' }}
        />
      </Sider>

      {/* ── MAIN AREA ── */}
      <Layout style={{ background: 'var(--off-white)' }}>

        {/* Top Bar — dark gradient */}
        <div style={{
          height: 56,
          background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500, letterSpacing: '0.2px' }}>
            Freemir Operational Dashboard
          </Text>
          <div className="digital-sphere" style={{ marginRight: 20 }}>
            <div className="sphere-ring"></div>
            <div className="sphere-ring"></div>
            <div className="sphere-ring"></div>
            <div className="sphere-ring"></div>
            <div className="sphere-ring"></div>
          </div>
        </div>

        {/* Page Content */}
        <Content style={{ padding: '28px', overflowY: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

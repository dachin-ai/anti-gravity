import React, { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { TagOutlined, SettingOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/price-checker',
      icon: <TagOutlined />,
      label: 'Price Checker',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      {/* SIDEBAR */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={230}
        style={{ background: 'var(--white)', borderRight: '1px solid var(--border)', boxShadow: '2px 0 10px rgba(0,0,0,0.04)' }}
      >
        {/* Logo Area */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid var(--border)',
          marginBottom: 8,
          padding: '0 16px',
        }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--indigo)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>F</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate)', lineHeight: '1', fontFamily: "'Outfit', sans-serif" }}>Freemir</div>
                <div style={{ fontSize: 10, color: 'var(--slate-light)', lineHeight: '1.4', letterSpacing: '0.5px', textTransform:'uppercase' }}>Support Hub</div>
              </div>
            </div>
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--indigo)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>F</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <Menu
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, background: 'transparent', padding: '0 0' }}
        />
      </Sider>

      {/* MAIN CONTENT AREA */}
      <Layout style={{ background: 'var(--off-white)' }}>
        {/* Top Bar */}
        <div style={{
          height: 60,
          background: 'var(--white)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        }}>
          <Text style={{ fontSize: 14, color: 'var(--slate-light)', fontWeight: 500 }}>
            Freemir Operational Dashboard
          </Text>
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

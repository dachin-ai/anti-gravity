import React, { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { TagOutlined, SettingOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

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
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)} 
        width={260}
        className="glass-panel"
        style={{ borderRight: '1px solid var(--glass-border)' }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          borderBottom: '1px solid var(--glass-border)',
          marginBottom: 16
        }}>
          <Title level={4} style={{ margin: 0, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", letterSpacing: 1, display: collapsed ? 'none' : 'block' }}>
            SUPPORT <span style={{color: 'var(--primary)'}}>HUB</span>
          </Title>
          <Title level={4} style={{ margin: 0, color: 'var(--primary)', display: collapsed ? 'block' : 'none' }}>
            SH
          </Title>
        </div>
        <Menu 
          defaultSelectedKeys={[location.pathname]} 
          mode="inline" 
          items={menuItems} 
          onClick={({key}) => navigate(key)}
          style={{ borderRight: 0, background: 'transparent' }}
        />
      </Sider>
      <Layout style={{ background: 'transparent' }}>
        <Header className="glass-panel" style={{ 
          padding: '0 24px', 
          display: 'flex', 
          alignItems: 'center', 
          margin: '16px 24px 0 24px',
          borderRadius: 16,
          height: 64
        }}>
            <Title level={5} style={{ margin: 0, fontWeight: 500, color: 'var(--text-muted)' }}>Freemir Operational Dashboard</Title>
        </Header>
        <Content style={{ margin: '24px' }}>
          <div style={{ 
            minHeight: 'calc(100vh - 150px)',
            borderRadius: 16,
          }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

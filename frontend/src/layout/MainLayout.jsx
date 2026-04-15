import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Avatar, Button, Tooltip, message } from 'antd';
import { TagOutlined, LogoutOutlined, UserOutlined, HomeOutlined, LockOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Bi from '../components/Bi';

const { Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasAccess } = useAuth();

  // Helper: build label with optional lock for restricted items
  const lockedLabel = (label, toolKey) => {
    if (toolKey && !hasAccess(toolKey)) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 6 }}>
          <span style={{ opacity: 0.5 }}>{label}</span>
          <LockOutlined style={{ color: '#f87171', fontSize: 11, flexShrink: 0 }} />
        </span>
      );
    }
    return label;
  };

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Bi e="BI Hub" c="智能中心" /> },
    {
      key: 'group-freemir',
      label: <Bi e="Freemir Suite" c="Freemir 套件" />,
      icon: <span className="anticon"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M16 4h-3c-2.76 0-5 2.24-5 5v3H5v4h3v8h4v-8h4v-4h-4V9c0-.55.45-1 1-1h3V4z"/></svg></span>,
      children: [
        { key: '/price-checker', label: lockedLabel(<Bi e="Price Checker" c="查价仪" />, 'price_checker'), style: !hasAccess('price_checker') ? { opacity: 0.6 } : {} },
        { key: '/warehouse-order', label: lockedLabel(<Bi e="Order Planner" c="海外仓备货预估" />, 'order_planner'), style: !hasAccess('order_planner') ? { opacity: 0.6 } : {} },
      ]
    },
    {
      key: 'group-shopee',
      label: <Bi e="Shopee Suite" c="Shopee 套件" />,
      icon: <span className="anticon"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg></span>,
      children: [
        { key: '/order-loss', label: lockedLabel(<Bi e="Order Review" c="订单亏损审查" />, 'order_review'), style: !hasAccess('order_review') ? { opacity: 0.6 } : {} },
        { key: '/shopee-affiliate', label: lockedLabel(<Bi e="Affiliate Performance" c="Shopee 联盟中心" />, 'affiliate_performance'), style: !hasAccess('affiliate_performance') ? { opacity: 0.6 } : {} },
      ]
    },
    {
      key: 'group-tiktok',
      label: <Bi e="TikTok Suite" c="TikTok 套件" />,
      icon: <span className="anticon"><svg viewBox="0 0 448 512" width="1em" height="1em" fill="currentColor"><path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25v178.72A162.55 162.55 0 1 1 185.85 188.31v89.89a74.62 74.62 0 1 0 52.23 71.18V0h88a121.18 121.18 0 0 0 1.86 22.17A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14Z"/></svg></span>,
      children: [
        { key: '/pre-sales', label: lockedLabel(<Bi e="Pre-Sales Checker" c="预售预估" />, 'pre_sales'), style: !hasAccess('pre_sales') ? { opacity: 0.6 } : {} },
        { key: '/affiliate-analyzer', label: lockedLabel(<Bi e="Affiliate Analyzer" c="联盟数据分析" />, 'affiliate_analyzer'), style: !hasAccess('affiliate_analyzer') ? { opacity: 0.6 } : {} },
        { key: '/tiktok-ads', label: lockedLabel(<Bi e="Ads Analyzer" c="TikTok 广告分析" />, 'ads_analyzer'), style: !hasAccess('ads_analyzer') ? { opacity: 0.6 } : {} },
      ]
    }
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
          boxShadow: '2px 0 16px rgba(0,0,0,0.5)',
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
            <Bi e="Business Intelligence Tools" c="商业智能工具" />
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="tech-spatula-container" title="Freemir Kitchen Tech" style={{ width: 36, height: 36 }}>
              <svg viewBox="0 0 64 64" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
                {/* Tech Glow effect under spatula */}
                <circle cx="32" cy="32" r="14" fill="rgba(16,185,129,0.3)" filter="blur(8px)" stroke="none" />
                
                {/* Spatula Head: Narrower and rounded trapezoid */}
                <path d="M22 14 Q32 10 42 14 L38 33 Q32 35 26 33 Z" fill="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                
                {/* 5 Vertical Slots inside narrower head */}
                <line x1="25.5" y1="16" x2="27" y2="30" strokeWidth="1.5" stroke="rgba(255,255,255,0.7)" />
                <line x1="28.5" y1="14.5" x2="29.5" y2="31" strokeWidth="1.5" stroke="rgba(255,255,255,0.7)" />
                <line x1="32" y1="14" x2="32" y2="32" strokeWidth="1.5" stroke="rgba(255,255,255,0.7)" />
                <line x1="35.5" y1="14.5" x2="34.5" y2="31" strokeWidth="1.5" stroke="rgba(255,255,255,0.7)" />
                <line x1="38.5" y1="16" x2="37" y2="30" strokeWidth="1.5" stroke="rgba(255,255,255,0.7)" />
                
                {/* Handle matching the reference (tapered and rounded at bottom) */}
                <path d="M30 34 C 31 38, 31 56, 31 58 A 1 1 0 0 0 33 58 C 33 56, 33 38, 34 34" strokeWidth="3" />
                
                {/* Hanging hole at bottom of handle */}
                <ellipse cx="32" cy="56" rx="1" ry="2" strokeWidth="1" />
                
                {/* Tech Ring (Perfectly dotted) */}
                <circle className="tech-spatula-ring" cx="32" cy="35" r="28" strokeDasharray="1 6" strokeLinecap="round" strokeWidth="2.5" />
              </svg>
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

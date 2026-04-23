import React from 'react';
import { Typography, Row, Col, Card, Tag, Tooltip, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowRightOutlined, LockOutlined, TagOutlined, InboxOutlined, FileSearchOutlined, BarChartOutlined, FundProjectionScreenOutlined, RiseOutlined, PieChartOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { Title, Text } = Typography;

const TOOLS_CATALOG = [
    { name: "Price Checker", desc: "Competitor price monitoring across multiple platforms.", main_user: "Account Responsible", platform: "Multiplatform", icon: <TagOutlined />, path: "/price-checker", active: true, category: "freemir", toolKey: "price_checker" },
    { name: "Order Planner", desc: "Estimate daily order volume per warehouse based on monthly targets.", main_user: "Warehouse / Ops", platform: "Internal", icon: <InboxOutlined />, path: "/warehouse-order", active: true, category: "freemir", toolKey: "order_planner" },
    { name: "Product Performance", desc: "Upload, clean, and store product performance data by week.", main_user: "Account Responsible", platform: "Shopee", icon: <BarChartOutlined />, path: "/product-performance", active: true, category: "freemir" },
    { name: "Order Review", desc: "Analysis of lost orders and cancellation reasons.", main_user: "Platform Responsible", platform: "Qianyi ERP", icon: <FileSearchOutlined />, path: "/order-loss", active: true, category: "shopee", toolKey: "order_review" },
    { name: "Affiliate Performance", desc: "Shopee Affiliate performance data tracking.", main_user: "Affiliate Responsible", platform: "Shopee", icon: <BarChartOutlined />, path: "/shopee-affiliate", active: true, category: "shopee", toolKey: "affiliate_performance" },
    { name: "Pre-Sales Checker", desc: "Volume estimation and forecasting for pre-sales events.", main_user: "Account Responsible", platform: "TikTok", icon: <FundProjectionScreenOutlined />, path: "/pre-sales", active: true, category: "tiktok", toolKey: "pre_sales" },
    { name: "Affiliate Analyzer", desc: "Comprehensive TikTok affiliate data analytics.", main_user: "Affiliate Responsible", platform: "TikTok", icon: <RiseOutlined />, path: "/affiliate-analyzer", active: true, category: "tiktok", toolKey: "affiliate_analyzer" },
    { name: "Ads Analyzer", desc: "Analyze and consolidate TikTok Ads performance data.", main_user: "Ads Specialist", platform: "TikTok", icon: <PieChartOutlined />, path: "/tiktok-ads", active: true, category: "tiktok", toolKey: "ads_analyzer" },
];

const CATEGORY_META = {
    "freemir": { title: "Freemir Suite", accent: "#6366f1" },
    "shopee": { title: "Shopee Suite", accent: "#f97316" },
    "tiktok": { title: "TikTok Suite", accent: "#ec4899" },
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { hasAccess } = useAuth();
    const { isDark } = useTheme();

    return (
        <div>
            {/* HERO */}
            <div style={{
                position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.03) 50%, transparent 100%)',
                border: '1px solid rgba(99,102,241,0.18)',
                borderRadius: 16, padding: '36px 40px', marginBottom: 52,
            }}>
                {/* floating orbs */}
                <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -30, right: 180, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 20, right: 300, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <Title level={1} style={{
                    fontSize: 34, margin: '0 0 10px 0', fontWeight: 800,
                    background: isDark
                        ? 'linear-gradient(90deg, #f1f5f9 0%, #c7d2fe 60%, #a5b4fc 100%)'
                        : 'none',
                    WebkitBackgroundClip: isDark ? 'text' : 'unset',
                    WebkitTextFillColor: isDark ? 'transparent' : '#0f172a',
                    color: isDark ? undefined : '#0f172a',
                    letterSpacing: '-0.5px',
                }}>
                    Business Intelligence Tools
                </Title>
                <Text style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}>
                    Unified analytics &amp; operations platform — select a module to launch.
                </Text>
            </div>

            {/* CATEGORIES */}
            {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                const catTools = TOOLS_CATALOG.filter(t => t.category === catKey);
                if (catTools.length === 0) return null;

                return (
                    <div key={catKey} style={{ marginBottom: 52 }}>
                        {/* Category header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div style={{ width: 4, height: 20, borderRadius: 2, background: meta.accent, flexShrink: 0, boxShadow: `0 0 8px ${meta.accent}80` }} />
                            <Text style={{ fontSize: 13, fontWeight: 700, color: meta.accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                {meta.title}
                            </Text>
                            <div style={{ flexGrow: 1, height: 1, background: `linear-gradient(90deg, ${meta.accent}40 0%, transparent 100%)` }} />
                        </div>

                        <Row gutter={[20, 20]}>
                            {catTools.map((tool, idx) => {
                                const accessible = !tool.toolKey || hasAccess(tool.toolKey);
                                const isClickable = tool.active && accessible;

                                return (
                                    <Col xs={24} md={12} lg={8} key={idx}>
                                        <Tooltip title={!accessible ? 'Contact admin to request access' : ''} placement="top">
                                            <Card
                                                hoverable={isClickable}
                                                onClick={() => isClickable && navigate(tool.path)}
                                                className={`lobby-card card-${catKey}`}
                                                style={{
                                                    background: isDark ? '#0d1526' : '#ffffff',
                                                    border: `1px solid ${accessible ? `${meta.accent}28` : 'rgba(239,68,68,0.15)'}`,
                                                    borderTop: accessible ? `3px solid ${meta.accent}` : '3px solid rgba(239,68,68,0.4)',
                                                    borderRadius: 12,
                                                    height: '100%',
                                                    cursor: isClickable ? 'pointer' : 'default',
                                                    opacity: accessible ? 1 : 0.55,
                                                    transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
                                                }}
                                                styles={{ body: { padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%' } }}
                                            >
                                                {/* Icon + title row */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                                    <div style={{
                                                        width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                                                        background: accessible ? `${meta.accent}22` : 'rgba(239,68,68,0.1)',
                                                        border: accessible ? `1px solid ${meta.accent}35` : '1px solid rgba(239,68,68,0.2)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 18, color: accessible ? meta.accent : '#f87171',
                                                        boxShadow: accessible ? `0 0 10px ${meta.accent}25` : 'none',
                                                    }}>
                                                        {tool.icon}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <Text style={{ fontSize: 14, fontWeight: 700, color: accessible ? (isDark ? '#f1f5f9' : '#1e293b') : '#64748b', display: 'block', lineHeight: 1.3 }}>
                                                            {tool.name}
                                                        </Text>
                                                        <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                                                            <Tag style={{ background: `${meta.accent}12`, border: `1px solid ${meta.accent}30`, color: meta.accent, fontSize: 10, borderRadius: 4, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                                                                {tool.platform}
                                                            </Tag>
                                                            <Tag style={{ background: 'transparent', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, color: '#64748b', fontSize: 10, borderRadius: 4, lineHeight: '16px', padding: '0 6px', margin: 0 }}>
                                                                {tool.main_user}
                                                            </Tag>
                                                        </div>
                                                    </div>
                                                    {!accessible && <LockOutlined style={{ color: '#f87171', fontSize: 13, flexShrink: 0 }} />}
                                                </div>

                                                <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, lineHeight: 1.6, flexGrow: 1, marginBottom: 12, display: 'block' }}>
                                                    {tool.desc}
                                                </Text>

                                                {/* CTA */}
                                                {accessible ? (
                                                    <Button
                                                        ghost
                                                        size="small"
                                                        style={{
                                                            borderColor: meta.accent,
                                                            color: meta.accent,
                                                            borderRadius: 6,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            height: 28,
                                                            background: `${meta.accent}10`,
                                                        }}
                                                    >
                                                        Launch <ArrowRightOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                                                    </Button>
                                                ) : (
                                                    <div style={{ color: '#f87171', fontSize: 12, fontWeight: 500 }}>
                                                        <LockOutlined style={{ marginRight: 6 }} />Access Restricted
                                                    </div>
                                                )}
                                            </Card>
                                        </Tooltip>
                                    </Col>
                                );
                            })}
                        </Row>
                    </div>
                );
            })}
        </div>
    );
};

export default Dashboard;

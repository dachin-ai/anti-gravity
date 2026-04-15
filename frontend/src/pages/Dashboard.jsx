import React from 'react';
import { Typography, Row, Col, Card, Tag, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CaretRightOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const TOOLS_CATALOG = [
    { name: "Price Checker", desc: "Competitor price monitoring across multiple platforms.", main_user: "Account Responsible", platform: "Multiplatform", icon: "🏷️", path: "/price-checker", active: true, category: "freemir", req: "Dena", toolKey: "price_checker" },
    { name: "Order Planner", desc: "Estimate daily order volume per warehouse based on monthly targets.", main_user: "Warehouse / Ops", platform: "Internal", icon: "🏭", path: "/warehouse-order", active: true, category: "freemir", req: "Utami", toolKey: "order_planner" },
    
    // Shopee Suite
    { name: "Order Review", desc: "Analysis of lost orders and cancellation reasons.", main_user: "Platform Responsible", platform: "Qianyi ERP", icon: "📉", path: "/order-loss", active: true, category: "shopee", req: "Nia", toolKey: "order_review" },
    { name: "Affiliate Performance", desc: "Shopee Affiliate performance data tracking.", main_user: "Affiliate Responsible", platform: "Shopee", icon: "🏪", path: "/shopee-affiliate", active: true, category: "shopee", req: "Amila", toolKey: "affiliate_performance" },

    // TikTok Suite
    { name: "Pre-Sales Checker", desc: "Volume estimation and forecasting for pre-sales events.", main_user: "Account Responsible", platform: "TikTok", icon: "🔮", path: "/pre-sales", active: true, category: "tiktok", req: "Chandra", toolKey: "pre_sales" },
    { name: "Affiliate Analyzer", desc: "Comprehensive TikTok affiliate data analytics.", main_user: "Affiliate Responsible", platform: "TikTok", icon: "📈", path: "/affiliate-analyzer", active: true, category: "tiktok", req: "Nikken", toolKey: "affiliate_analyzer" },
    { name: "Ads Analyzer", desc: "Analyze and consolidate TikTok Ads performance data.", main_user: "Ads Specialist", platform: "TikTok", icon: "📊", path: "/tiktok-ads", active: true, category: "tiktok", req: "Chandra", toolKey: "ads_analyzer" },

    // Hidden Tools
    { name: "New ERP OOS Calculate", desc: "Out of Stock (OOS) calculation based on new ERP data.", main_user: "Customer Service", platform: "ERP Qianyi", icon: "⚡", path: "/erp-oos", active: false, category: "freemir", hidden: true },
    { name: "Failed Delivery Tracker", desc: "Tracking and resolving failed delivery orders.", main_user: "Platform Responsible", platform: "TikTok", icon: "🚚", path: "/failed-delivery", active: false, category: "tiktok", hidden: true },
    { name: "SKU Monthly Plan", desc: "Monthly SKU planning, budgeting, and supply projection.", main_user: "Analyst", platform: "Ding BI", icon: "📅", path: "/sku-plan", active: false, category: "freemir", hidden: true },
    { name: "Socmed Scraper", desc: "Scrape Instagram & TikTok post/comment data.", main_user: "Content / Social", platform: "IG + TikTok", icon: "📥", path: "/socmed-scraping", active: false, category: "freemir", hidden: true },
];

const CATEGORY_META = {
    "freemir": { title: "Freemir Suite", icon: "💠" },
    "shopee": { title: "Shopee Suite", icon: "🛍️" },
    "tiktok": { title: "TikTok Suite", icon: "🎵" }
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { hasAccess } = useAuth();

    return (
        <div>
            {/* HERO SECTION */}
            <div style={{ marginBottom: 40, borderLeft: '4px solid #3b82f6', paddingLeft: 20 }}>
                <Title level={1} style={{ fontSize: 42, margin: 0, fontWeight: 900, background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                    Business Intelligence Tools
                </Title>
                <Text style={{ fontSize: 16, color: 'var(--text-muted)' }}>
                    Unified analytics & operations ecosystem. Select a module below to launch.
                </Text>
            </div>

            {/* CATEGORIES GRID */}
            {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                const catTools = TOOLS_CATALOG.filter(t => t.category === catKey && !t.hidden);
                if (catTools.length === 0) return null;

                return (
                    <div key={catKey} style={{ marginBottom: 48 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                            <Title level={3} style={{ margin: 0, color: '#f8fafc', fontWeight: 800 }}>
                                {meta.icon} {meta.title}
                            </Title>
                            <div style={{ flexGrow: 1, height: 1, background: 'linear-gradient(90deg, rgba(56,189,248,0.4) 0%, transparent 100%)', marginLeft: 20 }}></div>
                        </div>

                        <Row gutter={[24, 24]}>
                            {catTools.map((tool, idx) => {
                                // Determine if user has access (tools without toolKey are always accessible)
                                const accessible = !tool.toolKey || hasAccess(tool.toolKey);
                                const isClickable = tool.active && accessible;

                                return (
                                    <Col xs={24} md={12} lg={8} xl={8} key={idx}>
                                        <Tooltip
                                            title={!accessible ? '🔒 Contact admin to request access' : ''}
                                            placement="top"
                                        >
                                            <Card
                                                hoverable={isClickable}
                                                onClick={() => isClickable && tool.path ? navigate(tool.path) : null}
                                                style={{
                                                    background: accessible
                                                        ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6))'
                                                        : 'linear-gradient(145deg, rgba(20, 28, 45, 0.5), rgba(10, 15, 30, 0.7))',
                                                    borderColor: accessible ? 'var(--border)' : 'rgba(239, 68, 68, 0.15)',
                                                    borderRadius: 16,
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    cursor: isClickable ? 'pointer' : accessible ? 'not-allowed' : 'default',
                                                    opacity: accessible ? 1 : 0.65,
                                                    transition: 'all 0.3s ease',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                }}
                                                bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}
                                            >
                                                {/* Lock overlay stripe for restricted tools */}
                                                {!accessible && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0, left: 0, right: 0,
                                                        height: 3,
                                                        background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                                                        borderRadius: '16px 16px 0 0',
                                                    }} />
                                                )}

                                                <div style={{ fontSize: 20, fontWeight: 700, color: accessible ? '#f1f5f9' : '#94a3b8', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span>{tool.icon}</span> {tool.name}
                                                    </span>
                                                    {!accessible && (
                                                        <LockOutlined style={{ color: '#f87171', fontSize: 16, flexShrink: 0 }} />
                                                    )}
                                                </div>

                                                {tool.active ? (
                                                    <div style={{ marginBottom: 16 }}>
                                                        {accessible ? (
                                                            <>
                                                                <Tag color="cyan" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>{tool.platform}</Tag>
                                                                <Tag color="purple" style={{ background: 'rgba(167, 139, 250, 0.1)', borderColor: 'rgba(167, 139, 250, 0.2)' }}>{tool.main_user}</Tag>
                                                            </>
                                                        ) : (
                                                            <Tag style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                                                                🔒 Restricted
                                                            </Tag>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ marginBottom: 16 }}>
                                                        <Tag color="red" style={{ background: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.2)' }}>Status: Build in Progress</Tag>
                                                    </div>
                                                )}

                                                <Text style={{ color: 'var(--text-muted)', fontSize: 13, flexGrow: 1, marginBottom: 12 }}>
                                                    {tool.desc}
                                                </Text>

                                                {tool.req && (
                                                    <Text style={{ color: '#475569', fontSize: 11, fontStyle: 'italic', marginBottom: 16 }}>
                                                        Req: by {tool.req}
                                                    </Text>
                                                )}

                                                {tool.active && accessible && (
                                                    <div style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        borderRadius: 8, padding: '8px 16px', display: 'inline-flex',
                                                        alignItems: 'center', gap: 8, alignSelf: 'flex-start',
                                                        color: '#fff', fontWeight: 600, fontSize: 13
                                                    }}>
                                                        <CaretRightOutlined /> Launch Module
                                                    </div>
                                                )}

                                                {!accessible && (
                                                    <div style={{
                                                        background: 'rgba(239, 68, 68, 0.06)',
                                                        borderRadius: 8, padding: '8px 16px', display: 'inline-flex',
                                                        alignItems: 'center', gap: 8, alignSelf: 'flex-start',
                                                        color: '#f87171', fontWeight: 600, fontSize: 13,
                                                        border: '1px solid rgba(239, 68, 68, 0.15)',
                                                    }}>
                                                        <LockOutlined /> Access Restricted
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


import React from 'react';
import { Typography, Row, Col, Badge, Card, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CaretRightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const TOOLS_CATALOG = [
    { name: "Price Checker", desc: "Competitor price monitoring across multiple platforms.", main_user: "Account Responsible", platform: "Multiplatform", icon: "🏷️", path: "/price-checker", active: true, category: "operations" },
    { name: "Order Loss Review", desc: "Analysis of lost orders and cancellation reasons.", main_user: "Platform Responsible", platform: "Qianyi ERP", icon: "📉", path: "/order-loss", active: true, category: "operations" },
    { name: "Order Failed Delivery", desc: "Tracking and resolving failed delivery orders.", main_user: "Platform Responsible", platform: "TikTok", icon: "🚚", path: "/failed-delivery", active: true, category: "operations" },
    { name: "Pre-Sales Estimation", desc: "Volume estimation and forecasting for pre-sales events.", main_user: "Account Responsible", platform: "TikTok", icon: "🔮", path: "/pre-sales", active: true, category: "planning" },
    { name: "New ERP OOS Calculate", desc: "Out of Stock (OOS) calculation based on new ERP data.", main_user: "Customer Service", platform: "ERP Qianyi", icon: "⚡", path: "/erp-oos", active: true, category: "operations" },
    { name: "SKU Monthly Plan", desc: "Monthly SKU planning, budgeting, and supply projection.", main_user: "Analyst", platform: "Ding BI", icon: "📅", path: "/sku-plan", active: false, category: "planning" },
    { name: "Conversion Cleaner", desc: "Data cleaning tool for affiliate conversion reports.", main_user: "Affiliate Responsible", platform: "Shopee", icon: "🧹", path: "/conversion-cleaner", active: false, category: "data" },
    { name: "Coming Soon", desc: "New supply chain forecasting module under development.", main_user: "TBD", platform: "TBD", icon: "⭐", path: "", active: false, category: "upcoming" }
];

const CATEGORY_META = {
    "operations": { title: "Operations & Fulfillment", icon: "⚡" },
    "planning": { title: "Strategy & Planning", icon: "🎯" },
    "analytics": { title: "Analytics & Performance", icon: "📊" },
    "data": { title: "Data Engineering", icon: "🛠️" },
    "upcoming": { title: "In Development", icon: "🚀" }
};

const Dashboard = () => {
    const navigate = useNavigate();

    return (
        <div>
            {/* HERO SECTION */}
            <div style={{ marginBottom: 40, borderLeft: '4px solid #3b82f6', paddingLeft: 20 }}>
                <Title level={1} style={{ fontSize: 42, margin: 0, fontWeight: 900, background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
                    Business Intelligence Hub
                </Title>
                <Text style={{ fontSize: 16, color: 'var(--text-muted)' }}>
                    Unified analytics & operations ecosystem. Select a module below to launch.
                </Text>
            </div>

            {/* CATEGORIES GRID */}
            {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                const catTools = TOOLS_CATALOG.filter(t => t.category === catKey);
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
                            {catTools.map((tool, idx) => (
                                <Col xs={24} md={12} lg={8} xl={8} key={idx}>
                                    <Card
                                        hoverable={tool.active}
                                        onClick={() => tool.active && tool.path ? navigate(tool.path) : null}
                                        style={{
                                            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6))',
                                            borderColor: 'var(--border)',
                                            borderRadius: 16,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: tool.active ? 'pointer' : 'not-allowed',
                                            opacity: tool.active ? 1 : 0.6,
                                            transition: 'all 0.3s ease'
                                        }}
                                        bodyStyle={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}
                                    >
                                        <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span>{tool.icon}</span> {tool.name}
                                        </div>
                                        
                                        {tool.active ? (
                                            <div style={{ marginBottom: 16 }}>
                                                <Tag color="cyan" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>{tool.platform}</Tag>
                                                <Tag color="purple" style={{ background: 'rgba(167, 139, 250, 0.1)', borderColor: 'rgba(167, 139, 250, 0.2)' }}>{tool.main_user}</Tag>
                                            </div>
                                        ) : (
                                            <div style={{ marginBottom: 16 }}>
                                                <Tag color="red" style={{ background: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.2)' }}>Status: Build in Progress</Tag>
                                            </div>
                                        )}

                                        <Text style={{ color: 'var(--text-muted)', fontSize: 13, flexGrow: 1, marginBottom: 20 }}>
                                            {tool.desc}
                                        </Text>

                                        {tool.active && (
                                            <div style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: 8, padding: '8px 16px', display: 'inline-flex',
                                                alignItems: 'center', gap: 8, alignSelf: 'flex-start',
                                                color: '#fff', fontWeight: 600, fontSize: 13
                                            }}>
                                                <CaretRightOutlined /> Launch Module
                                            </div>
                                        )}
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                );
            })}
        </div>
    );
};

export default Dashboard;

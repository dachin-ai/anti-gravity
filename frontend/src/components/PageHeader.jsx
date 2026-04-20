import React from 'react';
import { Typography } from 'antd';

const { Title, Text } = Typography;

const PageHeader = ({ title, subtitle, accent = '#6366f1', actions }) => (
    <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 28,
    }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
                width: 3, height: 36, borderRadius: 2,
                background: accent, flexShrink: 0, marginTop: 5,
            }} />
            <div>
                <Title level={3} style={{
                    margin: '0 0 3px 0', fontFamily: "'Outfit', sans-serif",
                    color: '#f1f5f9', fontWeight: 700,
                }}>
                    {title}
                </Title>
                {subtitle && (
                    <Text style={{ color: '#64748b', fontSize: 13 }}>
                        {subtitle}
                    </Text>
                )}
            </div>
        </div>
        {actions && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                {actions}
            </div>
        )}
    </div>
);

export default PageHeader;

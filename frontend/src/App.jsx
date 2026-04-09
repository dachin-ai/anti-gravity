import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import MainLayout from './layout/MainLayout';
import PriceChecker from './pages/PriceChecker';

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          colorBgBase: '#0f172a',
          colorBgContainer: 'rgba(30, 41, 59, 0.6)',
          colorBgElevated: 'rgba(30, 41, 59, 0.8)',
          colorBorder: 'rgba(255, 255, 255, 0.1)',
          fontFamily: "'Inter', sans-serif",
          borderRadius: 12,
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/price-checker" replace />} />
            <Route path="price-checker" element={<PriceChecker />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;

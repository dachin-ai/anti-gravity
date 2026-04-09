import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layout/MainLayout';
import LoginPage from './pages/LoginPage';
import PriceChecker from './pages/PriceChecker';
import Dashboard from './pages/Dashboard';
import OrderLossReview from './pages/OrderLossReview';
import FailedDelivery from './pages/FailedDelivery';
import PreSalesEstimation from './pages/PreSalesEstimation';
import ErpOosCalculate from './pages/ErpOosCalculate';
import SkuMonthlyPlan from './pages/SkuMonthlyPlan';
import ConversionCleaner from './pages/ConversionCleaner';
import OrderMatchChecker from './pages/OrderMatchChecker';

// Protected route wrapper
function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#020617',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16
      }}>
        <Spin size="large" />
        <div style={{ color: '#64748b', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
          Verifying session...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="price-checker" element={<PriceChecker />} />
        <Route path="order-loss" element={<OrderLossReview />} />
        <Route path="failed-delivery" element={<FailedDelivery />} />
        <Route path="pre-sales" element={<PreSalesEstimation />} />
        <Route path="erp-oos" element={<ErpOosCalculate />} />
        <Route path="sku-plan" element={<SkuMonthlyPlan />} />
        <Route path="conversion-cleaner" element={<ConversionCleaner />} />
        <Route path="order-match" element={<OrderMatchChecker />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

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
        <AuthProvider>
          <ProtectedApp />
        </AuthProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import MainLayout from './layout/MainLayout';
import PriceChecker from './pages/PriceChecker';
import Dashboard from './pages/Dashboard';
import OrderLossReview from './pages/OrderLossReview';
import FailedDelivery from './pages/FailedDelivery';
import PreSalesEstimation from './pages/PreSalesEstimation';
import ErpOosCalculate from './pages/ErpOosCalculate';
import ConversionCleaner from './pages/ConversionCleaner';

import SkuMonthlyPlan from './pages/SkuMonthlyPlan';

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
            <Route index element={<Dashboard />} />
            <Route path="price-checker" element={<PriceChecker />} />
            <Route path="order-loss" element={<OrderLossReview />} />
            <Route path="failed-delivery" element={<FailedDelivery />} />
            <Route path="pre-sales" element={<PreSalesEstimation />} />
            <Route path="erp-oos" element={<ErpOosCalculate />} />
            <Route path="sku-plan" element={<SkuMonthlyPlan />} />
            <Route path="conversion-cleaner" element={<ConversionCleaner />} />
          </Route>
        </Routes>


      </Router>
    </ConfigProvider>
  );
}

export default App;

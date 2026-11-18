import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { useI18n } from './i18n.jsx';
import { AdminLayout, ShopLayout } from './components/Layouts.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/shop/Dashboard.jsx';
import Stock from './pages/shop/Stock.jsx';
import ItemForm from './pages/shop/ItemForm.jsx';
import Sale from './pages/shop/Sale.jsx';
import Sales from './pages/shop/Sales.jsx';
import SaleReceipt from './pages/shop/SaleReceipt.jsx';
import BuyBack from './pages/shop/BuyBack.jsx';
import BuybackReceipt from './pages/shop/BuybackReceipt.jsx';
import Workshop from './pages/shop/Workshop.jsx';
import Installments from './pages/shop/Installments.jsx';
import Reports from './pages/shop/Reports.jsx';
import Account from './pages/shop/Account.jsx';
import Clients from './pages/admin/Clients.jsx';
import NewClient from './pages/admin/NewClient.jsx';
import ClientDetail from './pages/admin/ClientDetail.jsx';
import AdminAccount from './pages/admin/AdminAccount.jsx';

function Guard({ role, children }) {
  const { me, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return <p style={{ padding: 24 }}>{t('loading')}</p>;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role !== role) return <Navigate to={me.role === 'ADMIN' ? '/admin' : '/app'} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route path="/app" element={<Guard role="SHOP"><ShopLayout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="stock" element={<Stock />} />
        <Route path="stock/new" element={<ItemForm />} />
        <Route path="stock/:id/edit" element={<ItemForm />} />
        <Route path="sale" element={<Sale mode="SALE" />} />
        <Route path="exchange" element={<Sale mode="EXCHANGE" />} />
        <Route path="sales" element={<Sales />} />
        <Route path="sales/:id" element={<SaleReceipt />} />
        <Route path="buyback" element={<BuyBack />} />
        <Route path="buyback/:id" element={<BuybackReceipt />} />
        <Route path="workshop" element={<Workshop />} />
        <Route path="installments" element={<Installments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="account" element={<Account />} />
      </Route>

      <Route path="/admin" element={<Guard role="ADMIN"><AdminLayout /></Guard>}>
        <Route index element={<Clients />} />
        <Route path="new" element={<NewClient />} />
        <Route path="account" element={<AdminAccount />} />
        <Route path=":id" element={<ClientDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

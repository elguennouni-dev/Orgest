import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Loader } from './components/ui.jsx';
import { AdminLayout, ShopLayout } from './components/Layouts.jsx';
import { MotionRoot, Page } from './components/Motion.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Blog from './pages/Blog.jsx';
import BlogPost from './pages/BlogPost.jsx';
import { ToolPage, ToolsHub } from './pages/Tools.jsx';
import Plans from './pages/admin/Plans.jsx';
import BlogAdmin from './pages/admin/BlogAdmin.jsx';
import PostEditor from './pages/admin/PostEditor.jsx';
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
  if (loading) return <Loader full />;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role !== role) return <Navigate to={me.role === 'ADMIN' ? '/admin' : '/app'} replace />;
  return children;
}

export default function App() {
  return (
    <>
    <MotionRoot />
    <Routes>
      <Route path="/" element={<Page><Landing /></Page>} />
      <Route path="/login" element={<Page><Login /></Page>} />
      <Route path="/blog" element={<Page><Blog /></Page>} />
      <Route path="/blog/:slug" element={<Page><BlogPost /></Page>} />
      <Route path="/outils" element={<Page><ToolsHub /></Page>} />
      <Route path="/outils/:slug" element={<Page><ToolPage /></Page>} />

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
        <Route path="plans" element={<Plans />} />
        <Route path="blog" element={<BlogAdmin />} />
        <Route path="blog/:id" element={<PostEditor />} />
        <Route path=":id" element={<ClientDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

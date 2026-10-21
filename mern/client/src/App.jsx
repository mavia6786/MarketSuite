import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ShoeCartProvider } from './context/ShoeCartContext';
import { ClothingCartProvider } from './context/ClothingCartContext';

import MainLayout from './layouts/MainLayout';
import ShoesDashboardLayout from './layouts/ShoesDashboardLayout';
import ClothingDashboardLayout from './layouts/ClothingDashboardLayout';

import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import RegisterShopPage from './pages/RegisterShopPage';
import NotFound from './pages/NotFound';
import ChangePasswordPage from './pages/ChangePasswordPage';
import UsersPage from './pages/shared/UsersPage';
import RequirePermission from './components/RequirePermission';

import AdminDashboard from './pages/shoes/AdminDashboard';
import POS from './pages/shoes/POS';
import Products from './pages/shoes/Products';
import AddEditProduct from './pages/shoes/AddEditProduct';
import Inventory from './pages/shoes/Inventory';
import SalesHistory from './pages/shoes/SalesHistory';
import Reports from './pages/shoes/Reports';

import ClothingDashboard from './pages/clothes/ClothingDashboard';
import ClothingPOS from './pages/clothes/ClothingPOS';
import ClothingProducts from './pages/clothes/ClothingProducts';
import ClothingInventory from './pages/clothes/ClothingInventory';
import ClothingSalesHistory from './pages/clothes/ClothingSalesHistory';
import ClothingReports from './pages/clothes/ClothingReports';
import StaffManager from './pages/shared/StaffManager';
import SuppliersPage from './pages/shared/SuppliersPage';
import FinancePage from './pages/shared/FinancePage';

export default function App() {
  return (
    <AuthProvider>
      <ShoeCartProvider>
        <ClothingCartProvider>
          <Routes>
            {/* Pages using the default MainLayout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/register-shop" element={<RegisterShopPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>

            {/* Shoe store dashboard (DashboardLayout) */}
            <Route path="/dashboard" element={<ShoesDashboardLayout />}>
              <Route index element={<RequirePermission perm="reports.view"><AdminDashboard /></RequirePermission>} />
              <Route path="pos" element={<RequirePermission perm="sales.create"><POS /></RequirePermission>} />
              <Route path="products" element={<RequirePermission perm="products.view"><Products /></RequirePermission>} />
              <Route path="products/add" element={<RequirePermission perm="products.create"><AddEditProduct /></RequirePermission>} />
              <Route path="products/edit/:id" element={<RequirePermission perm="products.edit"><AddEditProduct /></RequirePermission>} />
              <Route path="inventory" element={<RequirePermission perm="products.view"><Inventory /></RequirePermission>} />
              <Route path="sales" element={<RequirePermission perm="sales.view"><SalesHistory /></RequirePermission>} />
              <Route path="reports" element={<RequirePermission perm="reports.view"><Reports /></RequirePermission>} />
              <Route path="salesmen" element={<RequirePermission perm="staff.view"><StaffManager vertical="shoes" /></RequirePermission>} />
              <Route path="suppliers" element={<RequirePermission perm="suppliers.view"><SuppliersPage vertical="shoes" /></RequirePermission>} />
              <Route path="users" element={<RequirePermission perm="users.manage"><UsersPage /></RequirePermission>} />
              <Route path="finance" element={<RequirePermission perm="finance.view"><FinancePage vertical="shoes" /></RequirePermission>} />
            </Route>

            {/* Clothing store dashboard (ClothingDashboardLayout) */}
            <Route element={<ClothingDashboardLayout />}>
              <Route path="/dashboard/clothes" element={<RequirePermission perm="reports.view"><ClothingDashboard /></RequirePermission>} />
              <Route path="/clothes/pos" element={<RequirePermission perm="sales.create"><ClothingPOS /></RequirePermission>} />
              <Route path="/clothes/products" element={<RequirePermission perm="products.view"><ClothingProducts /></RequirePermission>} />
              <Route path="/clothes/inventory" element={<RequirePermission perm="products.view"><ClothingInventory /></RequirePermission>} />
              <Route path="/clothes/sales" element={<RequirePermission perm="sales.view"><ClothingSalesHistory /></RequirePermission>} />
              <Route path="/clothes/reports" element={<RequirePermission perm="reports.view"><ClothingReports /></RequirePermission>} />
              <Route path="/clothes/staff" element={<RequirePermission perm="staff.view"><StaffManager vertical="clothes" /></RequirePermission>} />
              <Route path="/clothes/suppliers" element={<RequirePermission perm="suppliers.view"><SuppliersPage vertical="clothes" /></RequirePermission>} />
              <Route path="/clothes/users" element={<RequirePermission perm="users.manage"><UsersPage /></RequirePermission>} />
              <Route path="/clothes/finance" element={<RequirePermission perm="finance.view"><FinancePage vertical="clothes" /></RequirePermission>} />
            </Route>

            {/* Anything else → 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ClothingCartProvider>
      </ShoeCartProvider>
    </AuthProvider>
  );
}

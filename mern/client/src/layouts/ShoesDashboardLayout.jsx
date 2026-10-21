import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShoeCart } from '../context/ShoeCartContext';

const NAV_ICONS = {
  overview: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  pos: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  products: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  inventory: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  sales: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  reports: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  salesmen: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  suppliers: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  finance: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

function Icon({ d }) {
  return (
    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
    </svg>
  );
}

function NavItem({ to, end, icon, perm, children }) {
  const { can } = useAuth();
  if (perm && !can(perm)) return null;
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `sd-link ${isActive ? 'sd-link-active' : ''}`}>
      <div className="sd-link-icon">
        <Icon d={icon} />
      </div>
      {children}
    </NavLink>
  );
}

export default function ShoesDashboardLayout() {
  const { isAuthenticated, currentUser, currentShop, logout, can, canAny } = useAuth();
  const cart = useShoeCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = (currentUser?.fullName || 'U').substring(0, 1).toUpperCase();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' });

  return (
    <div className="sd-root">
      <aside className="sd-sidebar">
        <div className="sd-sidebar-shine"></div>

        <div className="sd-logo">
          <div className="sd-logo-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h20M2 12c0-3 4-5 10-5s10 2 10 5M2 12c0 3 4 5 10 5s10-2 10-5" />
            </svg>
          </div>
          <div>
            <p className="sd-logo-name">{currentShop?.name || 'MarketSuite'}</p>
            <p className="sd-logo-sub">Shoe Store Dashboard</p>
          </div>
        </div>

        <nav className="sd-nav">
          <NavItem perm="reports.view" to="/dashboard" end icon={NAV_ICONS.overview}>
            Overview
          </NavItem>
          <NavItem perm="sales.create" to="/dashboard/pos" icon={NAV_ICONS.pos}>
            Point of Sale
            {cart.itemCount > 0 && <span className="sd-cart-pill">{cart.itemCount}</span>}
          </NavItem>

          {can('products.view') && <div className="sd-section-label">Products</div>}
          <NavItem perm="products.view" to="/dashboard/products" icon={NAV_ICONS.products}>
            Products
          </NavItem>
          <NavItem perm="products.view" to="/dashboard/inventory" icon={NAV_ICONS.inventory}>
            Inventory & Stock
          </NavItem>

          {canAny('sales.view', 'reports.view', 'finance.view') && <div className="sd-section-label">Sales</div>}
          <NavItem perm="sales.view" to="/dashboard/sales" icon={NAV_ICONS.sales}>
            Sales History
          </NavItem>
          <NavItem perm="reports.view" to="/dashboard/reports" icon={NAV_ICONS.reports}>
            Reports
          </NavItem>

          <NavItem perm="finance.view" to="/dashboard/finance" icon={NAV_ICONS.finance}>
            Profit & Loss
          </NavItem>

          {canAny('staff.view', 'suppliers.view', 'users.manage') && <div className="sd-section-label">Team</div>}
          <NavItem perm="staff.view" to="/dashboard/salesmen" icon={NAV_ICONS.salesmen}>
            Salesmen
          </NavItem>
          <NavItem perm="suppliers.view" to="/dashboard/suppliers" icon={NAV_ICONS.suppliers}>
            Suppliers
          </NavItem>
          <NavItem perm="users.manage" to="/dashboard/users" icon={NAV_ICONS.salesmen}>
            Users &amp; Roles
          </NavItem>
          <NavItem to="/change-password" icon={NAV_ICONS.overview}>
            Change password
          </NavItem>
        </nav>

        <div className="sd-user">
          <div className="sd-user-ava">{initial}</div>
          <div className="sd-user-info">
            <p className="sd-user-name">{currentUser?.fullName || 'User'}</p>
            <p className="sd-user-role">{currentUser?.role || ''}</p>
          </div>
          <button onClick={handleLogout} className="sd-logout" title="Logout">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      <div className="sd-main">
        <header className="sd-header">
          <div className="sd-header-left">
            <div className="sd-header-tag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M2 12c0-3 4-5 10-5s10 2 10 5M2 12c0 3 4 5 10 5s10-2 10-5" />
              </svg>
              Shoes
            </div>
            <div>
              <p className="sd-header-title">{currentShop?.name || 'Dashboard'}</p>
              <p className="sd-header-date">{today}</p>
            </div>
          </div>
          <div className="sd-header-right">
            <div className="sd-role-tag">{currentUser?.role || ''}</div>
            <div className="sd-header-ava">{initial}</div>
          </div>
        </header>

        <main className="sd-body">
          <Outlet />
        </main>
      </div>

      <style>{`
        .sd-root { display: flex; min-height: 100vh; font-family: 'Plus Jakarta Sans', 'DM Sans', ui-sans-serif, sans-serif; background: #eef2ff; color: #1e293b; }
        .sd-sidebar { width: 234px; min-height: 100vh; flex-shrink: 0; display: flex; flex-direction: column; background: #1a1f6e; position: relative; overflow: hidden; }
        .sd-sidebar-shine { position: absolute; top: -80px; right: -80px; width: 240px; height: 240px; background: radial-gradient(circle, rgba(99,179,237,0.18) 0%, transparent 70%); pointer-events: none; border-radius: 50%; }
        .sd-logo { display: flex; align-items: center; gap: 11px; padding: 18px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); position: relative; z-index: 1; }
        .sd-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #4facfe, #00f2fe); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 14px rgba(79,172,254,0.5); }
        .sd-logo-name { font-size: 0.82rem; font-weight: 700; color: #fff; margin: 0; line-height: 1.1; }
        .sd-logo-sub { font-size: 0.58rem; color: rgba(139,187,255,0.65); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin: 3px 0 0; }
        .sd-nav { flex: 1; padding: 14px 10px; overflow-y: auto; position: relative; z-index: 1; }
        .sd-section-label { padding: 16px 10px 4px; font-size: 0.58rem; font-weight: 700; color: rgba(139,187,255,0.4); text-transform: uppercase; letter-spacing: 0.18em; }
        .sd-link { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 9px; font-size: 0.77rem; font-weight: 500; color: rgba(180,210,255,0.5); transition: all 0.18s ease; cursor: pointer; text-decoration: none; margin-bottom: 1px; }
        .sd-link-icon { width: 28px; height: 28px; border-radius: 7px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.18s ease; }
        .sd-link:hover { background: rgba(79,172,254,0.12); color: #7ec8fc; }
        .sd-link:hover .sd-link-icon { background: rgba(79,172,254,0.18); color: #4facfe; }
        .sd-link-active { background: rgba(79,172,254,0.15) !important; color: #4facfe !important; }
        .sd-link-active .sd-link-icon { background: linear-gradient(135deg,#4facfe,#00f2fe) !important; color: #fff !important; box-shadow: 0 2px 10px rgba(79,172,254,0.4) !important; }
        .sd-cart-pill { margin-left: auto; background: linear-gradient(135deg,#f093fb,#f5576c); color: #fff; font-size: 0.6rem; font-weight: 800; padding: 1px 7px; border-radius: 999px; box-shadow: 0 2px 8px rgba(240,147,251,0.4); }
        .sd-user { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.08); position: relative; z-index: 1; }
        .sd-user-ava { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, #4facfe, #00f2fe); color: #fff; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(79,172,254,0.4); }
        .sd-user-info { flex: 1; min-width: 0; }
        .sd-user-name { font-size: 0.74rem; font-weight: 600; color: rgba(220,235,255,0.9); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sd-user-role { font-size: 0.58rem; color: rgba(139,187,255,0.5); text-transform: uppercase; letter-spacing: 0.1em; margin: 2px 0 0; }
        .sd-logout { background: none; border: none; color: rgba(139,187,255,0.3); cursor: pointer; padding: 5px; border-radius: 7px; transition: all 0.2s; flex-shrink: 0; }
        .sd-logout:hover { color: #fc8181; background: rgba(252,129,129,0.1); }
        .sd-main { flex: 1; display: flex; flex-direction: column; min-height: 100vh; overflow: hidden; }
        .sd-header { display: flex; align-items: center; justify-content: space-between; padding: 0 26px; height: 58px; flex-shrink: 0; background: #fff; border-bottom: 1px solid #e0e7ff; box-shadow: 0 1px 12px rgba(79,172,254,0.07); }
        .sd-header-left { display: flex; align-items: center; gap: 12px; }
        .sd-header-tag { display: flex; align-items: center; gap: 5px; background: linear-gradient(135deg, #4facfe22, #00f2fe11); border: 1px solid #a5d4ff; color: #1d6fa4; font-size: 0.65rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.1em; }
        .sd-header-title { font-size: 0.9rem; font-weight: 700; color: #1e2a78; margin: 0; line-height: 1; }
        .sd-header-date { font-size: 0.63rem; color: #94a3c8; margin: 3px 0 0; }
        .sd-header-right { display: flex; align-items: center; gap: 10px; }
        .sd-role-tag { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 11px; border-radius: 6px; background: #eef2ff; color: #4361cc; border: 1px solid #c7d2fe; }
        .sd-header-ava { width: 33px; height: 33px; border-radius: 9px; background: linear-gradient(135deg, #4facfe, #00f2fe); color: #fff; font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(79,172,254,0.35); }
        .sd-body { flex: 1; overflow-y: auto; padding: 24px; background: #eef2ff; }
        .sd-body::-webkit-scrollbar { width: 4px; }
        .sd-body::-webkit-scrollbar-track { background: #e0e7ff; }
        .sd-body::-webkit-scrollbar-thumb { background: #a5b4fc; border-radius: 99px; }
        .sd-body::-webkit-scrollbar-thumb:hover { background: #818cf8; }
        .sd-nav::-webkit-scrollbar { width: 3px; }
        .sd-nav::-webkit-scrollbar-track { background: transparent; }
        .sd-nav::-webkit-scrollbar-thumb { background: rgba(79,172,254,0.2); border-radius: 99px; }
      `}</style>
    </div>
  );
}

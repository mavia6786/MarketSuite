import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ICONS = {
  overview: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  pos: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  products: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  inventory: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
  sales: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  reports: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  staff: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  suppliers: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  finance: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};
const SHIRT = 'M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z';

function NavItem({ to, end, icon, dim, perm, children }) {
  const { can } = useAuth();
  if (perm && !can(perm)) return null;
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `cd-link ${dim ? 'cd-link-dim' : ''} ${isActive && !dim ? 'cd-link-active' : ''}`}>
      <div className="cd-link-icon">
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
        </svg>
      </div>
      {children}
    </NavLink>
  );
}

export default function ClothingDashboardLayout() {
  const { isAuthenticated, currentUser, currentShop, logout, can, canAny } = useAuth();
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
    <div className="cd-root">
      <aside className="cd-sidebar">
        <div className="cd-sidebar-shine"></div>

        <div className="cd-logo">
          <div className="cd-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d={SHIRT} />
            </svg>
          </div>
          <div>
            <p className="cd-logo-name">{currentShop?.name || 'MarketSuite'}</p>
            <p className="cd-logo-sub">Clothing Store Dashboard</p>
          </div>
        </div>

        <nav className="cd-nav">
          <NavItem perm="reports.view" to="/dashboard/clothes" end icon={ICONS.overview}>Overview</NavItem>
          <NavItem perm="sales.create" to="/clothes/pos" icon={ICONS.pos}>Point of Sale</NavItem>

          {can('products.view') && <div className="cd-section-label">Products</div>}
          <NavItem perm="products.view" to="/clothes/products" icon={ICONS.products}>Products</NavItem>
          <NavItem perm="products.view" to="/clothes/inventory" icon={ICONS.inventory}>Inventory &amp; Stock</NavItem>

          {canAny('sales.view', 'reports.view', 'finance.view') && <div className="cd-section-label">Sales</div>}
          <NavItem perm="sales.view" to="/clothes/sales" icon={ICONS.sales}>Sales History</NavItem>
          <NavItem perm="sales.view" to="/clothes/online-orders" icon={ICONS.sales}>Online Orders</NavItem>
          <NavItem perm="reports.view" to="/clothes/reports" icon={ICONS.reports}>Reports</NavItem>
          <NavItem perm="finance.view" to="/clothes/finance" icon={ICONS.finance}>Profit & Loss</NavItem>

          {canAny('staff.view', 'suppliers.view', 'users.manage') && <div className="cd-section-label">Team</div>}
          <NavItem perm="staff.view" to="/clothes/staff" icon={ICONS.staff}>Staff</NavItem>
          <NavItem perm="suppliers.view" to="/clothes/suppliers" icon={ICONS.suppliers}>Suppliers</NavItem>
          <NavItem perm="users.manage" to="/clothes/users" icon={ICONS.staff}>Users &amp; Roles</NavItem>
          <NavItem to="/change-password" icon={ICONS.overview}>Change password</NavItem>
        </nav>

        <div className="cd-user">
          <div className="cd-user-ava">{initial}</div>
          <div className="cd-user-info">
            <p className="cd-user-name">{currentUser?.fullName || 'User'}</p>
            <p className="cd-user-role">{currentUser?.role || ''}</p>
          </div>
          <button onClick={handleLogout} className="cd-logout" title="Logout">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      <div className="cd-main">
        <header className="cd-header">
          <div className="cd-header-left">
            <div className="cd-header-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d={SHIRT} />
              </svg>
              Clothing
            </div>
            <div>
              <p className="cd-header-title">{currentShop?.name || 'Dashboard'}</p>
              <p className="cd-header-date">{today}</p>
            </div>
          </div>
          <div className="cd-header-right">
            <div className="cd-role-tag">{currentUser?.role || ''}</div>
            <div className="cd-header-ava">{initial}</div>
          </div>
        </header>

        <main className="cd-body">
          <Outlet />
        </main>
      </div>

      <style>{`
        .cd-root { display: flex; min-height: 100vh; font-family: 'Plus Jakarta Sans', 'DM Sans', ui-sans-serif, sans-serif; background: #fdf4ff; color: #1e293b; }
        .cd-sidebar { width: 234px; min-height: 100vh; flex-shrink: 0; display: flex; flex-direction: column; background: #3b0764; position: relative; overflow: hidden; }
        .cd-sidebar-shine { position: absolute; top: -60px; right: -60px; width: 220px; height: 220px; background: radial-gradient(circle, rgba(232,121,249,0.18) 0%, transparent 70%); pointer-events: none; border-radius: 50%; }
        .cd-logo { display: flex; align-items: center; gap: 11px; padding: 18px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); position: relative; z-index: 1; }
        .cd-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #f093fb, #f5576c); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 14px rgba(240,147,251,0.5); }
        .cd-logo-name { font-size: 0.82rem; font-weight: 700; color: #fff; margin: 0; line-height: 1.1; }
        .cd-logo-sub { font-size: 0.58rem; color: rgba(233,168,255,0.6); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin: 3px 0 0; }
        .cd-nav { flex: 1; padding: 14px 10px; overflow-y: auto; position: relative; z-index: 1; }
        .cd-section-label { padding: 16px 10px 4px; font-size: 0.58rem; font-weight: 700; color: rgba(233,168,255,0.35); text-transform: uppercase; letter-spacing: 0.18em; }
        .cd-link { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 9px; font-size: 0.77rem; font-weight: 500; color: rgba(233,168,255,0.5); transition: all 0.18s ease; cursor: pointer; text-decoration: none; margin-bottom: 1px; }
        .cd-link-icon { width: 28px; height: 28px; border-radius: 7px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.18s ease; }
        .cd-link:hover { background: rgba(240,147,251,0.12); color: #f0abfc; }
        .cd-link:hover .cd-link-icon { background: rgba(240,147,251,0.18); color: #f093fb; }
        .cd-link-active { background: rgba(240,147,251,0.15) !important; color: #f0abfc !important; }
        .cd-link-active .cd-link-icon { background: linear-gradient(135deg, #f093fb, #f5576c) !important; color: #fff !important; box-shadow: 0 2px 10px rgba(240,147,251,0.4) !important; }
        .cd-link-dim { opacity: 0.4; pointer-events: none; }
        .cd-user { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.08); position: relative; z-index: 1; }
        .cd-user-ava { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, #f093fb, #f5576c); color: #fff; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(240,147,251,0.4); }
        .cd-user-info { flex: 1; min-width: 0; }
        .cd-user-name { font-size: 0.74rem; font-weight: 600; color: rgba(245,215,255,0.9); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cd-user-role { font-size: 0.58rem; color: rgba(233,168,255,0.45); text-transform: uppercase; letter-spacing: 0.1em; margin: 2px 0 0; }
        .cd-logout { background: none; border: none; color: rgba(233,168,255,0.3); cursor: pointer; padding: 5px; border-radius: 7px; transition: all 0.2s; flex-shrink: 0; }
        .cd-logout:hover { color: #fc8181; background: rgba(252,129,129,0.1); }
        .cd-main { flex: 1; display: flex; flex-direction: column; min-height: 100vh; overflow: hidden; }
        .cd-header { display: flex; align-items: center; justify-content: space-between; padding: 0 26px; height: 58px; flex-shrink: 0; background: #fff; border-bottom: 1px solid #f3e8ff; box-shadow: 0 1px 12px rgba(168,85,247,0.07); }
        .cd-header-left { display: flex; align-items: center; gap: 12px; }
        .cd-header-tag { display: flex; align-items: center; gap: 5px; background: linear-gradient(135deg, #f093fb22, #f5576c11); border: 1px solid #f0abfc; color: #9333ea; font-size: 0.65rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.1em; }
        .cd-header-title { font-size: 0.9rem; font-weight: 700; color: #4a044e; margin: 0; line-height: 1; }
        .cd-header-date { font-size: 0.63rem; color: #c084fc; margin: 3px 0 0; }
        .cd-header-right { display: flex; align-items: center; gap: 10px; }
        .cd-role-tag { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 11px; border-radius: 6px; background: #fdf4ff; color: #9333ea; border: 1px solid #e9d5ff; }
        .cd-header-ava { width: 33px; height: 33px; border-radius: 9px; background: linear-gradient(135deg, #f093fb, #f5576c); color: #fff; font-size: 0.78rem; font-weight: 800; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(240,147,251,0.35); }
        .cd-body { flex: 1; overflow-y: auto; padding: 24px; background: #fdf4ff; }
        .cd-body::-webkit-scrollbar { width: 4px; }
        .cd-body::-webkit-scrollbar-track { background: #f3e8ff; }
        .cd-body::-webkit-scrollbar-thumb { background: #d8b4fe; border-radius: 99px; }
        .cd-body::-webkit-scrollbar-thumb:hover { background: #c084fc; }
        .cd-nav::-webkit-scrollbar { width: 3px; }
        .cd-nav::-webkit-scrollbar-track { background: transparent; }
        .cd-nav::-webkit-scrollbar-thumb { background: rgba(240,147,251,0.2); border-radius: 99px; }
      `}</style>
    </div>
  );
}

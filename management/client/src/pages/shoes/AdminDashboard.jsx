import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { shoesApi } from '../../services/shoesApi';
import { n0, fmtDateTime, paymentBadge } from '../../utils/format';
import FinanceStrip from '../../components/FinanceStrip';

export default function AdminDashboard() {
  const { currentUser, currentShop } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState({
    totalRevenue: 0, totalOrders: 0, totalProducts: 0, lowStockCount: 0, monthSales: 0, avgOrderValue: 0,
    lowStockProducts: [], recentSales: [], topProducts: [], dailySales: [],
  });

  useEffect(() => {
    document.title = `Dashboard — ${currentShop?.name || 'MarketSuite'}`;
    (async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [stats, month, pstats, low, sales] = await Promise.all([
        shoesApi.getDashboardStats(),
        shoesApi.getDashboardStats(monthStart.toISOString(), now.toISOString()),
        shoesApi.getProductStats(),
        shoesApi.getLowStock(),
        shoesApi.getSales(),
      ]);
      const next = {
        totalRevenue: stats.data.revenue,
        totalOrders: stats.data.orders,
        avgOrderValue: stats.data.avgOrder,
        topProducts: stats.data.topProducts,
        dailySales: stats.data.last7Days,
        monthSales: month.data.orders,
        totalProducts: pstats.data.total,
        lowStockCount: pstats.data.lowStock,
        lowStockProducts: low.data,
        recentSales: sales.data,
      };
      setD(next);
      if (next.dailySales.length && window.renderSalesChart) {
        const labels = next.dailySales.map((x) => new Date(x.date).toLocaleDateString('en-US', { weekday: 'short' }));
        setTimeout(() => window.renderSalesChart('salesChart', labels, next.dailySales.map((x) => x.revenue)), 0);
      }
    })();
  }, [currentShop]);

  const low = d.lowStockProducts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back, <span className="font-semibold text-slate-700">{currentUser?.fullName}</span>! Here's what's happening today.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard/products/add')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Add Product
          </button>
          <button
            onClick={() => navigate('/dashboard/pos')}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            New Sale
          </button>
        </div>
      </div>

      {/* Low stock alert */}
      {low.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div className="flex-1">
            <p className="text-amber-800 font-bold text-sm">Low Stock Alert — {low.length} product(s) need restocking</p>
            <p className="text-amber-600 text-xs mt-1">
              {low.slice(0, 4).map((p) => `${p.name} (${p.stockQuantity} left)`).join(', ')}
              {low.length > 4 ? ` +${low.length - 4} more` : ''}
            </p>
          </div>
          <button onClick={() => navigate('/dashboard/inventory')} className="text-amber-700 text-xs font-bold border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors flex-shrink-0">View →</button>
        </div>
      )}

      <FinanceStrip vertical="shoes" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">All Time</span>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-black text-slate-900">Rs. {n0(d.totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">{d.monthSales} this month</span>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total Orders</p>
          <p className="text-2xl font-black text-slate-900">{d.totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{d.lowStockCount} low stock</span>
          </div>
          <p className="text-xs text-slate-500 mb-1">Total Products</p>
          <p className="text-2xl font-black text-slate-900">{d.totalProducts}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Per Sale</span>
          </div>
          <p className="text-xs text-slate-500 mb-1">Avg Order Value</p>
          <p className="text-2xl font-black text-slate-900">Rs. {n0(d.avgOrderValue)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="font-bold text-slate-900 text-sm">Sales Last 7 Days</h3>
            <p className="text-xs text-slate-400">Daily revenue breakdown</p>
          </div>
          <div style={{ height: 180 }}><canvas id="salesChart"></canvas></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="font-bold text-slate-900 text-sm">Top Products</h3>
            <p className="text-xs text-slate-400">By revenue</p>
          </div>
          {d.topProducts.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-6">No sales data yet.</p>
          ) : (
            <div className="space-y-3">
              {d.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 font-semibold truncate">{p.productName}</p>
                    <p className="text-[10px] text-slate-400">{p.totalQuantity} pcs sold</p>
                  </div>
                  <span className="text-xs font-bold text-slate-800">Rs. {n0(p.totalRevenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Sales</h3>
            <p className="text-xs text-slate-400">Latest transactions</p>
          </div>
          <button onClick={() => navigate('/dashboard/sales')} className="text-xs text-amber-600 hover:text-amber-700 font-bold transition-colors">View All →</button>
        </div>
        {d.recentSales.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No sales recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.recentSales.slice(0, 6).map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs font-bold text-amber-600">{sale.invoiceNumber}</td>
                    <td className="px-4 py-3.5 text-slate-700 text-sm">{sale.customerName}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{fmtDateTime(sale.saleDate)}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{sale.items.reduce((s, i) => s + i.quantity, 0)} pcs</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${paymentBadge(sale.paymentMethod)}`}>{sale.paymentMethod}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-slate-900">Rs. {n0(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

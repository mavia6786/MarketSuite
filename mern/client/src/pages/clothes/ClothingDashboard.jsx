import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clothesApi } from '../../services/clothesApi';
import { n0, fmtDateTime } from '../../utils/format';
import FinanceStrip from '../../components/FinanceStrip';

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export default function ClothingDashboard() {
  const { currentUser, currentShop } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState({ totalRevenue: 0, totalOrders: 0, totalProducts: 0, avgOrderValue: 0, lowStock: [], recentSales: [], dailySales: [], topProducts: [] });

  useEffect(() => {
    document.title = 'Clothing Dashboard';
    if (currentShop && currentShop.type !== 'Clothes') {
      navigate('/dashboard');
      return;
    }
    (async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const back30 = new Date(from.getTime() - 30 * 86400000);

      const [stats, active, range, low] = await Promise.all([
        clothesApi.getStats(from.toISOString(), now.toISOString()),
        clothesApi.getActiveProducts(),
        clothesApi.getSalesByRange(back30.toISOString(), now.toISOString()),
        clothesApi.getLowStock(),
      ]);

      const allSales = range.data;
      const totalRevenue = stats.data.revenue;
      const totalOrders = stats.data.transactions;

      const dailySales = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i);
        return {
          date,
          revenue: allSales.filter((s) => sameDay(s.saleDate, date) && s.status === 'Completed').reduce((a, s) => a + s.totalAmount, 0),
        };
      });

      setD({
        totalRevenue,
        totalOrders,
        totalProducts: active.data.length,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        lowStock: low.data,
        recentSales: allSales,
        dailySales,
        topProducts: stats.data.topProducts,
      });
    })();
  }, [currentShop, navigate]);

  const maxRevenue = Math.max(0, ...d.dailySales.map((x) => x.revenue));
  const maxQty = Math.max(0, ...d.topProducts.map((x) => x.totalSold));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">👕 Clothing Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {currentUser?.fullName}! Here's your clothing store overview.</p>
        </div>
        <button onClick={() => navigate('/clothes/pos')} className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg flex items-center gap-2">
          New Sale
        </button>
      </div>

      {d.lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div>
            <p className="font-bold text-amber-800 text-sm">Low Stock Alert — {d.lowStock.length} product(s) need restocking</p>
            <p className="text-amber-700 text-xs mt-1">{d.lowStock.slice(0, 4).map((p) => `${p.name} (${p.stockQuantity} left)`).join(', ')}</p>
          </div>
        </div>
      )}

      <FinanceStrip vertical="clothes" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Revenue</p>
          <p className="text-2xl font-black text-slate-900">Rs. {n0(d.totalRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">This month</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Orders</p>
          <p className="text-2xl font-black text-slate-900">{d.totalOrders}</p>
          <p className="text-xs text-slate-400 mt-1">This month</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Products</p>
          <p className="text-2xl font-black text-slate-900">{d.totalProducts}</p>
          <p className="text-xs text-slate-400 mt-1">Active items</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Order Value</p>
          <p className="text-2xl font-black text-slate-900">Rs. {n0(d.avgOrderValue)}</p>
          <p className="text-xs text-slate-400 mt-1">Per transaction</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Sales Last 7 Days</h3>
          {d.dailySales.length > 0 ? (
            <div className="flex items-end gap-2 h-48">
              {d.dailySales.map((day, i) => {
                const heightPct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-gradient-to-t from-rose-400 to-rose-300 rounded-t-lg" style={{ height: `${Math.max(heightPct, 3)}%` }}></div>
                    <span className="text-[10px] text-slate-400 font-medium">{day.date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No sales data</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Top Products</h3>
          {d.topProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No sales yet</div>
          ) : (
            <div className="space-y-3">
              {d.topProducts.map((item, i) => {
                const pct = maxQty > 0 ? Math.floor((item.totalSold * 100) / maxQty) : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-slate-400">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{item.product?.name || item.productName}</p>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                        <div className="bg-gradient-to-r from-rose-400 to-orange-400 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-600">{item.totalSold}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Recent Sales</h3>
          <button onClick={() => navigate('/clothes/sales')} className="text-xs font-semibold text-rose-600 hover:text-rose-700">View All →</button>
        </div>
        {d.recentSales.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No recent transactions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Invoice', 'Customer', 'Date', 'Items', 'Payment'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">{h}</th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.recentSales.slice(0, 5).map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{sale.invoiceNumber}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">{sale.customerName || 'Walk-in'}</td>
                    <td className="px-6 py-3 text-slate-500">{fmtDateTime(sale.saleDate)}</td>
                    <td className="px-6 py-3 text-slate-600">{sale.items.length} pcs</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sale.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700' : sale.paymentMethod === 'Card' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-800">Rs. {n0(sale.totalAmount)}</td>
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

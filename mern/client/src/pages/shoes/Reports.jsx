import { useEffect, useState } from 'react';
import { shoesApi } from '../../services/shoesApi';
import { n0 } from '../../utils/format';

const PERIODS = [['Today', '1d'], ['7 Days', '7d'], ['30 Days', '30d'], ['90 Days', '90d'], ['All Time', 'all']];
const DAYS = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, all: 0 };

function getDateRange(period) {
  const now = new Date();
  const addDays = (n) => new Date(now.getTime() + n * 86400000);
  switch (period) {
    case '1d': return [new Date(now.getFullYear(), now.getMonth(), now.getDate()), now];
    case '7d': return [addDays(-7), now];
    case '30d': return [addDays(-30), now];
    case '90d': return [addDays(-90), now];
    default: return [null, null];
  }
}

export default function Reports() {
  const [period, setPeriod] = useState('7d');
  const [d, setD] = useState({ revenue: 0, orders: 0, avgOrder: 0, itemsSold: 0, topProducts: [], dailySales: [], paymentBreakdown: [] });

  const loadData = async (p) => {
    const [from, to] = getDateRange(p);
    const f = from ? from.toISOString() : undefined;
    const t = to ? to.toISOString() : undefined;

    const [stats, sales] = await Promise.all([shoesApi.getDashboardStats(f, t), shoesApi.getSales(f, t)]);
    const revenue = stats.data.revenue;
    const orders = stats.data.orders;
    const allSales = sales.data;

    const itemsSold = allSales.flatMap((s) => s.items).reduce((a, i) => a + i.quantity, 0);

    const groups = {};
    allSales.forEach((s) => {
      groups[s.paymentMethod] = groups[s.paymentMethod] || { method: s.paymentMethod, count: 0, revenue: 0 };
      groups[s.paymentMethod].count += 1;
      groups[s.paymentMethod].revenue += s.total;
    });
    const paymentBreakdown = Object.values(groups).sort((a, b) => b.revenue - a.revenue);
    ['Cash', 'Card', 'Digital'].forEach((m) => {
      if (!paymentBreakdown.some((x) => x.method === m)) paymentBreakdown.push({ method: m, count: 0, revenue: 0 });
    });

    setD({
      revenue,
      orders,
      avgOrder: orders > 0 ? revenue / orders : 0,
      itemsSold,
      topProducts: stats.data.topProducts,
      dailySales: stats.data.last7Days,
      paymentBreakdown,
    });
  };

  useEffect(() => {
    document.title = 'Reports & Analytics';
    loadData(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // (Re)render charts after data loads — same as OnAfterRenderAsync in the Blazor page
  useEffect(() => {
    try {
      const labels = d.dailySales.map((x) => new Date(x.date).toLocaleDateString('en-US', { weekday: 'short' }));
      window.renderSalesChart('revenueChart', labels, d.dailySales.map((x) => x.revenue));
    } catch {}
    try {
      // Same static split values as the original page
      window.renderDoughnutChart('categoryChart', ['Men', 'Women', 'Kids'], [45, 35, 20]);
    } catch {}
  }, [d.dailySales]);

  const periodDays = DAYS[period];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500">Productivity, revenue, and sales insights</p>
      </div>

      <div className="flex gap-2">
        {PERIODS.map(([label, val]) => (
          <button key={val} onClick={() => setPeriod(val)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${period === val ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'border-slate-200 text-slate-600 hover:border-purple-300 bg-white'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase mb-2">Revenue</p>
          <p className="text-3xl font-black text-slate-900">Rs. {n0(d.revenue)}</p>
          <p className="text-xs text-slate-400 mt-1">Last {periodDays} days</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase mb-2">Orders</p>
          <p className="text-3xl font-black text-purple-600">{d.orders}</p>
          <p className="text-xs text-slate-400 mt-1">Completed transactions</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase mb-2">Avg Order</p>
          <p className="text-3xl font-black text-slate-900">Rs. {n0(d.avgOrder)}</p>
          <p className="text-xs text-slate-400 mt-1">Per sale value</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase mb-2">Items Sold</p>
          <p className="text-3xl font-black text-green-600">{d.itemsSold}</p>
          <p className="text-xs text-slate-400 mt-1">Total units</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-black text-slate-900 mb-1">Daily Revenue</h3>
          <p className="text-xs text-slate-400 mb-5">Revenue breakdown by day</p>
          <canvas id="revenueChart" height="130"></canvas>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-black text-slate-900 mb-1">Category Split</h3>
          <p className="text-xs text-slate-400 mb-5">Sales by category</p>
          <canvas id="categoryChart" height="130"></canvas>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-black text-slate-900">Best Selling Products</h3>
          <p className="text-xs text-slate-400">Ranked by units sold in selected period</p>
        </div>
        {d.topProducts.length === 0 ? (
          <div className="text-center py-10 text-slate-300"><p>No sales data yet for this period</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-center">Units Sold</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-6 py-3 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.topProducts.map((p, i) => {
                  const pct = d.revenue > 0 ? (p.totalRevenue / d.revenue) * 100 : 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-400 text-sm">{i + 1}</td>
                      <td className="px-4 py-4 font-bold text-slate-900 text-sm">{p.productName}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-black text-purple-600">{p.totalQuantity}</span>
                        <span className="text-xs text-slate-400 ml-1">units</span>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">Rs. {n0(p.totalRevenue)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full">
                            <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-600">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-black text-slate-900 mb-5">Payment Method Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          {d.paymentBreakdown.map((pm) => (
            <div key={pm.method} className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-2xl font-black text-slate-900">{pm.count}</p>
              <p className="text-xs font-bold text-slate-400 mt-1">{pm.method}</p>
              <p className="text-sm font-bold text-purple-600 mt-0.5">Rs. {n0(pm.revenue)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

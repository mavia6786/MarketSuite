import { useEffect, useState } from 'react';
import { clothesApi } from '../../services/clothesApi';
import { n0 } from '../../utils/format';

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const dayLabel = (d) => `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('en-US', { month: 'short' })}`;

export default function ClothingReports() {
  const [reportPeriod, setReportPeriod] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [d, setD] = useState({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalItemsSold: 0, dailyRevenue: [], topProducts: [], categorySales: [], paymentBreakdown: [] });

  const loadData = async (period) => {
    setIsLoading(true);
    const now = new Date();
    const from = new Date(now.getTime() - period * 86400000);
    const f = from.toISOString();
    const t = now.toISOString();

    const [rangeRes, statsRes] = await Promise.all([clothesApi.getSalesByRange(f, t), clothesApi.getStats(f, t, 10)]);
    const sales = rangeRes.data;
    const totalRevenue = statsRes.data.revenue;
    const totalOrders = statsRes.data.transactions;
    const completed = sales.filter((s) => s.status === 'Completed');

    const days = Math.min(period, 30);
    const dailyRevenue = Array.from({ length: days }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1 + i);
      return { date, revenue: completed.filter((s) => sameDay(s.saleDate, date)).reduce((a, s) => a + s.totalAmount, 0) };
    });

    // Category sales: group line items by first word of product name (same as original)
    const catMap = {};
    completed.flatMap((s) => s.items).forEach((i) => {
      const key = i.productName.split(' ')[0];
      catMap[key] = catMap[key] || { category: key, revenue: 0, orderCount: 0 };
      catMap[key].revenue += i.lineTotal;
      catMap[key].orderCount += i.quantity;
    });
    const categorySales = Object.values(catMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const payMap = {};
    completed.forEach((s) => {
      payMap[s.paymentMethod] = payMap[s.paymentMethod] || { method: s.paymentMethod, revenue: 0, count: 0 };
      payMap[s.paymentMethod].revenue += s.totalAmount;
      payMap[s.paymentMethod].count += 1;
    });
    const paymentBreakdown = Object.values(payMap).sort((a, b) => b.revenue - a.revenue);

    setD({
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalItemsSold: sales.reduce((a, s) => a + s.totalItemCount, 0),
      dailyRevenue,
      topProducts: statsRes.data.topProducts,
      categorySales,
      paymentBreakdown,
    });
    setIsLoading(false);
  };

  useEffect(() => {
    document.title = 'Reports & Analytics';
    loadData(reportPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportPeriod]);

  const maxRev = Math.max(0, ...d.dailyRevenue.map((x) => x.revenue));
  const maxQty = Math.max(0, ...d.topProducts.map((x) => x.totalSold));
  const maxCat = Math.max(0, ...d.categorySales.map((x) => x.revenue));

  const metric = (label, bg, iconColor, iconPath, value, sub) => (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <svg className={`w-4 h-4 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconPath} /></svg>
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">📊 Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Insights into your clothing store performance</p>
        </div>
        <div className="flex gap-2">
          <select value={reportPeriod} onChange={(e) => setReportPeriod(Number(e.target.value))} className="px-4 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white">
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metric('Revenue', 'bg-green-100', 'text-green-600', 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', `Rs. ${n0(d.totalRevenue)}`, `${reportPeriod} days`)}
            {metric('Orders', 'bg-blue-100', 'text-blue-600', 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', d.totalOrders, `${reportPeriod} days`)}
            {metric('Avg Order', 'bg-purple-100', 'text-purple-600', 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', `Rs. ${n0(d.avgOrderValue)}`, 'Per transaction')}
            {metric('Items Sold', 'bg-rose-100', 'text-rose-600', 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', d.totalItemsSold, 'Units sold')}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Revenue Trend</h3>
            {d.dailyRevenue.length > 0 ? (
              <div className="flex items-end gap-1 h-56">
                {d.dailyRevenue.map((day, i) => {
                  const heightPct = maxRev > 0 ? (day.revenue / maxRev) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gradient-to-t from-rose-400 to-rose-300 rounded-t-md transition-all hover:from-rose-500 hover:to-rose-400 relative group" style={{ height: `${Math.max(heightPct, 5)}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Rs. {n0(day.revenue)}
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">{dayLabel(day.date)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data available for selected period</div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Top Selling Products</h3>
              {d.topProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No sales data</div>
              ) : (
                <div className="space-y-3">
                  {d.topProducts.map((item, i) => {
                    const pct = maxQty > 0 ? Math.floor((item.totalSold * 100) / maxQty) : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 text-xs font-bold text-slate-400 text-center">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{item.product?.name || item.productName}</p>
                          <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                            <div className="bg-gradient-to-r from-rose-400 to-orange-400 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700">{item.totalSold}</span>
                          <span className="text-[10px] text-slate-400 block">Rs. {n0(item.totalRevenue)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Sales by Category</h3>
              {d.categorySales.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No data available</div>
              ) : (
                <div className="space-y-3">
                  {d.categorySales.map((cat) => {
                    const pct = maxCat > 0 ? (cat.revenue / maxCat) * 100 : 0;
                    return (
                      <div key={cat.category} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center flex-shrink-0"><span className="text-xs">👕</span></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700">{cat.category}</p>
                          <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                            <div className="bg-gradient-to-r from-rose-400 to-orange-400 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-700">Rs. {n0(cat.revenue)}</span>
                          <span className="text-[10px] text-slate-400 block">{cat.orderCount} orders</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Payment Methods</h3>
            {d.paymentBreakdown.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No payment data</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {d.paymentBreakdown.map((p) => {
                  const pct = d.totalRevenue > 0 ? (p.revenue / d.totalRevenue) * 100 : 0;
                  return (
                    <div key={p.method} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-700">{p.method}</span>
                        <span className="text-xs font-bold text-slate-500">{pct.toFixed(1)}%</span>
                      </div>
                      <p className="text-xl font-black text-slate-900">Rs. {n0(p.revenue)}</p>
                      <p className="text-xs text-slate-500">{p.count} transactions</p>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full ${p.method === 'Cash' ? 'bg-green-500' : p.method === 'Card' ? 'bg-blue-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

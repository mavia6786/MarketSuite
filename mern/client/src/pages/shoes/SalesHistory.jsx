import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { shoesApi } from '../../services/shoesApi';
import { n0, paymentBadge, toInputDate } from '../../utils/format';

const fmtDay = (d) => {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')} ${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getFullYear()}`;
};
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const selCls = 'border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400';

export default function SalesHistory() {
  const { currentShop } = useAuth();
  const navigate = useNavigate();
  const [all, setAll] = useState([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewSale, setViewSale] = useState(null);

  const load = () => shoesApi.getSales().then(({ data }) => setAll(data));
  useEffect(() => {
    document.title = 'Sales History';
    load();
  }, []);

  const refundSale = async (sale) => {
    if (!window.confirm(`Refund ${sale.invoiceNumber}? Items go back into stock.`)) return;
    try {
      await shoesApi.refundSale(sale._id);
      setViewSale(null);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return all.filter(
      (s) =>
        (!term || s.invoiceNumber.toLowerCase().includes(term) || s.customerName.toLowerCase().includes(term)) &&
        (!paymentFilter || s.paymentMethod === paymentFilter) &&
        (!fromDate || toInputDate(s.saleDate) >= fromDate) &&
        (!toDate || toInputDate(s.saleDate) <= toDate)
    );
  }, [all, search, paymentFilter, fromDate, toDate]);

  const clearFilters = () => {
    setSearch('');
    setPaymentFilter('');
    setFromDate('');
    setToDate('');
  };

  const sumQty = (s) => s.items.reduce((a, i) => a + i.quantity, 0);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Sales History</h1>
            <p className="text-sm text-slate-500">All transactions from your store</p>
          </div>
          <button onClick={() => navigate('/dashboard/pos')} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 hover:scale-[1.02] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New Sale
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search invoice, customer..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={selCls} />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={selCls} />
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className={selCls}>
            <option value="">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Digital">Digital</option>
          </select>
          <button onClick={clearFilters} className="text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors">Clear</button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-900">{filtered.length}</p>
            <p className="text-xs text-slate-400 font-semibold">Total Transactions</p>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-purple-700">Rs. {n0(filtered.reduce((a, s) => a + s.total, 0))}</p>
            <p className="text-xs text-purple-400 font-semibold">Total Revenue</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-blue-700">{filtered.reduce((a, s) => a + sumQty(s), 0)}</p>
            <p className="text-xs text-blue-400 font-semibold">Total Items Sold</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Invoice</th>
                  <th className="px-4 py-4">Customer</th>
                  <th className="px-4 py-4">Date & Time</th>
                  <th className="px-4 py-4 text-center">Items</th>
                  <th className="px-4 py-4">Payment</th>
                  <th className="px-4 py-4">Discount</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-4 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-14 text-center text-slate-300">
                      <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                      <p className="font-semibold">No sales found</p>
                      <a href="/dashboard/pos" className="text-purple-600 text-sm font-bold mt-2 block hover:underline">Make your first sale →</a>
                    </td>
                  </tr>
                ) : (
                  filtered.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-black text-purple-600">
                        {sale.invoiceNumber}
                        {sale.status === 'Refunded' && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-sans text-[10px] font-bold">Refunded</span>}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-800">{sale.customerName}</p>
                        {sale.customerPhone && <p className="text-xs text-slate-400">{sale.customerPhone}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-slate-700">{fmtDay(sale.saleDate)}</p>
                        <p className="text-xs text-slate-400">{fmtTime(sale.saleDate)}</p>
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-bold text-slate-700">{sumQty(sale)} pcs</td>
                      <td className="px-4 py-4"><span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${paymentBadge(sale.paymentMethod)}`}>{sale.paymentMethod}</span></td>
                      <td className="px-4 py-4 text-sm text-green-600 font-semibold">{sale.discountAmount > 0 ? `− Rs. ${n0(sale.discountAmount)}` : '—'}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 text-base">Rs. {n0(sale.total)}</td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => setViewSale(sale)} className="text-xs font-bold text-purple-600 hover:text-purple-800 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors">View</button>
                        {sale.status !== 'Refunded' && (
                          <button onClick={() => refundSale(sale)} className="ml-2 text-xs font-bold text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Refund</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewSale(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center border-b border-slate-200 pb-5 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 mx-auto flex items-center justify-center mb-2">
                <span className="text-white font-black text-sm">SS</span>
              </div>
              <h3 className="font-black text-slate-900">{currentShop?.name}</h3>
              <p className="text-slate-400 text-xs">{currentShop?.address}, {currentShop?.city}</p>
            </div>

            <div className="flex justify-between mb-5 text-sm">
              <div><p className="text-slate-400 text-xs">INVOICE</p><p className="font-black text-purple-600">{viewSale.invoiceNumber}</p></div>
              <div className="text-right"><p className="text-slate-400 text-xs">DATE</p><p className="font-bold">{fmtDay(viewSale.saleDate)}, {fmtTime(viewSale.saleDate)}</p></div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-0.5">CUSTOMER</p>
              <p className="font-bold text-sm">{viewSale.customerName} {viewSale.customerPhone ? `| ${viewSale.customerPhone}` : ''}</p>
            </div>

            <table className="w-full text-sm mb-5">
              <thead>
                <tr className="border-y border-slate-200 text-[11px] text-slate-400 uppercase">
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-center">Size</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {viewSale.items.map((item) => (
                  <tr key={item._id} className="border-b border-slate-50">
                    <td className="py-2 font-semibold text-slate-800">{item.productName}</td>
                    <td className="py-2 text-center text-slate-500">{item.size}</td>
                    <td className="py-2 text-center text-slate-500">{item.quantity}</td>
                    <td className="py-2 text-right font-bold">Rs. {n0(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm mb-5">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>Rs. {n0(viewSale.subTotal)}</span></div>
              {viewSale.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>− Rs. {n0(viewSale.discountAmount)}</span></div>}
              <div className="flex justify-between font-black text-slate-900 text-base border-t border-slate-200 pt-2"><span>Total</span><span>Rs. {n0(viewSale.total)}</span></div>
              <div className="flex justify-between text-slate-400 text-xs"><span>Payment</span><span className="font-bold">{viewSale.paymentMethod}</span></div>
            </div>

            <p className="text-center text-xs text-slate-400 mb-5">Thank you for your purchase!</p>
            <button onClick={() => setViewSale(null)} className="w-full py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm">Close</button>
          </div>
        </div>
      )}
    </>
  );
}

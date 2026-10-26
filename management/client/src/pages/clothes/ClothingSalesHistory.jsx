import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { clothesApi } from '../../services/clothesApi';
import { n0, toInputDate } from '../../utils/format';

const th = 'px-6 py-3 text-xs font-bold text-slate-500 uppercase';
const dt = (d) => {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')} ${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getFullYear()}`;
};
const tm = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const payBadge = (m) => (m === 'Cash' ? 'bg-green-100 text-green-700' : m === 'Card' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700');

// yyyy-mm-dd -> local midnight Date
const parseLocal = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function ClothingSalesHistory() {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDate, setFromDate] = useState(toInputDate(new Date(Date.now() - 30 * 86400000)));
  const [toDate, setToDate] = useState(toInputDate(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  const loadSales = async (from = fromDate, to = toDate) => {
    setIsLoading(true);
    const start = parseLocal(from);
    const end = parseLocal(to);
    end.setDate(end.getDate() + 1);
    const { data } = await clothesApi.getSalesByRange(start.toISOString(), end.toISOString());
    setSales([...data].sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate)));
    setIsLoading(false);
  };

  useEffect(() => {
    document.title = 'Sales History';
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sales.filter((s) => {
      const matchesSearch = !q || s.invoiceNumber.toLowerCase().includes(q) || (s.customerName || '').toLowerCase().includes(q) || (s.customerPhone || '').toLowerCase().includes(q);
      return matchesSearch && (!filterPayment || s.paymentMethod === filterPayment);
    });
  }, [sales, searchQuery, filterPayment]);

  const downloadBill = async (sale) => {
    const { data: html } = await clothesApi.getBillHtml(sale._id);
    window.clothingBillPrint(html);
  };

  const refundSale = async (sale) => {
    if (!window.confirm(`Refund sale ${sale.invoiceNumber}? This will restore stock.`)) return;
    try {
      await clothesApi.refundSale(sale._id);
      await loadSales();
    } catch (err) {
      window.alert(`Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🧾 Sales History</h1>
            <p className="text-slate-500 mt-1">View and manage all clothing sales transactions</p>
          </div>
          <Link to="/clothes/pos" className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            New Sale
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">From</label>
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); if (e.target.value) loadSales(e.target.value, toDate); }} className="px-3 py-2 rounded-lg border border-slate-200 focus:border-rose-500 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">To</label>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); if (e.target.value) loadSales(fromDate, e.target.value); }} className="px-3 py-2 rounded-lg border border-slate-200 focus:border-rose-500 outline-none text-sm" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Search</label>
              <div className="relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-rose-500 outline-none text-sm" placeholder="Invoice #, customer..." />
              </div>
            </div>
            <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white">
              <option value="">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Online">Online</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase">Total Sales</p>
            <p className="text-2xl font-black text-slate-900 mt-1">Rs. {n0(filtered.reduce((a, s) => a + s.totalAmount, 0))}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase">Transactions</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase">Items Sold</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{filtered.reduce((a, s) => a + s.totalItemCount, 0)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <p className="text-lg font-medium text-slate-500">No sales found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your date range or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={`${th} text-left`}>Invoice</th>
                    <th className={`${th} text-left`}>Customer</th>
                    <th className={`${th} text-left`}>Date</th>
                    <th className={`${th} text-left`}>Items</th>
                    <th className={`${th} text-left`}>Payment</th>
                    <th className={`${th} text-right`}>Total</th>
                    <th className={`${th} text-center`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedSale(sale)}>
                      <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">{sale.invoiceNumber}</span></td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800">{sale.customerName || 'Walk-in'}</p>
                        {sale.customerPhone && <p className="text-xs text-slate-500">{sale.customerPhone}</p>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{dt(sale.saleDate)}, {tm(sale.saleDate)}</td>
                      <td className="px-6 py-4"><span className="font-bold text-slate-800">{sale.totalItemCount}</span><span className="text-xs text-slate-400"> pcs</span></td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${payBadge(sale.paymentMethod)}`}>{sale.paymentMethod}</span></td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-slate-800">Rs. {n0(sale.totalAmount)}</p>
                        {sale.discountAmount > 0 && <p className="text-xs text-green-600">Saved Rs. {n0(sale.discountAmount)}</p>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={(e) => { e.stopPropagation(); downloadBill(sale); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Download Bill"><DownloadIcon /></button>
                        {sale.status !== 'Refunded' && (
                          <button onClick={(e) => { e.stopPropagation(); refundSale(sale); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Refund">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Sale Details</h3>
                <p className="text-sm text-slate-500">{selectedSale.invoiceNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadBill(selectedSale)} className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all flex items-center gap-2">
                  <DownloadIcon />
                  Download PDF
                </button>
                <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase font-bold">Customer</p>
                <p className="font-bold text-slate-800">{selectedSale.customerName || 'Walk-in'}</p>
                <p className="text-sm text-slate-500">{selectedSale.customerPhone}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase font-bold">Date & Time</p>
                <p className="font-bold text-slate-800">{dt(selectedSale.saleDate)}</p>
                <p className="text-sm text-slate-500">{tm(selectedSale.saleDate)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase font-bold">Payment</p>
                <p className="font-bold text-slate-800">{selectedSale.paymentMethod}</p>
                <p className="text-sm text-slate-500">Paid: Rs. {n0(selectedSale.amountPaid)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${selectedSale.status === 'Completed' ? 'bg-green-100 text-green-700' : selectedSale.status === 'Refunded' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {selectedSale.status}
                </span>
                {selectedSale.salesmanName && <p className="text-sm text-slate-500 mt-1">By: {selectedSale.salesmanName}</p>}
              </div>
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-3">Items</h4>
            <div className="space-y-2 mb-6">
              {selectedSale.items.map((item) => (
                <div key={item._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center"><span className="text-lg">👕</span></div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{item.productName}</p>
                      <p className="text-xs text-slate-500">{item.size || '-'} / {item.color || '-'} &nbsp;•&nbsp; Qty: {item.quantity} &nbsp;×&nbsp; Rs. {n0(item.unitPrice)}</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-800">Rs. {n0(item.lineTotal)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-medium">Rs. {n0(selectedSale.subTotal)}</span></div>
              {selectedSale.discountAmount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span className="font-medium">-Rs. {n0(selectedSale.discountAmount)}</span></div>}
              {selectedSale.taxAmount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Tax</span><span className="font-medium">Rs. {n0(selectedSale.taxAmount)}</span></div>}
              <div className="flex justify-between text-lg font-black pt-2"><span className="text-slate-800">Total</span><span className="text-rose-600">Rs. {n0(selectedSale.totalAmount)}</span></div>
            </div>
            {selectedSale.notes && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-bold text-amber-700 uppercase">Notes</p>
                <p className="text-sm text-amber-800 mt-1">{selectedSale.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

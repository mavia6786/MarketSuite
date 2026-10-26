import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supplierApi } from '../../services/miscApi';
import { shoesApi } from '../../services/shoesApi';
import { clothesApi } from '../../services/clothesApi';
import { themeOf } from '../../utils/theme';
import { n0, fmtDate, toInputDate } from '../../utils/format';

const fld = 'w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white';
const th = 'px-4 py-3 text-xs font-bold text-slate-500 uppercase text-left';
const STATUS_CLS = {
  Pending: 'bg-amber-100 text-amber-700', Confirmed: 'bg-blue-100 text-blue-700',
  Delivered: 'bg-green-100 text-green-700', Cancelled: 'bg-slate-200 text-slate-500',
};
const EMPTY_SUP = { companyName: '', contactPerson: '', phone: '', email: '', city: '', address: '', productsSupplied: '', notes: '' };
const blankLine = () => ({ productId: '', productName: '', quantity: 1, unitCost: '' });

function Modal({ title, onClose, children, width = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${width} p-6 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const Stat = ({ label, value, tone = 'text-slate-900', sub }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
    <p className="text-xs text-slate-500 font-semibold">{label}</p>
    <p className={`text-xl font-black mt-1 ${tone}`}>{value}</p>
    {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

export default function SuppliersPage({ vertical }) {
  const t = themeOf(vertical);
  const navigate = useNavigate();
  const location = useLocation();
  const productsApi = vertical === 'clothes' ? clothesApi : shoesApi;

  const [tab, setTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [supFilter, setSupFilter] = useState('');

  const [supModal, setSupModal] = useState(null);       // {id, form}
  const [ledger, setLedger] = useState(null);           // supplier detail
  const [orderModal, setOrderModal] = useState(null);   // {supplierId, lines, initialPayment, ...}
  const [payModal, setPayModal] = useState(null);       // {order, amount, method, date, note}
  const [openOrder, setOpenOrder] = useState(null);     // order id with payments expanded

  const notify = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 6000);
  };
  const fail = (err) => notify('error', err.response?.data?.message || err.message);

  const load = useCallback(async () => {
    const [s, o, ov] = await Promise.all([supplierApi.getAll(), supplierApi.getOrders(), supplierApi.getOverview()]);
    setSuppliers(s.data);
    setOrders(o.data);
    setOverview(ov.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    document.title = 'Suppliers';
    load().catch(fail);
    productsApi.getProducts().then(({ data }) => setProducts(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // arrive from the Forecast page's "reorder" suggestions → open a prefilled order
  useEffect(() => {
    const prefill = location.state?.prefillItems;
    if (prefill?.length && suppliers.length) {
      setOrderModal({
        supplierId: suppliers[0]._id, initialPayment: '', paymentMethod: 'Cash', expectedDelivery: '', notes: 'Reorder from forecast suggestions',
        lines: prefill.map((p) => ({ productId: p.productId, productName: p.name, quantity: p.suggestedQty, unitCost: p.costPrice || '' })),
      });
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers.length]);

  const refreshLedger = async (id) => {
    const { data } = await supplierApi.getById(id);
    setLedger(data);
  };
  const afterChange = async () => {
    await load();
    if (ledger) await refreshLedger(ledger._id);
  };

  // ── suppliers ─────────────────────────────────────────────────────────────
  const saveSupplier = async () => {
    const f = supModal.form;
    if (!f.companyName.trim()) return setSupModal({ ...supModal, err: 'Company name is required' });
    try {
      if (supModal.id) await supplierApi.update(supModal.id, f);
      else await supplierApi.create(f);
      setSupModal(null);
      await afterChange();
    } catch (err) { setSupModal({ ...supModal, err: err.response?.data?.message || err.message }); }
  };
  const deleteSupplier = async (s) => {
    if (!window.confirm(`Remove ${s.companyName}? Their past orders stay in your records.`)) return;
    try { await supplierApi.remove(s._id); setLedger(null); await load(); } catch (err) { fail(err); }
  };

  // ── order ─────────────────────────────────────────────────────────────────
  const openNewOrder = (supplierId = '') =>
    setOrderModal({ supplierId: supplierId || suppliers[0]?._id || '', lines: [blankLine()], initialPayment: '', paymentMethod: 'Cash', expectedDelivery: '', notes: '' });

  const orderTotal = useMemo(
    () => (orderModal ? orderModal.lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0) : 0),
    [orderModal]
  );
  const setLine = (i, patch) => setOrderModal((m) => ({ ...m, lines: m.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  const pickProduct = (i, id) => {
    const p = products.find((x) => x._id === id);
    setLine(i, p ? { productId: p._id, productName: p.name, unitCost: p.costPrice || '' } : { productId: '', productName: '' });
  };

  const saveOrder = async () => {
    const lines = orderModal.lines.filter((l) => l.productName.trim() && Number(l.quantity) > 0);
    if (!orderModal.supplierId) return setOrderModal({ ...orderModal, err: 'Choose a supplier' });
    if (!lines.length) return setOrderModal({ ...orderModal, err: 'Add at least one item' });
    if (lines.some((l) => !(Number(l.unitCost) > 0))) return setOrderModal({ ...orderModal, err: 'Enter the cost per unit for every item' });
    if (Number(orderModal.initialPayment) > orderTotal) return setOrderModal({ ...orderModal, err: 'Advance payment is more than the order total' });
    try {
      await supplierApi.createOrder({
        supplierId: orderModal.supplierId,
        items: lines.map((l) => ({ productId: l.productId || null, productName: l.productName.trim(), quantity: Number(l.quantity), unitCost: Number(l.unitCost) })),
        initialPayment: Number(orderModal.initialPayment) || 0,
        paymentMethod: orderModal.paymentMethod,
        expectedDelivery: orderModal.expectedDelivery || null,
        notes: orderModal.notes,
      });
      setOrderModal(null);
      notify('success', 'Purchase order created');
      setTab('orders');
      await afterChange();
    } catch (err) { setOrderModal({ ...orderModal, err: err.response?.data?.message || err.message }); }
  };

  const receive = async (o) => {
    const unlinked = o.items.filter((i) => !i.productId).length;
    const warn = unlinked ? `\n\n${unlinked} item(s) are not linked to a product, so their stock won't be added automatically.` : '';
    if (!window.confirm(`Mark ${o.orderNumber} as received and add ${o.totalUnits} unit(s) to inventory?${warn}`)) return;
    try {
      const { data } = await supplierApi.receiveOrder(o._id);
      notify('success', data.skipped?.length ? `Received. Not added to stock (no linked product): ${data.skipped.join(', ')}` : 'Stock received and inventory updated');
      productsApi.getProducts().then(({ data: p }) => setProducts(p));
      await afterChange();
    } catch (err) { fail(err); }
  };
  const cancel = async (o) => {
    if (!window.confirm(`Cancel ${o.orderNumber}?`)) return;
    try { await supplierApi.cancelOrder(o._id); await afterChange(); } catch (err) { fail(err); }
  };
  const confirmPay = async () => {
    const { order, amount, method, date, note } = payModal;
    if (!(Number(amount) > 0)) return setPayModal({ ...payModal, err: 'Enter an amount' });
    try {
      await supplierApi.addPayment(order._id, { amount: Number(amount), method, date, note });
      setPayModal(null);
      notify('success', 'Payment recorded');
      await afterChange();
    } catch (err) { setPayModal({ ...payModal, err: err.response?.data?.message || err.message }); }
  };
  const removePayment = async (o, p) => {
    if (!window.confirm(`Remove payment of Rs. ${n0(p.amount)}?`)) return;
    try { await supplierApi.removePayment(o._id, p._id); await afterChange(); } catch (err) { fail(err); }
  };

  const shownOrders = orders.filter((o) => (!statusFilter || o.status === statusFilter) && (!supFilter || (o.supplierId?._id || o.supplierId) === supFilter));

  const supName = (o) => o.supplierId?.companyName || suppliers.find((s) => s._id === o.supplierId)?.companyName || '—';

  const OrderCard = ({ o, showSupplier }) => {
    const pending = o.totalAmount - o.paidAmount;
    const open = openOrder === o._id;
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="min-w-[150px]">
            <p className="font-mono text-xs font-black text-slate-700">{o.orderNumber}</p>
            <p className="text-xs text-slate-400">{fmtDate(o.orderDate)}{showSupplier ? ` · ${supName(o)}` : ''}</p>
          </div>
          <div className="flex-1 min-w-[200px] text-xs text-slate-600">
            {o.items?.length ? o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ') : o.itemsDescription || '—'}
            {o.totalUnits > 0 && <span className="ml-2 text-slate-400">({o.totalUnits} units)</span>}
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_CLS[o.status] || 'bg-slate-100'}`}>{o.status}</span>
          <div className="text-right text-xs min-w-[170px]">
            <p>Total <b>Rs. {n0(o.totalAmount)}</b></p>
            <p className="text-green-600">Paid Rs. {n0(o.paidAmount)}</p>
            <p className={pending > 0 && o.status !== 'Cancelled' ? 'text-red-600 font-bold' : 'text-slate-400'}>{o.status === 'Cancelled' ? '—' : pending > 0 ? `Pending Rs. ${n0(pending)}` : 'Fully paid ✓'}</p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {o.status !== 'Cancelled' && pending > 0 && (
              <button onClick={() => setPayModal({ order: o, amount: pending, method: 'Cash', date: toInputDate(new Date()), note: '' })} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">Pay</button>
            )}
            {o.status !== 'Cancelled' && !o.stockApplied && (
              <button onClick={() => receive(o)} className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${t.btn}`}>Receive stock</button>
            )}
            {o.status !== 'Cancelled' && !o.stockApplied && (
              <button onClick={() => cancel(o)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Cancel</button>
            )}
            <button onClick={() => setOpenOrder(open ? null : o._id)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">Payments ({o.payments?.length || 0})</button>
          </div>
        </div>
        {open && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs">
            {o.paidAmount > (o.payments || []).reduce((a, p) => a + p.amount, 0) && (
              <p className="text-slate-500 mb-1">Opening paid balance (before payment tracking): Rs. {n0(o.paidAmount - (o.payments || []).reduce((a, p) => a + p.amount, 0))}</p>
            )}
            {(o.payments || []).length === 0 ? <p className="text-slate-400">No payments recorded yet.</p> : (
              <div className="space-y-1">
                {o.payments.map((p) => (
                  <div key={p._id} className="flex items-center gap-3">
                    <span className="w-24 text-slate-500">{fmtDate(p.date)}</span>
                    <b className="w-28">Rs. {n0(p.amount)}</b>
                    <span className="text-slate-500">{p.method}</span>
                    {p.note && <span className="text-slate-400">· {p.note}</span>}
                    <button onClick={() => removePayment(o, p)} className="ml-auto text-red-500 font-bold">Remove</button>
                  </div>
                ))}
              </div>
            )}
            {o.stockApplied && <p className="mt-2 text-green-700 font-semibold">✓ Stock received {o.actualDelivery ? `on ${fmtDate(o.actualDelivery)}` : ''} and added to inventory</p>}
            {o.notes && <p className="mt-1 text-slate-400">Note: {o.notes}</p>}
          </div>
        )}
      </div>
    );
  };

  const Spinner = () => <div className="flex justify-center py-16"><div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${t.spin}`}></div></div>;
  const setSF = (k) => (e) => setSupModal((m) => ({ ...m, form: { ...m.form, [k]: e.target.value } }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">Who you buy from, how much stock came in, what you paid and what is still due</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSupModal({ id: null, form: { ...EMPTY_SUP } })} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">+ Add Supplier</button>
          <button onClick={() => openNewOrder()} disabled={!suppliers.length} className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow disabled:opacity-40 ${t.btn}`}>+ New Purchase Order</button>
        </div>
      </div>

      {msg.text && <div className={`rounded-xl px-4 py-3 text-sm border ${msg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>{msg.text}</div>}

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Total purchased" value={`Rs. ${n0(overview.totalPurchased)}`} />
          <Stat label="Total paid" value={`Rs. ${n0(overview.totalPaid)}`} tone="text-green-600" />
          <Stat label="Pending dues" value={`Rs. ${n0(overview.totalPending)}`} tone={overview.totalPending > 0 ? 'text-red-600' : 'text-green-600'} />
          <Stat label="Open deliveries" value={overview.openDeliveries} sub="orders not received yet" />
          <Stat label="Purchased this month" value={`Rs. ${n0(overview.purchasedThisMonth)}`} sub={`Paid this month Rs. ${n0(overview.paidThisMonth)}`} />
        </div>
      )}

      <div className="flex gap-6 border-b border-slate-200">
        {[['suppliers', `Suppliers (${suppliers.length})`], ['orders', `Purchase Orders (${orders.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`pb-3 text-sm font-bold border-b-2 -mb-px ${tab === k ? t.tabOn : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>

      {loading ? <Spinner /> : tab === 'suppliers' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><th className={th}>Supplier</th><th className={th}>Supplies</th><th className={`${th} text-center`}>Orders</th><th className={`${th} text-center`}>Units received</th><th className={`${th} text-right`}>Purchased</th><th className={`${th} text-right`}>Paid</th><th className={`${th} text-right`}>Pending</th><th className={`${th} text-right`}>Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.length === 0 && <tr><td colSpan="8" className="p-8 text-center text-slate-400">No suppliers yet. Add your first supplier.</td></tr>}
              {suppliers.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3"><p className="font-bold text-slate-800">{s.companyName}</p><p className="text-xs text-slate-400">{[s.contactPerson, s.phone, s.city].filter(Boolean).join(' · ')}</p></td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">{s.productsSupplied || '—'}</td>
                  <td className="px-4 py-3 text-center">{s.stats.totalOrders}{s.stats.pendingDeliveries > 0 && <span className="ml-1 text-[10px] text-amber-600 font-bold">({s.stats.pendingDeliveries} open)</span>}</td>
                  <td className="px-4 py-3 text-center font-semibold">{n0(s.stats.unitsReceived)}</td>
                  <td className="px-4 py-3 text-right">Rs. {n0(s.stats.totalPurchased)}</td>
                  <td className="px-4 py-3 text-right text-green-600">Rs. {n0(s.stats.totalPaid)}</td>
                  <td className={`px-4 py-3 text-right font-black ${s.stats.totalPending > 0 ? 'text-red-600' : 'text-green-600'}`}>{s.stats.totalPending > 0 ? `Rs. ${n0(s.stats.totalPending)}` : 'Clear ✓'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => refreshLedger(s._id)} className={`text-xs font-bold px-2.5 py-1 rounded-lg mr-1 ${t.btnSoft}`}>Ledger</button>
                    <button onClick={() => openNewOrder(s._id)} className="text-xs font-bold px-2.5 py-1 rounded-lg mr-1 bg-slate-100 text-slate-600 hover:bg-slate-200">+ Order</button>
                    <button onClick={() => setSupModal({ id: s._id, form: { ...EMPTY_SUP, ...s } })} className="text-xs font-bold px-2.5 py-1 rounded-lg mr-1 bg-slate-100 text-slate-600 hover:bg-slate-200">Edit</button>
                    <button onClick={() => deleteSupplier(s)} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select value={supFilter} onChange={(e) => setSupFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="">All suppliers</option>{suppliers.map((s) => <option key={s._id} value={s._id}>{s.companyName}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
              <option value="">All status</option>{Object.keys(STATUS_CLS).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {shownOrders.length === 0 ? <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">No purchase orders match.</div> : shownOrders.map((o) => <OrderCard key={o._id} o={o} showSupplier />)}
        </div>
      )}

      {/* ledger */}
      {ledger && (
        <Modal title={`${ledger.companyName} — ledger`} onClose={() => setLedger(null)} width="max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat label="Total purchased" value={`Rs. ${n0(ledger.stats.totalPurchased)}`} />
            <Stat label="Paid" value={`Rs. ${n0(ledger.stats.totalPaid)}`} tone="text-green-600" />
            <Stat label="Pending" value={`Rs. ${n0(ledger.stats.totalPending)}`} tone={ledger.stats.totalPending > 0 ? 'text-red-600' : 'text-green-600'} />
            <Stat label="Units received" value={n0(ledger.stats.unitsReceived)} sub={`${ledger.stats.totalOrders} orders`} />
          </div>
          <p className="text-xs text-slate-500 mb-3">{[ledger.contactPerson, ledger.phone, ledger.email, ledger.city].filter(Boolean).join(' · ')}</p>
          <div className="space-y-3">
            {ledger.orders.length === 0 ? <p className="text-center text-slate-400 text-sm py-6">No orders with this supplier yet.</p> : ledger.orders.map((o) => <OrderCard key={o._id} o={o} />)}
          </div>
          <div className="mt-4 text-right"><button onClick={() => { const id = ledger._id; setLedger(null); openNewOrder(id); }} className={`px-4 py-2 rounded-xl text-sm font-bold ${t.btn}`}>+ New order</button></div>
        </Modal>
      )}

      {/* supplier form */}
      {supModal && (
        <Modal title={supModal.id ? 'Edit supplier' : 'Add supplier'} onClose={() => setSupModal(null)} width="max-w-lg">
          {supModal.err && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{supModal.err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs font-bold text-slate-600">Company name *<input className={`${fld} ${t.ring}`} value={supModal.form.companyName} onChange={setSF('companyName')} /></label>
            <label className="text-xs font-bold text-slate-600">Contact person<input className={`${fld} ${t.ring}`} value={supModal.form.contactPerson} onChange={setSF('contactPerson')} /></label>
            <label className="text-xs font-bold text-slate-600">Phone<input className={`${fld} ${t.ring}`} value={supModal.form.phone} onChange={setSF('phone')} /></label>
            <label className="text-xs font-bold text-slate-600">Email<input className={`${fld} ${t.ring}`} value={supModal.form.email} onChange={setSF('email')} /></label>
            <label className="text-xs font-bold text-slate-600">City<input className={`${fld} ${t.ring}`} value={supModal.form.city} onChange={setSF('city')} /></label>
            <label className="col-span-2 text-xs font-bold text-slate-600">What they supply<input className={`${fld} ${t.ring}`} value={supModal.form.productsSupplied} onChange={setSF('productsSupplied')} /></label>
            <label className="col-span-2 text-xs font-bold text-slate-600">Notes<input className={`${fld} ${t.ring}`} value={supModal.form.notes} onChange={setSF('notes')} /></label>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setSupModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={saveSupplier} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${t.btn}`}>Save</button>
          </div>
        </Modal>
      )}

      {/* new order */}
      {orderModal && (
        <Modal title="New purchase order" onClose={() => setOrderModal(null)} width="max-w-3xl">
          {orderModal.err && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{orderModal.err}</div>}
          <label className="text-xs font-bold text-slate-600">Supplier
            <select className={`${fld} ${t.ring}`} value={orderModal.supplierId} onChange={(e) => setOrderModal({ ...orderModal, supplierId: e.target.value })}>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.companyName}</option>)}
            </select>
          </label>
          <p className="text-xs font-bold text-slate-600 mt-4 mb-1">Items</p>
          <div className="space-y-2">
            {orderModal.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select className="col-span-5 px-2 py-2 rounded-lg border border-slate-200 text-sm bg-white" value={l.productId} onChange={(e) => pickProduct(i, e.target.value)}>
                  <option value="">Other / not in inventory…</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.name} (stock {p.stockQuantity})</option>)}
                </select>
                {!l.productId
                  ? <input className="col-span-3 px-2 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Item name" value={l.productName} onChange={(e) => setLine(i, { productName: e.target.value })} />
                  : <div className="col-span-3 text-xs text-slate-400 px-1 truncate">linked to inventory</div>}
                <input type="number" min="1" className="col-span-1 px-2 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                <input type="number" min="0" className="col-span-2 px-2 py-2 rounded-lg border border-slate-200 text-sm" placeholder="Cost/unit" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} />
                <button onClick={() => setOrderModal((m) => ({ ...m, lines: m.lines.length > 1 ? m.lines.filter((_, idx) => idx !== i) : m.lines }))} className="col-span-1 text-red-500 font-bold text-lg">×</button>
              </div>
            ))}
          </div>
          <button onClick={() => setOrderModal((m) => ({ ...m, lines: [...m.lines, blankLine()] }))} className={`mt-2 text-xs font-bold px-3 py-1.5 rounded-lg ${t.btnSoft}`}>+ Add item</button>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[11px] text-slate-500 font-semibold">Order total</p><p className="text-lg font-black">Rs. {n0(orderTotal)}</p></div>
            <label className="text-xs font-bold text-slate-600">Advance paid now<input type="number" min="0" className={`${fld} ${t.ring}`} value={orderModal.initialPayment} onChange={(e) => setOrderModal({ ...orderModal, initialPayment: e.target.value })} /></label>
            <label className="text-xs font-bold text-slate-600">Method
              <select className={`${fld} ${t.ring}`} value={orderModal.paymentMethod} onChange={(e) => setOrderModal({ ...orderModal, paymentMethod: e.target.value })}>
                {['Cash', 'Bank', 'Cheque', 'JazzCash/EasyPaisa'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Expected delivery<input type="date" className={`${fld} ${t.ring}`} value={orderModal.expectedDelivery} onChange={(e) => setOrderModal({ ...orderModal, expectedDelivery: e.target.value })} /></label>
          </div>
          <p className="text-xs text-slate-500 mt-2">Pending after advance: <b className="text-red-600">Rs. {n0(Math.max(0, orderTotal - (Number(orderModal.initialPayment) || 0)))}</b></p>
          <label className="block mt-3 text-xs font-bold text-slate-600">Notes<input className={`${fld} ${t.ring}`} value={orderModal.notes} onChange={(e) => setOrderModal({ ...orderModal, notes: e.target.value })} /></label>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setOrderModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={saveOrder} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${t.btn}`}>Create order</button>
          </div>
        </Modal>
      )}

      {/* payment */}
      {payModal && (
        <Modal title={`Pay supplier — ${payModal.order.orderNumber}`} onClose={() => setPayModal(null)}>
          {payModal.err && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{payModal.err}</div>}
          <div className="bg-slate-50 rounded-xl p-3 text-sm mb-3 flex justify-between"><span className="text-slate-500">Pending on this order</span><b className="text-red-600">Rs. {n0(payModal.order.totalAmount - payModal.order.paidAmount)}</b></div>
          <label className="text-xs font-bold text-slate-600">Amount (Rs.)<input type="number" min="1" className={`${fld} ${t.ring}`} value={payModal.amount} onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="text-xs font-bold text-slate-600">Method
              <select className={`${fld} ${t.ring}`} value={payModal.method} onChange={(e) => setPayModal({ ...payModal, method: e.target.value })}>
                {['Cash', 'Bank', 'Cheque', 'JazzCash/EasyPaisa'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Date<input type="date" className={`${fld} ${t.ring}`} value={payModal.date} onChange={(e) => setPayModal({ ...payModal, date: e.target.value })} /></label>
          </div>
          <label className="block mt-3 text-xs font-bold text-slate-600">Note<input className={`${fld} ${t.ring}`} value={payModal.note} onChange={(e) => setPayModal({ ...payModal, note: e.target.value })} /></label>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setPayModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={confirmPay} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white">Record payment</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

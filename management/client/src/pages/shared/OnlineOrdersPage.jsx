import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { onlineOrdersApi } from '../../services/onlineOrdersApi';
import { n0, fmtDateTime } from '../../utils/format';

const STATUSES = ['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
const STATUS_COLORS = {
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  Shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Delivered: 'bg-green-100 text-green-700 border-green-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};
const NEXT_ACTION = {
  Pending: { label: 'Confirm Order', next: 'Confirmed', color: 'bg-blue-600 hover:bg-blue-700' },
  Confirmed: { label: 'Mark Shipped', next: 'Shipped', color: 'bg-indigo-600 hover:bg-indigo-700' },
  Shipped: { label: 'Mark Delivered', next: 'Delivered', color: 'bg-green-600 hover:bg-green-700' },
};

const inputCls = 'border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400 w-full';
const btnCls = 'text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-colors';

export default function OnlineOrdersPage() {
  const { currentShop } = useAuth();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [cancelNote, setCancelNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search.trim()) params.q = search.trim();
      const { data } = await onlineOrdersApi.getOrders(params);
      setOrders(data.data?.items || []);
      setTotal(data.data?.total || 0);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Online Orders';
    load();
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const updateStatus = async (orderId, newStatus, note) => {
    try {
      await onlineOrdersApi.updateStatus(orderId, newStatus, note);
      await load();
      if (viewOrder && viewOrder._id === orderId) {
        const { data } = await onlineOrdersApi.getOrder(orderId);
        setViewOrder(data.data);
      }
    } catch (err) {
      window.alert(err.response?.data?.message || err.message || 'Failed to update');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const stats = useMemo(() => {
    const s = { Pending: 0, Confirmed: 0, Shipped: 0, Delivered: 0, Cancelled: 0 };
    orders.forEach((o) => { if (s[o.status] !== undefined) s[o.status]++; });
    return s;
  }, [orders]);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', ui-sans-serif, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e2a78', margin: 0 }}>
            📦 Online Orders
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.77rem', color: '#94a3c8' }}>
            Manage customer orders from the online storefront
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Pending', 'Confirmed', 'Shipped'].map((s) => (
            <span key={s} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: s === 'Pending' ? '#fef3c7' : s === 'Confirmed' ? '#dbeafe' : '#e0e7ff', color: s === 'Pending' ? '#92400e' : s === 'Confirmed' ? '#1d4ed8' : '#4338ca' }}>
              {stats[s]} {s}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order #, name, or phone..."
          className={inputCls}
          style={{ maxWidth: 280 }}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{
                fontSize: '0.72rem', fontWeight: statusFilter === s ? 700 : 500, padding: '6px 14px', borderRadius: 8,
                border: statusFilter === s ? '2px solid #6366f1' : '1px solid #e2e8f0',
                background: statusFilter === s ? '#eef2ff' : '#fff',
                color: statusFilter === s ? '#4338ca' : '#64748b',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e0e7ff', overflow: 'hidden', boxShadow: '0 1px 8px rgba(99,102,241,0.06)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3c8' }}>Loading orders…</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3c8' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>No orders found</p>
            <p style={{ fontSize: '0.8rem', margin: '8px 0 0' }}>
              {statusFilter !== 'All' ? `No ${statusFilter.toLowerCase()} orders.` : 'Online orders from the Store will appear here once customers start ordering.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e0e7ff' }}>
                {['Order #', 'Customer', 'Phone', 'Items', 'Total', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', fontWeight: 700, color: '#64748b', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const action = NEXT_ACTION[o.status];
                return (
                  <tr key={o._id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => setViewOrder(o)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: '#4338ca' }}>{o.orderNumber}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{o.customer?.name}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{o.customer?.phone}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{o.items?.reduce((a, i) => a + i.quantity, 0)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>Rs {n0(o.total)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, display: 'inline-block',
                        background: o.status === 'Pending' ? '#fef3c7' : o.status === 'Confirmed' ? '#dbeafe' : o.status === 'Shipped' ? '#e0e7ff' : o.status === 'Delivered' ? '#dcfce7' : '#fee2e2',
                        color: o.status === 'Pending' ? '#92400e' : o.status === 'Confirmed' ? '#1d4ed8' : o.status === 'Shipped' ? '#4338ca' : o.status === 'Delivered' ? '#166534' : '#dc2626',
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3c8', fontSize: '0.72rem' }}>{fmtDateTime(o.createdAt)}</td>
                    <td style={{ padding: '10px 12px' }} onClick={(e) => e.stopPropagation()}>
                      {action && (
                        <button
                          className={`${btnCls} ${action.color}`}
                          onClick={() => updateStatus(o._id, action.next, `${action.next} by staff`)}
                        >
                          {action.label}
                        </button>
                      )}
                      {o.status !== 'Cancelled' && o.status !== 'Delivered' && (
                        <button
                          className={`${btnCls} bg-red-500 hover:bg-red-600`}
                          style={{ marginLeft: 6 }}
                          onClick={() => { setViewOrder(o); setCancelNote(''); }}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: 600, borderRadius: 8, border: '1px solid #e2e8f0', cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.4 : 1, background: '#fff' }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: 600, borderRadius: 8, border: '1px solid #e2e8f0', cursor: page < totalPages ? 'pointer' : 'not-allowed', opacity: page >= totalPages ? 0.4 : 1, background: '#fff' }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      {viewOrder && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setViewOrder(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, width: '95%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', padding: '24px 28px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e2a78', margin: 0 }}>
                  Order {viewOrder.orderNumber}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#94a3c8', margin: '4px 0 0' }}>
                  {fmtDateTime(viewOrder.createdAt)} • {viewOrder.paymentMethod || 'COD'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: 8,
                  background: viewOrder.status === 'Pending' ? '#fef3c7' : viewOrder.status === 'Confirmed' ? '#dbeafe' : viewOrder.status === 'Shipped' ? '#e0e7ff' : viewOrder.status === 'Delivered' ? '#dcfce7' : '#fee2e2',
                  color: viewOrder.status === 'Pending' ? '#92400e' : viewOrder.status === 'Confirmed' ? '#1d4ed8' : viewOrder.status === 'Shipped' ? '#4338ca' : viewOrder.status === 'Delivered' ? '#166534' : '#dc2626',
                }}>
                  {viewOrder.status}
                </span>
                <button onClick={() => setViewOrder(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#94a3c8', cursor: 'pointer', padding: 2 }}>×</button>
              </div>
            </div>

            {/* Customer Info */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 14, border: '1px solid #e0e7ff' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3c8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Customer Details</p>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{viewOrder.customer?.name}</p>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0' }}>📞 {viewOrder.customer?.phone}</p>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0' }}>📍 {viewOrder.customer?.address}{viewOrder.customer?.city ? `, ${viewOrder.customer.city}` : ''}</p>
              {viewOrder.customer?.notes && <p style={{ fontSize: '0.72rem', color: '#94a3c8', fontStyle: 'italic', margin: '4px 0 0' }}>Note: {viewOrder.customer.notes}</p>}
            </div>

            {/* Items */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3c8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>Order Items</p>
              {(viewOrder.items || []).map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < viewOrder.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>{it.name}</p>
                    <p style={{ fontSize: '0.68rem', color: '#94a3c8', margin: '2px 0 0' }}>
                      {it.brand && `${it.brand} • `}Qty: {it.quantity}{it.size ? ` • Size: ${it.size}` : ''}{it.color ? ` • Color: ${it.color}` : ''}
                    </p>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', margin: 0 }}>Rs {n0(it.lineTotal)}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', border: '1px solid #e0e7ff', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: 4 }}>
                <span>Subtotal</span><span>Rs {n0(viewOrder.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: 4 }}>
                <span>Delivery</span><span style={{ color: '#16a34a', fontWeight: 600 }}>FREE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: '#1e2a78', borderTop: '1px solid #e0e7ff', paddingTop: 8, marginTop: 4 }}>
                <span>Total</span><span>Rs {n0(viewOrder.total)}</span>
              </div>
            </div>

            {/* Status History */}
            {viewOrder.statusHistory && viewOrder.statusHistory.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3c8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>Activity Log</p>
                {viewOrder.statusHistory.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.72rem', padding: '4px 0', color: '#64748b' }}>
                    <span style={{ fontWeight: 700, minWidth: 70, color: '#4338ca' }}>{h.status}</span>
                    <span>{new Date(h.changedAt).toLocaleString()}</span>
                    {h.changedBy && <span style={{ color: '#94a3c8' }}>by {h.changedBy}</span>}
                    {h.note && <span style={{ fontStyle: 'italic', color: '#94a3c8' }}>— {h.note}</span>}
                  </div>
                ))}
              </div>
            )}

            {viewOrder.cancelReason && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', margin: 0 }}>Cancellation Reason</p>
                <p style={{ fontSize: '0.78rem', color: '#991b1b', margin: '4px 0 0' }}>{viewOrder.cancelReason}</p>
              </div>
            )}

            {/* Sale Record Link (shown when order is delivered and sale was created) */}
            {viewOrder.status === 'Delivered' && viewOrder.invoiceNumber && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>✅</span>
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', margin: 0 }}>Sale Recorded in Sales History</p>
                  <p style={{ fontSize: '0.72rem', color: '#15803d', margin: '2px 0 0' }}>Invoice: {viewOrder.invoiceNumber}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid #e0e7ff' }}>
              {NEXT_ACTION[viewOrder.status] && (
                <button
                  className={`${btnCls} ${NEXT_ACTION[viewOrder.status].color}`}
                  style={{ padding: '8px 18px', fontSize: '0.78rem' }}
                  onClick={() => updateStatus(viewOrder._id, NEXT_ACTION[viewOrder.status].next, `${NEXT_ACTION[viewOrder.status].next} by staff`)}
                >
                  ✓ {NEXT_ACTION[viewOrder.status].label}
                </button>
              )}

              {viewOrder.status !== 'Cancelled' && viewOrder.status !== 'Delivered' && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
                  <input
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    placeholder="Cancel reason (optional)"
                    className={inputCls}
                    style={{ maxWidth: 200, fontSize: '0.72rem', padding: '6px 10px' }}
                  />
                  <button
                    className={`${btnCls} bg-red-500 hover:bg-red-600`}
                    style={{ padding: '6px 14px' }}
                    onClick={() => {
                      if (window.confirm(`Cancel order ${viewOrder.orderNumber}? Stock will be restored.`)) {
                        updateStatus(viewOrder._id, 'Cancelled', cancelNote || 'Cancelled by merchant');
                      }
                    }}
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

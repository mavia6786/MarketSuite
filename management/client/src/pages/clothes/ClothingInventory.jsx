import { useEffect, useMemo, useState } from 'react';
import { clothesApi } from '../../services/clothesApi';

const stockColor = (p) => (p.isOutOfStock ? 'text-red-500' : p.isLowStock ? 'text-amber-500' : 'text-green-600');
const th = 'px-6 py-3 text-xs font-bold text-slate-500 uppercase';
const btnGrad = 'bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50';
const CloseX = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
);

export default function ClothingInventory() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('add');
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockQuantities, setRestockQuantities] = useState({});
  const [restockError, setRestockError] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const { data } = await clothesApi.getProducts();
    setProducts(data);
    setRestockQuantities(Object.fromEntries(data.map((p) => [p._id, 0])));
    setIsLoading(false);
  };

  useEffect(() => {
    document.title = 'Inventory & Stock';
    loadData();
  }, []);

  const stats = useMemo(
    () => ({
      totalItems: products.length,
      inStock: products.filter((p) => !p.isOutOfStock && !p.isLowStock).length,
      low: products.filter((p) => p.isLowStock).length,
      out: products.filter((p) => p.isOutOfStock).length,
    }),
    [products]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'instock' ? !p.isOutOfStock && !p.isLowStock : filterStatus === 'low' ? p.isLowStock : filterStatus === 'out' ? p.isOutOfStock : true;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, filterStatus]);

  const openAdjust = (p) => {
    setSelectedProduct(p);
    setAdjustType('add');
    setAdjustQuantity(0);
    setAdjustReason('');
    setAdjustError('');
    setShowAdjustModal(true);
  };

  const applyAdjustment = async () => {
    if (!selectedProduct || Number(adjustQuantity) < 0) return;
    setIsAdjusting(true);
    setAdjustError('');
    try {
      const qty = Number(adjustQuantity) || 0;
      const cur = selectedProduct.stockQuantity;
      const newQty = adjustType === 'add' ? cur + qty : adjustType === 'remove' ? Math.max(0, cur - qty) : adjustType === 'set' ? qty : cur;
      await clothesApi.updateStock(selectedProduct._id, newQty);
      setShowAdjustModal(false);
      await loadData();
    } catch (err) {
      setAdjustError(err.response?.data?.message || err.message);
    }
    setIsAdjusting(false);
  };

  const applyBulkRestock = async () => {
    setIsRestocking(true);
    setRestockError('');
    try {
      const items = Object.entries(restockQuantities).filter(([, v]) => Number(v) > 0);
      if (!items.length) {
        setRestockError('Please enter quantities for at least one product.');
        setIsRestocking(false);
        return;
      }
      for (const [id, qty] of items) {
        const product = products.find((p) => p._id === id);
        if (product) await clothesApi.updateStock(id, product.stockQuantity + Number(qty));
      }
      setShowRestockModal(false);
      await loadData();
    } catch (err) {
      setRestockError(err.response?.data?.message || err.message);
    }
    setIsRestocking(false);
  };

  const restockList = products.filter((p) => p.isLowStock || p.isOutOfStock).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">📦 Inventory & Stock</h1>
            <p className="text-slate-500 mt-1">Manage stock levels and view inventory status</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRestockModal(true)} className={`px-5 py-2.5 ${btnGrad} flex items-center gap-2`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Restock
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ['Total Items', stats.totalItems, 'bg-blue-100', '📦', 'text-slate-900', 'In inventory'],
            ['In Stock', stats.inStock, 'bg-green-100', '✅', 'text-green-600', 'Available to sell'],
            ['Low Stock', stats.low, 'bg-amber-100', '⚠️', 'text-amber-600', 'Need restocking soon'],
            ['Out of Stock', stats.out, 'bg-red-100', '❌', 'text-red-600', 'Unavailable for sale'],
          ].map(([label, val, bg, icon, color, sub]) => (
            <div key={label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}><span className="text-lg">{icon}</span></div>
              </div>
              <p className={`text-2xl font-black ${color}`}>{val}</p>
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-rose-500 outline-none text-sm" placeholder="Search inventory..." />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white">
              <option value="">All Status</option>
              <option value="instock">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
          {isLoading ? (
            <div className="p-12 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400"><p className="text-lg font-medium">No products found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={`${th} text-left`}>Product</th>
                    <th className={`${th} text-left`}>SKU</th>
                    <th className={`${th} text-center`}>Current Stock</th>
                    <th className={`${th} text-center`}>Threshold</th>
                    <th className={`${th} text-center`}>Status</th>
                    <th className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((product) => (
                    <tr key={product._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><span className="text-sm">👕</span></div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.brand} • {product.size} / {product.color}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">{product.sku}</td>
                      <td className="px-6 py-3 text-center"><span className={`font-bold text-lg ${stockColor(product)}`}>{product.stockQuantity}</span></td>
                      <td className="px-6 py-3 text-center text-slate-500">{product.lowStockThreshold}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${product.isOutOfStock ? 'bg-red-100 text-red-700' : product.isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {product.isOutOfStock ? 'Out of Stock' : product.isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => openAdjust(product)} className="px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors">Adjust Stock</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Adjust Stock</h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600"><CloseX /></button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="font-bold text-slate-800">{selectedProduct.name}</p>
              <p className="text-xs text-slate-500">{selectedProduct.brand} • {selectedProduct.sku}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-slate-600">Current:</span>
                <span className={`font-bold text-lg ${stockColor(selectedProduct)}`}>{selectedProduct.stockQuantity}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">Adjustment Type</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setAdjustType('add')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${adjustType === 'add' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600'}`}>➕ Add</button>
                  <button onClick={() => setAdjustType('remove')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${adjustType === 'remove' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600'}`}>➖ Remove</button>
                  <button onClick={() => setAdjustType('set')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${adjustType === 'set' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>📝 Set</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Quantity</label>
                <input value={adjustQuantity} onChange={(e) => setAdjustQuantity(e.target.value)} type="number" min="0" className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-rose-500 outline-none text-sm" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Reason</label>
                <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-rose-500 outline-none text-sm" placeholder="e.g. New shipment, Damaged goods..." />
              </div>
            </div>
            {adjustError && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{adjustError}</div>}
            <button onClick={applyAdjustment} disabled={isAdjusting} className={`w-full mt-4 py-3 ${btnGrad}`}>{isAdjusting ? 'Applying...' : 'Apply Adjustment'}</button>
          </div>
        </div>
      )}

      {showRestockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Bulk Restock</h3>
              <button onClick={() => setShowRestockModal(false)} className="text-slate-400 hover:text-slate-600"><CloseX /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Select products and enter quantities to restock.</p>
            <div className="max-h-80 overflow-y-auto space-y-2 mb-4">
              {restockList.map((product) => (
                <div key={product._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{product.name}</p>
                    <p className="text-xs text-slate-500">Current: {product.stockQuantity} | Threshold: {product.lowStockThreshold}</p>
                  </div>
                  <input type="number" min="0" value={restockQuantities[product._id] ?? 0}
                    onChange={(e) => setRestockQuantities((s) => ({ ...s, [product._id]: e.target.value }))}
                    className="w-20 px-2 py-1 rounded border border-slate-200 text-sm text-center" placeholder="Qty" />
                </div>
              ))}
            </div>
            {restockError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{restockError}</div>}
            <button onClick={applyBulkRestock} disabled={isRestocking} className={`w-full py-3 ${btnGrad}`}>{isRestocking ? 'Restocking...' : 'Restock Selected'}</button>
          </div>
        </div>
      )}
    </>
  );
}

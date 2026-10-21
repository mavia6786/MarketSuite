import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shoesApi } from '../../services/shoesApi';
import { n0 } from '../../utils/format';

const categoryBadge = (cat) =>
  ({ Men: 'bg-blue-100 text-blue-700', Women: 'bg-pink-100 text-pink-700', Kids: 'bg-green-100 text-green-700' }[cat] || 'bg-slate-100 text-slate-600');
const selectCls = 'border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400';

export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [stockUpdates, setStockUpdates] = useState({});
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');

  const loadProducts = async () => {
    const { data } = await shoesApi.getProducts();
    setProducts(data);
    setStockUpdates(Object.fromEntries(data.map((p) => [p._id, p.stockQuantity])));
  };

  useEffect(() => {
    document.title = 'Inventory & Stock';
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return products.filter(
      (p) =>
        (!term || p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term)) &&
        (!categoryFilter || p.category === categoryFilter) &&
        (!stockFilter ||
          (stockFilter === 'low' && p.isLowStock) ||
          (stockFilter === 'out' && p.isOutOfStock) ||
          (stockFilter === 'ok' && !p.isLowStock && !p.isOutOfStock))
    );
  }, [products, search, stockFilter, categoryFilter]);

  const updateStock = async (id) => {
    const qty = stockUpdates[id];
    if (qty === undefined) return;
    await shoesApi.updateStock(id, Number(qty) || 0);
    await loadProducts();
    setUpdateMessage('Stock updated successfully!');
    setTimeout(() => setUpdateMessage(''), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Inventory & Stock</h1>
          <p className="text-sm text-slate-500">Monitor and update stock levels</p>
        </div>
        <button onClick={() => navigate('/dashboard/products/add')} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 hover:scale-[1.02] transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Add Product
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">Total Products</p>
          <p className="text-3xl font-black text-slate-900">{products.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-green-200 p-5 shadow-sm">
          <p className="text-xs text-green-500 font-semibold uppercase tracking-widest mb-1">In Stock</p>
          <p className="text-3xl font-black text-green-600">{products.filter((p) => !p.isLowStock && !p.isOutOfStock).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
          <p className="text-xs text-amber-500 font-semibold uppercase tracking-widest mb-1">Low Stock</p>
          <p className="text-3xl font-black text-amber-600">{products.filter((p) => p.isLowStock).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm">
          <p className="text-xs text-red-400 font-semibold uppercase tracking-widest mb-1">Out of Stock</p>
          <p className="text-3xl font-black text-red-500">{products.filter((p) => p.isOutOfStock).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." type="text"
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className={selectCls}>
          <option value="">All Stock Levels</option>
          <option value="low">Low Stock Only</option>
          <option value="out">Out of Stock Only</option>
          <option value="ok">Healthy Stock</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectCls}>
          <option value="">All Categories</option>
          <option value="Men">Men</option>
          <option value="Women">Women</option>
          <option value="Kids">Kids</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Product</th>
                <th className="px-4 py-4">Category</th>
                <th className="px-4 py-4">Brand</th>
                <th className="px-4 py-4">Sizes</th>
                <th className="px-4 py-4">Price</th>
                <th className="px-4 py-4 text-center">Stock</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Quick Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-300">
                    <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p._id} className={`hover:bg-slate-50/60 transition-colors ${p.isOutOfStock ? 'bg-red-50/30' : p.isLowStock ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover bg-slate-100 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.subCategory}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className={`text-xs font-bold px-2 py-1 rounded-lg ${categoryBadge(p.category)}`}>{p.category}</span></td>
                    <td className="px-4 py-4 text-sm text-slate-600 font-semibold">{p.brand}</td>
                    <td className="px-4 py-4 text-xs text-slate-500 max-w-[120px] truncate">{p.sizesJson.length > 0 ? p.sizes.join(', ') : '—'}</td>
                    <td className="px-4 py-4 font-black text-slate-900 text-sm">Rs. {n0(p.price)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-xl font-black ${p.isOutOfStock ? 'text-red-500' : p.isLowStock ? 'text-amber-600' : 'text-green-600'}`}>{p.stockQuantity}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {p.isOutOfStock ? (
                        <span className="text-[10px] font-black bg-red-100 text-red-700 px-2.5 py-1 rounded-lg">OUT OF STOCK</span>
                      ) : p.isLowStock ? (
                        <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg">LOW STOCK</span>
                      ) : (
                        <span className="text-[10px] font-black bg-green-100 text-green-700 px-2.5 py-1 rounded-lg">IN STOCK</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <input type="number" min="0" value={stockUpdates[p._id] ?? ''}
                          onChange={(e) => setStockUpdates((s) => ({ ...s, [p._id]: e.target.value }))}
                          className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50" />
                        <button onClick={() => updateStock(p._id)} className="text-xs font-bold px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">Set</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {updateMessage && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm z-50 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          {updateMessage}
        </div>
      )}
    </div>
  );
}

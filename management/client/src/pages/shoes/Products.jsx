import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shoesApi } from '../../services/shoesApi';
import { useAuth } from '../../context/AuthContext';
import OnlineStoreCard from '../../components/OnlineStoreCard';
import PublishToggle from '../../components/PublishToggle';
import { n0 } from '../../utils/format';

const categoryBadge = (cat) =>
  ({ Men: 'bg-blue-100 text-blue-700', Women: 'bg-pink-100 text-pink-700', Kids: 'bg-green-100 text-green-700' }[cat] || 'bg-slate-100 text-slate-700');

const selectCls = 'border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400';

export default function Products() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [allProducts, setAllProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    const [p, b] = await Promise.all([shoesApi.getProducts(), shoesApi.getBrands()]);
    setAllProducts(p.data);
    setBrands(b.data);
    setIsLoading(false);
  };

  useEffect(() => {
    document.title = 'Products';
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return allProducts.filter(
      (p) =>
        (!term || p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term)) &&
        (!filterCategory || p.category === filterCategory) &&
        (!filterBrand || p.brand === filterBrand) &&
        (!filterStock ||
          (filterStock === 'low' && p.isLowStock) ||
          (filterStock === 'out' && p.isOutOfStock) ||
          (filterStock === 'ok' && !p.isLowStock && !p.isOutOfStock))
    );
  }, [allProducts, searchTerm, filterCategory, filterBrand, filterStock]);

  const setPublished = async (id, isPublished) => {
    const { data } = await shoesApi.setPublished(id, isPublished);
    setAllProducts((list) => list.map((x) => (x._id === id ? { ...x, isPublished: data.isPublished } : x)));
  };

  const deleteProduct = async () => {
    if (!productToDelete) return;
    await shoesApi.deleteProduct(productToDelete._id);
    setProductToDelete(null);
    await loadData();
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Products</h1>
            <p className="text-sm text-slate-500">Manage your shoe catalog</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/products/add')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 hover:scale-[1.02] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Add New Product
          </button>
        </div>

        {can('shop.edit') && <OnlineStoreCard />}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                type="text"
                placeholder="Search by name or brand..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectCls}>
              <option value="">All Categories</option>
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Kids">Kids</option>
            </select>
            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className={selectCls}>
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)} className={selectCls}>
              <option value="">All Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="ok">In Stock</option>
            </select>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-900">{allProducts.length}</p>
            <p className="text-xs text-slate-400 font-semibold">Total Products</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-amber-600">{allProducts.filter((p) => p.isLowStock).length}</p>
            <p className="text-xs text-amber-500 font-semibold">Low Stock</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-red-500">{allProducts.filter((p) => p.isOutOfStock).length}</p>
            <p className="text-xs text-red-400 font-semibold">Out of Stock</p>
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-300">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-purple-500 rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <svg className="w-14 h-14 mx-auto text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <p className="text-slate-400 font-semibold">No products found</p>
            <button onClick={() => navigate('/dashboard/products/add')} className="mt-4 text-purple-600 text-sm font-bold hover:underline">+ Add your first product</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((p) => (
              <div key={p._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-purple-200 transition-all group">
                <div className="relative aspect-square bg-slate-50 overflow-hidden">
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${categoryBadge(p.category)}`}>{p.category}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    {p.isOutOfStock ? (
                      <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-lg">OUT</span>
                    ) : p.isLowStock ? (
                      <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-lg">LOW</span>
                    ) : null}
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.brand}</p>
                  <p className="font-black text-slate-900 text-sm leading-tight mt-0.5 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {p.subCategory} | Sizes: {p.sizesJson.length > 0 ? p.sizes.slice(0, 3).join(', ') + (p.sizes.length > 3 ? '...' : '') : '—'}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-base font-black text-purple-600">Rs. {n0(p.price)}</p>
                      {p.originalPrice != null && p.originalPrice > p.price && (
                        <p className="text-xs text-slate-400 line-through">Rs. {n0(p.originalPrice)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${p.isOutOfStock ? 'text-red-500' : p.isLowStock ? 'text-amber-500' : 'text-green-600'}`}>{p.stockQuantity}</p>
                      <p className="text-[10px] text-slate-400">in stock</p>
                    </div>
                  </div>

                  {can('products.edit') && (
                    <div className="mt-3">
                      <PublishToggle published={p.isPublished} onChange={(next) => setPublished(p._id, next)} />
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button onClick={() => navigate(`/dashboard/products/edit/${p._id}`)} className="flex-1 py-2 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-purple-300 transition-colors">
                      ✏ Edit
                    </button>
                    <button onClick={() => setProductToDelete(p)} className="flex-1 py-2 text-xs font-bold border border-red-200 rounded-xl text-red-500 hover:bg-red-50 transition-colors">
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-center font-black text-slate-900 text-lg mb-2">Delete Product?</h3>
            <p className="text-center text-slate-500 text-sm mb-6">
              "<strong>{productToDelete.name}</strong>" will be removed from your catalog. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setProductToDelete(null)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-sm">Cancel</button>
              <button onClick={deleteProduct} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

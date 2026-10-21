import { useEffect, useMemo, useState } from 'react';
import { clothesApi } from '../../services/clothesApi';
import { n0 } from '../../utils/format';

const inp = (err) => `w-full mt-1 px-3 py-2 rounded-lg border ${err ? 'border-red-400' : 'border-slate-200'} focus:border-rose-500 outline-none text-sm`;
const sel = 'px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 outline-none text-sm bg-white';
const thL = 'px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase';

const NEW_PRODUCT = { name: '', brand: '', sku: '', category: '', gender: 'Unisex', size: '', color: '', material: '', season: 'All Season', costPrice: 0, sellingPrice: 0, discountedPrice: '', stockQuantity: 0, lowStockThreshold: 5, imageUrl: '', description: '', isActive: true };

const pad = (n) => String(n).padStart(2, '0');

export default function ClothingProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalProduct, setModalProduct] = useState(NEW_PRODUCT);
  const [modalError, setModalError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  const loadData = async () => {
    setIsLoading(true);
    const { data } = await clothesApi.getProducts();
    setProducts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    document.title = 'Products';
    loadData();
  }, []);

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(), [products]);
  const brands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(), [products]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
      const matchesCategory = !filterCategory || p.category === filterCategory;
      const matchesBrand = !filterBrand || p.brand === filterBrand;
      const matchesStatus = filterStatus === 'active' ? !p.isOutOfStock && !p.isLowStock : filterStatus === 'low' ? p.isLowStock : filterStatus === 'out' ? p.isOutOfStock : true;
      return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
    });
  }, [products, searchQuery, filterCategory, filterBrand, filterStatus]);

  const showModalFor = (product = null) => {
    setEditingId(product ? product._id : null);
    setModalProduct(
      product
        ? { ...NEW_PRODUCT, ...product, imageUrl: product.imageUrl || '', description: product.description || '', discountedPrice: product.discountedPrice ?? '' }
        : { ...NEW_PRODUCT }
    );
    setModalError('');
    setValidationErrors([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setValidationErrors([]);
  };

  const hasError = (field) => validationErrors.some((e) => e.toLowerCase().includes(field.toLowerCase()));
  const set = (f) => (e) => setModalProduct((m) => ({ ...m, [f]: e.target.value }));
  const setNum = (f) => (e) => setModalProduct((m) => ({ ...m, [f]: e.target.value === '' ? '' : Number(e.target.value) }));

  // Manual validation (identical rules to the Blazor page); may adjust product fields like the original
  const validate = (p) => {
    const errors = [];
    const out = { ...p };
    if (!out.name.trim()) errors.push('Product Name is required');
    if (!out.category.trim()) errors.push('Category is required');
    if (!(Number(out.sellingPrice) > 0)) errors.push('Selling Price must be greater than 0');
    if (Number(out.stockQuantity) < 0) errors.push('Stock Quantity cannot be negative');
    if (Number(out.costPrice) < 0) errors.push('Cost Price cannot be negative');

    if (out.imageUrl) {
      if (out.imageUrl.startsWith('data:')) {
        errors.push('Image: right-click the Google image → Copy image address → paste that link here');
        out.imageUrl = null;
      } else if (out.imageUrl.length > 500) {
        errors.push('Image URL is too long (max 500 characters)');
        out.imageUrl = out.imageUrl.slice(0, 500);
      }
    }

    if (!out.sku.trim()) {
      const prefix = (out.category && out.category.length >= 3 ? out.category.slice(0, 3) : 'CLT').toUpperCase();
      const d = new Date();
      out.sku = `${prefix}-${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    }
    if (out.size && out.size.length > 20) out.size = out.size.slice(0, 20);
    return { errors, out };
  };

  const saveProduct = async () => {
    const { errors, out } = validate(modalProduct);
    setValidationErrors(errors);
    setModalProduct(out);
    if (errors.length) return;

    setIsSaving(true);
    setModalError('');
    const payload = {
      name: out.name, brand: out.brand, sku: out.sku, category: out.category, gender: out.gender, size: out.size, color: out.color,
      material: out.material, season: out.season,
      costPrice: Number(out.costPrice) || 0,
      sellingPrice: Number(out.sellingPrice) || 0,
      discountedPrice: out.discountedPrice === '' ? null : Number(out.discountedPrice),
      stockQuantity: Number(out.stockQuantity) || 0,
      lowStockThreshold: Number(out.lowStockThreshold) || 0,
      imageUrl: out.imageUrl || null, description: out.description || null, isActive: out.isActive,
    };
    try {
      if (editingId) await clothesApi.updateProduct(editingId, payload);
      else await clothesApi.createProduct(payload);
      closeModal();
      await loadData();
    } catch (err) {
      setModalError(`Save failed: ${err.response?.data?.message || err.message}`);
    }
    setIsSaving(false);
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete '${product.name}'?`)) return;
    try {
      await clothesApi.deleteProduct(product._id);
      await loadData();
    } catch (err) {
      window.alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">👕 Products</h1>
            <p className="text-slate-500 mt-1">Manage your clothing inventory</p>
          </div>
          <button onClick={() => showModalFor()} className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Product
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none text-sm" placeholder="Search products..." />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={sel}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className={sel}>
              <option value="">All Brands</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={sel}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-medium text-slate-500">No products found</p>
              <p className="text-sm text-slate-400 mt-1">Add your first product to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={thL}>Product</th>
                    <th className={thL}>SKU</th>
                    <th className={thL}>Category</th>
                    <th className={thL}>Size / Color</th>
                    <th className={thL}>Stock</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((product) => (
                    <tr key={product._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {product.imageUrl && (product.imageUrl.startsWith('http') || product.imageUrl.startsWith('//')) ? (
                              <img src={product.imageUrl} className="w-full h-full object-cover rounded-lg" alt="" />
                            ) : (
                              <span className="text-lg">👕</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.sku}</td>
                      <td className="px-6 py-4 text-slate-600">{product.category}</td>
                      <td className="px-6 py-4 text-slate-600">{product.size} / {product.color}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${product.isOutOfStock ? 'text-red-500' : product.isLowStock ? 'text-amber-500' : 'text-green-600'}`}>{product.stockQuantity}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-slate-800">Rs. {n0(product.effectivePrice)}</span>
                        {product.discountedPrice != null && product.discountedPrice > 0 && product.discountedPrice < product.sellingPrice && (
                          <span className="text-xs text-slate-400 line-through block">Rs. {n0(product.sellingPrice)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${product.isOutOfStock ? 'bg-red-100 text-red-700' : product.isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {product.isOutOfStock ? 'Out of Stock' : product.isLowStock ? 'Low Stock' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => showModalFor(product)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => deleteProduct(product)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h3 className="text-xl font-black text-slate-900">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 pb-6 pt-4">
              {validationErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-bold text-red-700 mb-1">Please fix the following:</p>
                  {validationErrors.map((err, i) => <p key={i} className="text-xs text-red-600">• {err}</p>)}
                </div>
              )}
              {modalError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{modalError}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Product Name *</label>
                  <input value={modalProduct.name} onChange={set('name')} className={inp(hasError('Name'))} placeholder="e.g. Classic White T-Shirt" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Brand</label>
                  <input value={modalProduct.brand} onChange={set('brand')} className={inp(false)} placeholder="e.g. Nike, Zara" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">SKU <span className="text-slate-400 font-normal text-xs">(auto if empty)</span></label>
                  <input value={modalProduct.sku} onChange={set('sku')} className={inp(false)} placeholder="CLT-001 (leave blank to auto)" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Category *</label>
                  <input value={modalProduct.category} onChange={set('category')} className={inp(hasError('Category'))} placeholder="e.g. T-Shirts, Jeans, Dress" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Gender *</label>
                  <select value={modalProduct.gender} onChange={set('gender')} className={inp(false) + ' bg-white'}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Size <span className="text-slate-400 font-normal text-xs">(one value e.g. M or 32)</span></label>
                  <input value={modalProduct.size} onChange={set('size')} className={inp(false)} placeholder="S, M, L, XL or 30, 32" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Color</label>
                  <input value={modalProduct.color} onChange={set('color')} className={inp(false)} placeholder="e.g. Black, White" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Material</label>
                  <input value={modalProduct.material} onChange={set('material')} className={inp(false)} placeholder="Cotton, Polyester..." />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Season</label>
                  <select value={modalProduct.season} onChange={set('season')} className={inp(false) + ' bg-white'}>
                    {['All Season', 'Summer', 'Winter', 'Spring', 'Fall'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Cost Price *</label>
                  <input value={modalProduct.costPrice} onChange={setNum('costPrice')} type="number" min="0" className={inp(hasError('CostPrice') || hasError('Cost Price'))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Selling Price *</label>
                  <input value={modalProduct.sellingPrice} onChange={setNum('sellingPrice')} type="number" min="0" className={inp(hasError('SellingPrice') || hasError('Selling Price'))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Discounted Price <span className="text-slate-400 font-normal text-xs">(0 = no discount)</span></label>
                  <input value={modalProduct.discountedPrice} onChange={setNum('discountedPrice')} type="number" min="0" className={inp(false)} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Stock Quantity *</label>
                  <input value={modalProduct.stockQuantity} onChange={setNum('stockQuantity')} type="number" min="0" className={inp(hasError('StockQuantity') || hasError('Stock Quantity'))} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Low Stock Threshold</label>
                  <input value={modalProduct.lowStockThreshold} onChange={setNum('lowStockThreshold')} type="number" min="0" className={inp(false)} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Image URL <span className="text-slate-400 font-normal text-xs">(any image link from Google or any website)</span></label>
                  <input value={modalProduct.imageUrl || ''} onChange={set('imageUrl')} className={inp(false)} placeholder="https://example.com/image.jpg" />
                  <p className="text-xs text-amber-600 mt-0.5">💡 Right-click any Google image → "Copy image address" → paste here</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <textarea value={modalProduct.description || ''} onChange={set('description')} rows={3} className={inp(false) + ' resize-none'}></textarea>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={saveProduct} disabled={isSaving} className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

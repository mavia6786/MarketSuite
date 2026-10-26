import { useEffect, useMemo, useState } from 'react';
import { useClothingCart } from '../../context/ClothingCartContext';
import { clothesApi } from '../../services/clothesApi';
import { n0 } from '../../utils/format';

const grad = 'bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl hover:from-rose-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50';
const fld = 'w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-rose-500 outline-none text-sm';
const selCls = 'px-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 outline-none text-sm bg-white';
const CloseX = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
);

export default function ClothingPOS() {
  const cart = useClothingCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalQty, setModalQty] = useState(1);

  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [salesmanName, setSalesmanName] = useState('');
  const [notes, setNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  const loadProducts = async () => {
    setIsLoading(true);
    const [p, c] = await Promise.all([clothesApi.getActiveProducts(), clothesApi.getCategories()]);
    setProducts(p.data);
    setCategories(c.data);
    setIsLoading(false);
  };

  useEffect(() => {
    document.title = 'Point of Sale';
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.color || '').toLowerCase().includes(q);
      return matchesSearch && (!selectedCategory || p.category === selectedCategory) && (!selectedGender || p.gender === selectedGender);
    });
  }, [products, searchQuery, selectedCategory, selectedGender]);

  const selectProduct = (p) => {
    if (p.isOutOfStock) return;
    setSelectedProduct(p);
    setModalQty(1);
  };

  const canAddToCart = () => selectedProduct && modalQty > 0 && modalQty <= selectedProduct.stockQuantity;

  const addToCartFromModal = () => {
    if (!canAddToCart()) return;
    for (let i = 0; i < modalQty; i++) cart.addItem(selectedProduct);
    setSelectedProduct(null);
  };

  const openCheckout = () => {
    setAmountPaid(cart.grandTotal);
    setCheckoutError('');
    setShowCheckout(true);
  };

  const processCheckout = async () => {
    if (Number(amountPaid) < cart.grandTotal) {
      setCheckoutError('Amount paid cannot be less than total.');
      return;
    }
    setIsProcessing(true);
    try {
      const sale = cart.buildSale(customerName, customerPhone, null, paymentMethod, Number(amountPaid), salesmanName, notes);
      const { data: saved } = await clothesApi.createSale(sale);

      // Print bill immediately after a successful sale (same as the Blazor page: HTML -> clothingBillPrint)
      const { data: html } = await clothesApi.getBillHtml(saved._id);
      window.clothingBillPrint(html);

      cart.clearCart();
      setShowCheckout(false);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setPaymentMethod('Cash');
      setAmountPaid(0);
      setSalesmanName('');
      setNotes('');
      await loadProducts();
    } catch (err) {
      setCheckoutError(`Error: ${err.response?.data?.message || err.message}`);
    }
    setIsProcessing(false);
  };

  return (
    <>
      <div className="flex gap-6 h-[calc(100vh-120px)]">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none text-sm"
                  placeholder="Search products by name, brand, category, color..." />
              </div>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={selCls}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className={selCls}>
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unisex">Unisex</option>
                <option value="Kids">Kids</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <p className="text-lg font-medium">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((product) => (
                  <div key={product._id} onClick={() => selectProduct(product)} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-rose-300 transition-all cursor-pointer group">
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <span className="text-4xl">👕</span>
                      )}
                      {product.isOutOfStock ? (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">OUT OF STOCK</span>
                        </div>
                      ) : product.isLowStock ? (
                        <div className="absolute top-2 right-2"><span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">LOW</span></div>
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-slate-800 text-sm truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.brand} • {product.category}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-black text-rose-600">Rs. {n0(product.effectivePrice)}</span>
                        <span className="text-xs text-slate-400">Stock: {product.stockQuantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-96 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              🛒 Cart
              {cart.totalItems > 0 && <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">{cart.totalItems}</span>}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs">Click a product to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={`${item.productId}|${item.size}|${item.color}`} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">{item.productName}</p>
                        <p className="text-xs text-slate-500">{item.size} • {item.color}</p>
                      </div>
                      <button onClick={() => cart.removeItem(item.productId, item.size, item.color)} className="text-slate-400 hover:text-red-500 ml-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => cart.updateQuantity(item.productId, item.size, item.color, item.quantity - 1)} className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-rose-500 hover:text-rose-500">-</button>
                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => cart.updateQuantity(item.productId, item.size, item.color, item.quantity + 1)} className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-rose-500 hover:text-rose-500">+</button>
                      </div>
                      <span className="text-sm font-bold text-rose-600">Rs. {n0(item.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.items.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>Rs. {n0(cart.subTotal)}</span></div>
                {cart.totalDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-Rs. {n0(cart.totalDiscount)}</span></div>}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="font-bold text-slate-800">Total</span>
                  <span className="font-black text-xl text-rose-600">Rs. {n0(cart.grandTotal)}</span>
                </div>
              </div>
              <button onClick={openCheckout} disabled={isProcessing} className={`w-full mt-4 py-3 ${grad}`}>{isProcessing ? 'Processing...' : 'Checkout'}</button>
              <button onClick={cart.clearCart} className="w-full mt-2 py-2 text-slate-500 text-sm hover:text-red-500 transition-colors">Clear Cart</button>
            </div>
          )}
        </div>
      </div>

      {/* Add-to-Cart Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Add to Cart</h3>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-600"><CloseX /></button>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="w-24 h-24 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} className="w-full h-full object-cover rounded-xl" alt="" /> : <span className="text-3xl">👕</span>}
              </div>
              <div>
                <p className="font-bold text-slate-900">{selectedProduct.name}</p>
                <p className="text-sm text-slate-500">{selectedProduct.brand} • {selectedProduct.category}</p>
                <p className="text-lg font-black text-rose-600 mt-1">Rs. {n0(selectedProduct.effectivePrice)}</p>
                <p className="text-xs text-slate-400">Stock: {selectedProduct.stockQuantity} available</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Quantity</label>
              <div className="flex items-center gap-3 mt-1">
                <button onClick={() => modalQty > 1 && setModalQty(modalQty - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-rose-500">-</button>
                <span className="text-lg font-bold w-8 text-center">{modalQty}</span>
                <button onClick={() => modalQty < selectedProduct.stockQuantity && setModalQty(modalQty + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-rose-500">+</button>
              </div>
            </div>
            <button onClick={addToCartFromModal} disabled={!canAddToCart()} className={`w-full mt-6 py-3 ${grad}`}>
              Add to Cart — Rs. {n0(selectedProduct.effectivePrice * modalQty)}
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Complete Sale</h3>
              <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-600"><CloseX /></button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">Items:</span><span className="font-bold">{cart.totalItems}</span></div>
              <div className="flex justify-between text-lg font-black"><span className="text-slate-800">Total:</span><span className="text-rose-600">Rs. {n0(cart.grandTotal)}</span></div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">Customer Name</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={fld} placeholder="Walk-in Customer" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Phone</label>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={fld} placeholder="03XX-XXXXXXX" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Payment Method</label>
                <div className="flex gap-2 mt-1">
                  {['Cash', 'Card', 'Online'].map((method) => (
                    <button key={method} onClick={() => setPaymentMethod(method)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${paymentMethod === method ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:border-rose-300'}`}>
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Amount Paid</label>
                <input value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} type="number" className={fld} />
                {Number(amountPaid) > cart.grandTotal && <p className="text-xs text-green-600 mt-1">Change: Rs. {n0(Number(amountPaid) - cart.grandTotal)}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Salesman</label>
                <input value={salesmanName} onChange={(e) => setSalesmanName(e.target.value)} className={fld} placeholder="Salesman name" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={fld + ' resize-none'} placeholder="Any notes..."></textarea>
              </div>
            </div>
            {checkoutError && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{checkoutError}</div>}
            <button onClick={processCheckout} disabled={isProcessing} className={`w-full mt-6 py-3 ${grad}`}>
              {isProcessing ? 'Processing...' : `Complete Sale & Download Bill — Rs. ${n0(cart.grandTotal)}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

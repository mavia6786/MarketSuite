import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShoeCart } from '../../context/ShoeCartContext';
import { shoesApi } from '../../services/shoesApi';
import { n0 } from '../../utils/format';

const fld = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400';

function fmtInvoiceDate(d) {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const mon = date.toLocaleDateString('en-US', { month: 'short' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day} ${mon} ${date.getFullYear()}, ${time}`;
}

export default function POS() {
  const { currentShop } = useAuth();
  const cart = useShoeCart();

  const [allProducts, setAllProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalSize, setModalSize] = useState('');
  const [modalColor, setModalColor] = useState('');
  const [modalQty, setModalQty] = useState(1);
  const [modalError, setModalError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [saleError, setSaleError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const loadProducts = async () => {
    const { data } = await shoesApi.getProducts();
    setAllProducts(data);
  };

  useEffect(() => {
    document.title = 'Point of Sale';
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return allProducts.filter(
      (p) => (!term || p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term)) && (!selectedCategory || p.category === selectedCategory)
    );
  }, [allProducts, searchTerm, selectedCategory]);

  const selectProduct = (p) => {
    if (p.isOutOfStock) return;
    setSelectedProduct(p);
    setModalSize(p.sizes[0] || '');
    setModalColor(p.colors[0] || '');
    setModalQty(1);
    setModalError('');
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setModalError('');
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    if (!modalSize && selectedProduct.sizes.length) {
      setModalError('Please select a size.');
      return;
    }
    cart.addItem({
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      brand: selectedProduct.brand,
      imageUrl: selectedProduct.imageUrl,
      size: modalSize,
      color: modalColor,
      quantity: modalQty,
      unitPrice: selectedProduct.price,
    });
    closeModal();
  };

  const discount = Number(discountAmount) || 0;

  const processSale = async () => {
    setSaleError('');
    if (!cart.items.length) return;
    setIsProcessing(true);
    try {
      const { data } = await shoesApi.createSale({
        customerName,
        customerPhone,
        paymentMethod,
        discountAmount: discount,
        cartItems: cart.items,
      });
      setLastSale(data);
      cart.clear();
      setCustomerName('');
      setCustomerPhone('');
      setDiscountAmount(0);
      await loadProducts();
    } catch (err) {
      setSaleError('Error processing sale: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex gap-6 items-start">
        {/* LEFT: Product Browser */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col" style={{ minHeight: 'calc(100vh - 130px)' }}>
            <h2 className="text-lg font-black text-slate-900 mb-4">Select Products</h2>

            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} type="text" placeholder="Search shoes..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
              </div>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">All Categories</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Kids">Kids</option>
              </select>
            </div>

            <div className="overflow-y-auto flex-1">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 text-slate-300">
                  <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p>No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <div key={product._id} onClick={() => selectProduct(product)}
                      className={`cursor-pointer group bg-white border ${product.isOutOfStock ? 'border-red-200 opacity-60' : 'border-slate-200'} rounded-2xl overflow-hidden hover:shadow-lg hover:border-purple-300 transition-all`}>
                      <div className="aspect-square bg-slate-50 overflow-hidden relative">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        {product.isOutOfStock ? (
                          <div className="absolute inset-0 bg-red-100/80 flex items-center justify-center">
                            <span className="text-red-700 font-black text-xs">OUT OF STOCK</span>
                          </div>
                        ) : product.isLowStock ? (
                          <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">Low Stock</span>
                        ) : null}
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{product.brand}</p>
                        <p className="text-sm font-bold text-slate-800 leading-tight truncate">{product.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-black text-purple-600">Rs. {n0(product.price)}</p>
                          <span className="text-[10px] text-slate-400">Qty: {product.stockQuantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Cart + Bill */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Cart</h2>
              {cart.items.length > 0 && <button onClick={cart.clear} className="text-xs text-red-500 hover:text-red-700 font-bold">Clear All</button>}
            </div>

            {cart.items.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-slate-300">
                <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs mt-1">Click a product to add</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div key={`${item.productId}|${item.size}|${item.color}`} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-400">Size: {item.size} | {item.color}</p>
                      <p className="text-xs font-black text-purple-600 mt-1">Rs. {n0(item.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => cart.updateQuantity(item.productId, item.size, item.color, item.quantity - 1)} className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm transition-colors">−</button>
                      <span className="w-5 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                      <button onClick={() => cart.updateQuantity(item.productId, item.size, item.color, item.quantity + 1)} className="w-6 h-6 rounded-lg bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white font-bold text-sm transition-colors">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-900 mb-4">Bill Summary</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Customer Name</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} type="text" placeholder="Walk-in Customer" className={fld} />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Customer Phone</label>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} type="tel" placeholder="Optional" className={fld} />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={fld}>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Digital</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Discount (Rs.)</label>
                <input value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} type="number" min="0" placeholder="0" className={fld} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 mb-4">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal ({cart.itemCount} items)</span>
                <span>Rs. {n0(cart.subTotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>− Rs. {n0(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-100">
                <span>Total</span>
                <span>Rs. {n0(Math.max(0, cart.subTotal - discount))}</span>
              </div>
            </div>

            {saleError && <div className="text-red-600 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">{saleError}</div>}

            <button onClick={processSale} disabled={!cart.items.length || isProcessing}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-purple-200 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
              {isProcessing ? <span>Processing...</span> : <span>🧾 Generate Bill</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Product Selection Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-4 mb-5">
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">{selectedProduct.brand}</p>
                <h3 className="font-black text-slate-900">{selectedProduct.name}</h3>
                <p className="text-purple-600 font-black text-lg">Rs. {n0(selectedProduct.price)}</p>
                <p className="text-xs text-slate-400">Stock: {selectedProduct.stockQuantity}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Size</label>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.sizes.map((size) => (
                  <button key={size} onClick={() => setModalSize(size)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${modalSize === size ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:border-purple-400'}`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {selectedProduct.colors.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Color</label>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.colors.map((color) => (
                    <button key={color} onClick={() => setModalColor(color)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${modalColor === color ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:border-purple-400'}`}>
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-5">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Quantity</label>
              <div className="flex items-center gap-3">
                <button onClick={() => modalQty > 1 && setModalQty(modalQty - 1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-lg transition-colors">−</button>
                <span className="text-xl font-black w-8 text-center">{modalQty}</span>
                <button onClick={() => modalQty < selectedProduct.stockQuantity && setModalQty(modalQty + 1)} className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 flex items-center justify-center font-black text-lg text-white transition-colors">+</button>
              </div>
            </div>

            {modalError && <div className="text-red-600 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">{modalError}</div>}

            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={addToCart} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:scale-[1.02] transition-all">Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto invoice-print-area">
            <div className="text-center border-b border-slate-200 pb-6 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 mx-auto flex items-center justify-center mb-3">
                <span className="text-white font-black text-lg">SS</span>
              </div>
              <h2 className="text-xl font-black text-slate-900">{currentShop?.name}</h2>
              <p className="text-slate-400 text-sm">{currentShop?.address}, {currentShop?.city}</p>
              <p className="text-slate-400 text-sm">{currentShop?.phone}</p>
            </div>

            <div className="flex justify-between mb-6 text-sm">
              <div>
                <p className="text-slate-400 text-xs">INVOICE NO.</p>
                <p className="font-black text-purple-600">{lastSale.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs">DATE</p>
                <p className="font-bold">{fmtInvoiceDate(lastSale.saleDate)}</p>
              </div>
            </div>

            <div className="mb-4 text-sm">
              <p className="text-slate-400 text-xs">CUSTOMER</p>
              <p className="font-bold">{lastSale.customerName} {lastSale.customerPhone ? `| ${lastSale.customerPhone}` : ''}</p>
            </div>

            <table className="w-full mb-6 text-sm">
              <thead>
                <tr className="border-y border-slate-200 text-[11px] text-slate-400 uppercase">
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-center">Size</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lastSale.items.map((item) => (
                  <tr key={item._id} className="border-b border-slate-50">
                    <td className="py-2 font-semibold text-slate-800">{item.productName}</td>
                    <td className="py-2 text-center text-slate-500">{item.size}</td>
                    <td className="py-2 text-center text-slate-500">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-600">{n0(item.unitPrice)}</td>
                    <td className="py-2 text-right font-bold">{n0(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>Rs. {n0(lastSale.subTotal)}</span></div>
              {lastSale.discountAmount > 0 && (
                <div className="flex justify-between text-green-600"><span>Discount</span><span>− Rs. {n0(lastSale.discountAmount)}</span></div>
              )}
              <div className="flex justify-between font-black text-slate-900 text-base border-t border-slate-200 pt-2"><span>Total</span><span>Rs. {n0(lastSale.total)}</span></div>
              <div className="flex justify-between text-slate-500 text-xs"><span>Payment Method</span><span className="font-bold">{lastSale.paymentMethod}</span></div>
            </div>

            <p className="text-center text-xs text-slate-400 mb-6">Thank you for your purchase! 🎉</p>

            <div className="flex gap-3">
              <button onClick={() => setLastSale(null)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm">Close</button>
              <button onClick={() => window.printInvoice()} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold shadow-md hover:scale-[1.02] transition-all text-sm">
                🖨 Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

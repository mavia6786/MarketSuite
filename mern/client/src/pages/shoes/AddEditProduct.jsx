import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shoesApi } from '../../services/shoesApi';
import { n0 } from '../../utils/format';

const ALL_SIZES = ['26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46'];
const PRESET_COLORS = ['Black','White','Red','Blue','Navy','Grey','Brown','Beige','Pink','Purple','Green','Orange','Yellow'];
const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400 transition-all';
const quickBtn = 'text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors';

const EMPTY = { name: '', brand: '', category: 'Men', subCategory: '', imageUrl: '', description: '', costPrice: 0, price: 0, originalPrice: '', stockQuantity: 0, lowStockThreshold: 5 };

const SectionTitle = ({ n, children }) => (
  <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
    <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black">{n}</span>
    {children}
  </h2>
);

export default function AddEditProduct() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [model, setModel] = useState(EMPTY);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [customColor, setCustomColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    document.title = isNew ? 'Add Product' : 'Edit Product';
    if (!isNew) {
      shoesApi.getProduct(id).then(({ data }) => {
        setModel({ ...EMPTY, ...data, originalPrice: data.originalPrice ?? '' });
        setSelectedSizes(data.sizes || []);
        setSelectedColors(data.colors || []);
      });
    }
  }, [id, isNew]);

  const set = (f) => (e) => setModel((m) => ({ ...m, [f]: e.target.value }));
  const setNum = (f) => (e) => setModel((m) => ({ ...m, [f]: e.target.value === '' ? '' : Number(e.target.value) }));
  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const addCustomColor = () => {
    if (customColor.trim()) {
      if (!selectedColors.includes(customColor.trim())) setSelectedColors([...selectedColors, customColor.trim()]);
      setCustomColor('');
    }
  };

  const save = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!model.name.trim()) return setErrorMessage('Product name is required.');
    if (!model.brand.trim()) return setErrorMessage('Brand is required.');
    if (!(Number(model.price) > 0)) return setErrorMessage('Please enter a valid price.');
    if (Number(model.costPrice) < 0) return setErrorMessage('Cost price cannot be negative.');
    if (Number(model.stockQuantity) < 0) return setErrorMessage('Stock cannot be negative.');

    const sizesJson = [...selectedSizes].sort((a, b) => (parseInt(a) || 99) - (parseInt(b) || 99)).join(',');
    const payload = {
      name: model.name,
      brand: model.brand,
      category: model.category,
      subCategory: model.subCategory,
      imageUrl: model.imageUrl,
      description: model.description,
      costPrice: Number(model.costPrice) || 0,
      price: Number(model.price),
      originalPrice: model.originalPrice === '' ? null : Number(model.originalPrice),
      stockQuantity: Number(model.stockQuantity) || 0,
      lowStockThreshold: Number(model.lowStockThreshold) || 5,
      sizesJson,
      colorsJson: selectedColors.join(','),
    };

    setIsSaving(true);
    try {
      if (isNew) await shoesApi.createProduct(payload);
      else await shoesApi.updateProduct(id, payload);
      setSuccessMessage(isNew ? 'Product added successfully!' : 'Product updated!');
      setTimeout(() => navigate('/dashboard/products'), 1200);
    } catch (err) {
      setErrorMessage('Error saving: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard/products')} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">{isNew ? 'Add New Product' : 'Edit Product'}</h1>
          <p className="text-sm text-slate-500">Fill in the shoe details below</p>
        </div>
      </div>

      {errorMessage && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{errorMessage}</div>}
      {successMessage && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{successMessage}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <SectionTitle n="1">Basic Information</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
              <input value={model.name} onChange={set('name')} type="text" placeholder="e.g. Air Zoom Elite Runner" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand <span className="text-red-500">*</span></label>
              <input value={model.brand} onChange={set('brand')} type="text" placeholder="Nike, Adidas, Puma..." className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category <span className="text-red-500">*</span></label>
              <select value={model.category} onChange={set('category')} className={inputCls}>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Kids">Kids</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sub-Category</label>
              <select value={model.subCategory} onChange={set('subCategory')} className={inputCls}>
                <option value="">Select type...</option>
                {['Running','Casual','Basketball','Football','Hiking','Formal','Sports','Sandals'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Image URL</label>
              <input value={model.imageUrl} onChange={set('imageUrl')} type="url" placeholder="https://..." className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea value={model.description} onChange={set('description')} rows={3} placeholder="Brief product description..." className={inputCls + ' resize-none'}></textarea>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div>
          <SectionTitle n="2">Pricing & Stock</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cost Price (Rs.)</label>
              <input value={model.costPrice} onChange={setNum('costPrice')} type="number" min="0" placeholder="What you paid" className={inputCls} />
              {Number(model.price) > 0 && Number(model.costPrice) > 0 && (
                <p className={`text-[11px] mt-1 font-semibold ${Number(model.price) >= Number(model.costPrice) ? 'text-green-600' : 'text-red-600'}`}>
                  Margin: {Math.round(((Number(model.price) - Number(model.costPrice)) / Number(model.price)) * 100)}% (Rs. {n0(Number(model.price) - Number(model.costPrice))} / pair)
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sale Price (Rs.) <span className="text-red-500">*</span></label>
              <input value={model.price} onChange={setNum('price')} type="number" min="0" placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Original Price (Rs.)</label>
              <input value={model.originalPrice} onChange={setNum('originalPrice')} type="number" min="0" placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stock Quantity <span className="text-red-500">*</span></label>
              <input value={model.stockQuantity} onChange={setNum('stockQuantity')} type="number" min="0" placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Low Stock Alert At</label>
              <input value={model.lowStockThreshold} onChange={setNum('lowStockThreshold')} type="number" min="1" placeholder="5" className={inputCls} />
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        <div>
          <SectionTitle n="3">Available Sizes</SectionTitle>
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-2 block">Quick select by category:</label>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setSelectedSizes('36,37,38,39,40,41,42'.split(','))} className={quickBtn}>Women (36–42)</button>
              <button type="button" onClick={() => setSelectedSizes('40,41,42,43,44,45,46'.split(','))} className={quickBtn}>Men (40–46)</button>
              <button type="button" onClick={() => setSelectedSizes('26,27,28,29,30,31,32,33,34,35'.split(','))} className={quickBtn}>Kids (26–35)</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((size) => {
              const selected = selectedSizes.includes(size);
              return (
                <button key={size} type="button" onClick={() => toggle(selectedSizes, setSelectedSizes, size)}
                  className={`w-12 h-10 rounded-xl text-sm font-bold border transition-all ${selected ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'border-slate-200 text-slate-500 hover:border-purple-300'}`}>
                  {size}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Selected: {selectedSizes.length ? selectedSizes.join(', ') : 'None'}</p>
        </div>

        <hr className="border-slate-100" />

        <div>
          <SectionTitle n="4">Available Colors</SectionTitle>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map((color) => {
              const selected = selectedColors.includes(color);
              return (
                <button key={color} type="button" onClick={() => toggle(selectedColors, setSelectedColors, color)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${selected ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-500 hover:border-purple-300'}`}>
                  {color}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input value={customColor} onChange={(e) => setCustomColor(e.target.value)} type="text" placeholder="Add custom color..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400" />
            <button type="button" onClick={addCustomColor} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">Add</button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Selected: {selectedColors.length ? selectedColors.join(', ') : 'None'}</p>
        </div>

        {model.imageUrl && (
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center gap-4">
            <img src={model.imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded-xl bg-white" />
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Preview</p>
              <p className="font-bold text-slate-900">{model.name || 'Product Name'}</p>
              <p className="text-purple-600 font-black">Rs. {n0(model.price)}</p>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <button onClick={() => navigate('/dashboard/products')} className="flex-1 py-3.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={isSaving} className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:scale-[1.02] transition-all disabled:opacity-60">
            {isSaving ? <span>Saving...</span> : <span>{isNew ? 'Add Product' : 'Save Changes'}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

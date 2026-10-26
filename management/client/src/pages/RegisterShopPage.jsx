import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SHOP_TYPES = [
  { typeKey: 'Shoes', name: 'Shoe Store', icon: '👟', available: true, description: 'Manage shoe inventory, sales, and stock for your footwear business.' },
  { typeKey: 'Clothes', name: 'Clothing Store', icon: '👕', available: true, description: 'Manage clothing inventory, styles, sizes, and sales for your apparel business.' },
];

const EMPTY_SHOP = { name: '', ownerName: '', phone: '', city: '', email: '', address: '' };

export default function RegisterShopPage() {
  const { registerShop } = useAuth();
  const navigate = useNavigate();
  const [shopTypeSelected, setShopTypeSelected] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [typeError, setTypeError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shopModel, setShopModel] = useState(EMPTY_SHOP);

  const selectType = (type) => {
    const shop = SHOP_TYPES.find((s) => s.typeKey === type);
    if (!shop || !shop.available) {
      setTypeError('This shop type is not available yet.');
      return;
    }
    setSelectedType(type);
    setShopTypeSelected(true);
    setTypeError('');
  };

  const getSelectedIcon = () => SHOP_TYPES.find((s) => s.typeKey === selectedType)?.icon || '👟';

  const update = (field) => (e) => setShopModel((m) => ({ ...m, [field]: e.target.value }));

  const handleRegisterShop = async (e) => {
    e.preventDefault();
    if (!shopModel.name || !shopModel.ownerName || !shopModel.phone || !shopModel.city || !shopModel.address) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    const result = await registerShop({ ...shopModel, type: selectedType });
    if (result.success) {
      setSuccessMessage(result.message);
      setTimeout(() => navigate(selectedType === 'Clothes' ? '/dashboard/clothes' : '/dashboard'), 600);
    } else {
      setErrorMessage(result.message);
    }
    setIsLoading(false);
  };

  if (!shopTypeSelected) {
    return (
      <div className="min-h-screen bg-obsidian-900 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.06),transparent 70%)' }}
          ></div>
        </div>
        <div className="max-w-3xl w-full relative fade-up">
          <div className="text-center mb-14">
            <p className="text-xs tracking-[0.2em] text-yellow-500/70 uppercase font-semibold mb-4">Step 1 of 2</p>
            <h1 className="font-display text-5xl font-black text-white mb-4">Choose Your Business</h1>
            <p className="text-slate-500 text-sm">Select the type of store you want to manage with MarketSuite</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {SHOP_TYPES.map((shop) => (
              <div
                key={shop.typeKey}
                onClick={() => selectType(shop.typeKey)}
                className={`glass-card rounded-2xl p-8 ${
                  shop.available ? 'cursor-pointer hover:border-yellow-500/25 transition-all duration-300 group' : 'opacity-40 cursor-not-allowed'
                } ${selectedType === shop.typeKey ? 'border-yellow-500/30' : ''}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 transition-transform duration-300 ${
                      shop.available ? 'group-hover:scale-110' : ''
                    }`}
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.12)' }}
                  >
                    {shop.icon}
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-2">{shop.name}</h3>
                  {shop.available ? (
                    <span className="badge-gold mb-4">Available Now</span>
                  ) : (
                    <span className="text-xs text-slate-600 mb-4 font-semibold tracking-wider">Coming Soon</span>
                  )}
                  <p className="text-slate-500 text-xs leading-relaxed">{shop.description}</p>
                </div>
              </div>
            ))}
          </div>

          {typeError && (
            <div className="mt-6 px-4 py-3 rounded-xl text-sm text-red-400 text-center border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>
              {typeError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.06),transparent 70%)' }}
        ></div>
      </div>
      <div className="max-w-lg w-full fade-up">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.2em] text-yellow-500/70 uppercase font-semibold mb-4">Step 2 of 2</p>
          <h1 className="font-display text-5xl font-black text-white mb-3">Set Up Store</h1>
          <p className="text-slate-500 text-sm">Fill in your store details to activate your dashboard</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-7 pb-6 border-b border-white/[0.06]">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              {getSelectedIcon()}
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">Selected Type</p>
              <p className="font-semibold text-white text-sm">{SHOP_TYPES.find((s) => s.typeKey === selectedType)?.name}</p>
            </div>
            <button
              onClick={() => {
                setShopTypeSelected(false);
                setSelectedType('');
              }}
              className="text-xs text-yellow-500 hover:text-yellow-400 font-semibold transition-colors"
            >
              Change
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-green-400 border border-green-500/20" style={{ background: 'rgba(34,197,94,0.08)' }}>
              {successMessage}
            </div>
          )}

          <form onSubmit={handleRegisterShop} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Store Name *</label>
              <input value={shopModel.name} onChange={update('name')} className="lux-input w-full px-4 py-3 text-sm" placeholder="e.g. StepUp Shoe Store" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Owner Name *</label>
                <input value={shopModel.ownerName} onChange={update('ownerName')} className="lux-input w-full px-4 py-3 text-sm" placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Phone *</label>
                <input value={shopModel.phone} onChange={update('phone')} className="lux-input w-full px-4 py-3 text-sm" placeholder="03XX-XXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">City *</label>
                <input value={shopModel.city} onChange={update('city')} className="lux-input w-full px-4 py-3 text-sm" placeholder="e.g. Lahore" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Store Email</label>
                <input value={shopModel.email} onChange={update('email')} className="lux-input w-full px-4 py-3 text-sm" placeholder="store@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Full Address *</label>
              <textarea value={shopModel.address} onChange={update('address')} rows={3} className="lux-input w-full px-4 py-3 text-sm resize-none" placeholder="Complete shop address..." />
            </div>
            <button type="submit" disabled={isLoading} className="btn-gold w-full py-4 text-sm tracking-wide">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Store...
                </span>
              ) : (
                <span>Activate Store & Enter Dashboard →</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

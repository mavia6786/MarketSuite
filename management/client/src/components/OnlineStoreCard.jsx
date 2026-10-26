import { useEffect, useState } from 'react';
import { shopApi } from '../services/miscApi';

// Owner-only switch for the public online store (needs permission shop.edit; the server enforces it too).
// Rendered at the top of the Products pages. Products are shown publicly only when this is ON and the product is "Online".
export default function OnlineStoreCard() {
  const [shop, setShop] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    shopApi.getCurrent().then(({ data }) => setShop(data)).catch(() => setError('Could not load the online store status.'));
  }, []);

  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await shopApi.setStorefront(!shop.storefrontEnabled);
      setShop(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change the online store setting.');
    }
    setBusy(false);
  };

  if (!shop && !error) return null;
  const on = !!shop?.storefrontEnabled;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-[240px] flex-1">
        <p className="text-sm font-black text-slate-900">Online store</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {on
            ? <>Your shop is public{shop.slug ? <> at <span className="font-mono">/shop/{shop.slug}</span></> : null}. Only products marked <strong>Online</strong> are shown.</>
            : 'Your shop is not visible to customers.'}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">When on, your shop name, type, city, address and phone number become public.</p>
        {error && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      {shop && (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Online store"
          disabled={busy}
          onClick={toggle}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${on ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
        >
          {busy ? 'Saving…' : on ? 'On — click to turn off' : 'Off — click to turn on'}
        </button>
      )}
    </div>
  );
}

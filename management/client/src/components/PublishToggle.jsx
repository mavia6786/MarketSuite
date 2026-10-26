// Per-product "Online" switch (needs products.edit). `onChange(next)` must return a promise; the parent updates the list.
import { useState } from 'react';

export default function PublishToggle({ published, onChange, label = 'Online' }) {
  const [busy, setBusy] = useState(false);
  const click = async () => {
    setBusy(true);
    try { await onChange(!published); } finally { setBusy(false); }
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!published}
      aria-label={label}
      disabled={busy}
      onClick={click}
      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors disabled:opacity-60 ${published ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
    >
      {published ? '● Online' : '○ Offline'}
    </button>
  );
}

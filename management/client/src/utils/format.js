// Equivalents of C# ToString("N0"), "dd MMM, hh:mm tt", etc.
export const n0 = (v) => Math.round(Number(v) || 0).toLocaleString('en-US');

export const fmtDateTime = (d) => {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const mon = date.toLocaleDateString('en-US', { month: 'short' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day} ${mon}, ${time}`;
};

export const fmtDate = (d) => {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')} ${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getFullYear()}`;
};

export const toInputDate = (d) => {
  const date = new Date(d);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
};

export const paymentBadge = (method) =>
  ({ Cash: 'bg-green-100 text-green-700', Card: 'bg-blue-100 text-blue-700', Digital: 'bg-purple-100 text-purple-700' }[method] ||
  'bg-slate-100 text-slate-600');

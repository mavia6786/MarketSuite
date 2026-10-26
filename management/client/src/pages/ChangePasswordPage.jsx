import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordPage() {
  const { isAuthenticated, currentUser, currentShop, changePassword } = useAuth();
  const navigate = useNavigate();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) { navigate('/login'); return null; }

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (next !== again) return setMsg('The new passwords do not match.');
    setBusy(true);
    const r = await changePassword(cur, next);
    setBusy(false);
    if (!r.success) return setMsg(r.message);
    navigate(r.shop?.type === 'Clothes' ? '/dashboard/clothes' : '/dashboard');
  };

  const field = 'w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 outline-none text-sm bg-white text-slate-900';
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-black text-slate-900">Change password</h1>
        {currentUser?.mustChangePassword && <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">You are using a temporary password. Choose your own password to continue.</p>}
        <label className="block mt-4 text-xs font-bold text-slate-500 uppercase">Current password
          <input type="password" className={field} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
        </label>
        <label className="block mt-3 text-xs font-bold text-slate-500 uppercase">New password
          <input type="password" className={field} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        </label>
        <p className="text-xs text-slate-400 mt-1">At least 8 characters, with a letter and a number.</p>
        <label className="block mt-3 text-xs font-bold text-slate-500 uppercase">Repeat new password
          <input type="password" className={field} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required />
        </label>
        {msg && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">{msg}</p>}
        <button disabled={busy} className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Save new password'}</button>
        <p className="text-xs text-slate-400 mt-3 text-center">{currentShop?.name}</p>
      </form>
    </div>
  );
}

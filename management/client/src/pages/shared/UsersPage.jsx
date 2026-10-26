import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '../../services/authApi';
import { fmtDate } from '../../utils/format';

const ROLES = ['Manager', 'Cashier', 'StockManager', 'Accountant'];
const ROLE_HELP = {
  Manager: 'Runs the shop: products, sales, refunds, reports, suppliers, staff. No payroll payments, no user management.',
  Cashier: 'Point of sale only: look up products and make sales.',
  StockManager: 'Products, stock changes, suppliers and receiving purchase orders. No sales or money screens.',
  Accountant: 'Reports, profit & loss, expenses, supplier payments and payroll. Cannot sell or change stock.',
};
const fld = 'w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white';
const th = 'px-4 py-3 text-xs font-bold text-slate-500 uppercase text-left';
const errText = (e) => e.response?.data?.message || 'Something went wrong.';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [form, setForm] = useState(null); // create form
  const [reset, setReset] = useState(null); // { user, password }

  const load = useCallback(async () => {
    try { setUsers((await usersApi.list()).data); } catch (e) { setMsg({ type: 'err', text: errText(e) }); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, okText) => {
    setMsg({ type: '', text: '' });
    try { await fn(); setMsg({ type: 'ok', text: okText }); await load(); return true; } catch (e) { setMsg({ type: 'err', text: errText(e) }); return false; }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Users &amp; roles</h1>
          <p className="text-sm text-slate-500">Create accounts for your staff. New users must change the temporary password at first login.</p>
        </div>
        <button onClick={() => setForm({ fullName: '', email: '', phone: '', role: 'Cashier', password: '' })} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">+ Add user</button>
      </div>

      {msg.text && <p className={`mb-3 text-sm rounded-lg p-3 ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</p>}

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className={th}>Name</th><th className={th}>Role</th><th className={th}>Status</th><th className={th}>Last login</th><th className={th}></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="p-6 text-center text-slate-400">Loading…</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3"><p className="font-bold text-slate-800">{u.fullName}</p><p className="text-xs text-slate-400">{u.email}</p></td>
                <td className="px-4 py-3">
                  {u.role === 'Owner' ? <span className="font-bold text-amber-700">Owner</span> : (
                    <select value={u.role} onChange={(e) => run(() => usersApi.update(u.id, { role: e.target.value }), 'Role updated. The user must log in again.')} className="border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white">
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {u.isActive ? <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-bold">Active</span> : <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-500 font-bold">Disabled</span>}
                  {u.locked && <span className="ml-1 px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold">Locked</span>}
                  {u.mustChangePassword && <span className="ml-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">Temp password</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—'}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {u.role !== 'Owner' && (
                    <>
                      <button onClick={() => setReset({ user: u, password: '' })} className="text-xs font-bold text-indigo-600 mr-3">Reset password</button>
                      {u.locked && <button onClick={() => run(() => usersApi.unlock(u.id), 'Account unlocked.')} className="text-xs font-bold text-amber-600 mr-3">Unlock</button>}
                      <button onClick={() => run(() => usersApi.update(u.id, { isActive: !u.isActive }), u.isActive ? 'User disabled.' : 'User enabled.')} className={`text-xs font-bold ${u.isActive ? 'text-red-600' : 'text-green-600'}`}>{u.isActive ? 'Disable' : 'Enable'}</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow p-5">
        <h2 className="font-black text-slate-800 mb-2">What each role can do</h2>
        <ul className="text-sm text-slate-600 space-y-1">
          <li><b>Owner:</b> everything, including users and the shop profile.</li>
          {ROLES.map((r) => <li key={r}><b>{r}:</b> {ROLE_HELP[r]}</li>)}
        </ul>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <form className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => { e.preventDefault(); if (await run(() => usersApi.create(form), 'User created. Give them the temporary password.')) setForm(null); }}>
            <h3 className="text-lg font-black text-slate-900 mb-3">Add user</h3>
            <label className="block text-xs font-bold text-slate-500 uppercase">Full name<input className={fld} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label>
            <label className="block mt-3 text-xs font-bold text-slate-500 uppercase">Email (login)<input type="email" className={fld} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label className="block mt-3 text-xs font-bold text-slate-500 uppercase">Phone<input className={fld} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="block mt-3 text-xs font-bold text-slate-500 uppercase">Role
              <select className={fld} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <p className="text-xs text-slate-400 mt-1">{ROLE_HELP[form.role]}</p>
            <label className="block mt-3 text-xs font-bold text-slate-500 uppercase">Temporary password<input className={fld} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
            <p className="text-xs text-slate-400 mt-1">At least 8 characters, a letter and a number. The user must change it at first login.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500">Cancel</button>
              <button className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">Create user</button>
            </div>
          </form>
        </div>
      )}

      {reset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReset(null)}>
          <form className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => { e.preventDefault(); if (await run(() => usersApi.resetPassword(reset.user.id, reset.password), 'Password reset. The user is logged out and must choose a new one.')) setReset(null); }}>
            <h3 className="text-lg font-black text-slate-900 mb-1">Reset password</h3>
            <p className="text-sm text-slate-500 mb-3">{reset.user.fullName} ({reset.user.email})</p>
            <label className="block text-xs font-bold text-slate-500 uppercase">New temporary password<input className={fld} value={reset.password} onChange={(e) => setReset({ ...reset, password: e.target.value })} required /></label>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setReset(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500">Cancel</button>
              <button className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">Reset</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

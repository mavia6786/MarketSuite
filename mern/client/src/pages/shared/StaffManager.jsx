import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { staffApi } from '../../services/staffApi';
import { themeOf } from '../../utils/theme';
import { n0, toInputDate } from '../../utils/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const recKey = (r) => String(r.date).slice(0, 10); // attendance is stored as UTC midnight of the calendar day
const fld = 'w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white';
const th = 'px-4 py-3 text-xs font-bold text-slate-500 uppercase text-left';
const EMPTY = { name: '', employeeId: '', phone: '', email: '', salary: '', joiningDate: toInputDate(new Date()), address: '', notes: '', isActive: true };

function Modal({ title, onClose, children, width = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${width} p-6 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const Stat = ({ label, value, tone = 'text-slate-900', sub }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
    <p className="text-xs text-slate-500 font-semibold">{label}</p>
    <p className={`text-xl font-black mt-1 ${tone}`}>{value}</p>
    {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

export default function StaffManager({ vertical }) {
  const t = themeOf(vertical);
  const api = useMemo(() => staffApi(vertical), [vertical]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = dayKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const [tab, setTab] = useState('staff');
  const [staff, setStaff] = useState([]);
  const [curAtt, setCurAtt] = useState({}); // this month's attendance per staff id (for "today" + counts)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // attendance tab
  const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attStaffId, setAttStaffId] = useState('');
  const [attRecords, setAttRecords] = useState([]);

  // salary tab
  const [salMonth, setSalMonth] = useState(now.getMonth() + 1);
  const [salYear, setSalYear] = useState(now.getFullYear());
  const [reports, setReports] = useState([]);
  const [salLoading, setSalLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  // modals
  const [staffModal, setStaffModal] = useState(null); // {id|null, form}
  const [modalErr, setModalErr] = useState('');
  const [payModal, setPayModal] = useState(null); // {report, amount, note}
  const [bonusModal, setBonusModal] = useState(null);
  const [advModal, setAdvModal] = useState(null); // {staff, amount, date, note}

  const active = staff.filter((s) => s.isActive);

  const flash = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };
  const fail = (err) => flash(err.response?.data?.message || err.message);

  const loadCurrentAttendance = useCallback(async (list) => {
    const map = {};
    await Promise.all(
      list.filter((s) => s.isActive).map(async (s) => {
        const { data } = await api.attendance(s._id, now.getMonth() + 1, now.getFullYear());
        map[s._id] = data;
      })
    );
    setCurAtt(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const loadAll = useCallback(async () => {
    const { data } = await api.list();
    setStaff(data);
    await loadCurrentAttendance(data);
    setLoading(false);
    return data;
  }, [api, loadCurrentAttendance]);

  const loadReports = useCallback(async (m = salMonth, y = salYear) => {
    setSalLoading(true);
    try {
      const { data } = await api.salaryReports(m, y);
      setReports(data);
    } catch (err) {
      fail(err);
    }
    setSalLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, salMonth, salYear]);

  const loadAttendance = useCallback(async (id = attStaffId, m = attMonth, y = attYear) => {
    if (!id) return setAttRecords([]);
    const { data } = await api.attendance(id, m, y);
    setAttRecords(data);
  }, [api, attStaffId, attMonth, attYear]);

  useEffect(() => {
    document.title = vertical === 'clothes' ? 'Staff Management' : 'Salesmen';
    loadAll().catch(fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical]);

  useEffect(() => { if (tab === 'salary') loadReports(); }, [tab, salMonth, salYear]); // eslint-disable-line
  useEffect(() => { if (tab === 'attendance') loadAttendance(); }, [tab, attStaffId, attMonth, attYear]); // eslint-disable-line

  // ── attendance ────────────────────────────────────────────────────────────
  const todayRec = (id) => (curAtt[id] || []).find((r) => recKey(r) === todayKey);
  const presentThisMonth = (id) => (curAtt[id] || []).filter((r) => r.isPresent).length;

  const markToday = async (id, isPresent) => {
    try {
      await api.mark(id, todayKey, isPresent);
      await loadCurrentAttendance(staff);
    } catch (err) { fail(err); }
  };
  const markAllToday = async (isPresent) => {
    try {
      await Promise.all(active.map((s) => api.mark(s._id, todayKey, isPresent)));
      await loadCurrentAttendance(staff);
    } catch (err) { fail(err); }
  };
  const toggleDay = async (day) => {
    if (!attStaffId) return;
    const date = new Date(attYear, attMonth - 1, day);
    if (date > today || date.getDay() === 0) return;
    const key = dayKey(attYear, attMonth, day);
    const rec = attRecords.find((r) => recKey(r) === key);
    try {
      await api.mark(attStaffId, key, !rec || !rec.isPresent);
      await loadAttendance();
      await loadCurrentAttendance(staff);
    } catch (err) { fail(err); }
  };

  // ── staff CRUD ────────────────────────────────────────────────────────────
  const openStaff = (s) => {
    setModalErr('');
    setStaffModal(s ? { id: s._id, form: { ...EMPTY, ...s, joiningDate: toInputDate(s.joiningDate) } } : { id: null, form: { ...EMPTY } });
  };
  const saveStaff = async () => {
    const f = staffModal.form;
    if (!f.name.trim()) return setModalErr('Full name is required');
    if (!f.phone.trim()) return setModalErr('Phone is required');
    if (!(Number(f.salary) > 0)) return setModalErr('Monthly salary must be greater than 0');
    const [y, m, d] = f.joiningDate.split('-').map(Number);
    const payload = {
      name: f.name.trim(), employeeId: (f.employeeId || '').trim(), phone: f.phone.trim(), email: (f.email || '').trim(),
      salary: Number(f.salary), joiningDate: new Date(y, m - 1, d).toISOString(), address: (f.address || '').trim(),
      notes: (f.notes || '').trim(), isActive: f.isActive,
    };
    try {
      if (staffModal.id) await api.update(staffModal.id, payload);
      else await api.create(payload);
      setStaffModal(null);
      await loadAll();
      if (tab === 'salary') loadReports();
    } catch (err) { setModalErr(err.response?.data?.message || err.message); }
  };
  const deleteStaff = async (s) => {
    if (!window.confirm(`Delete ${s.name}? Attendance, salary and advance records will be removed too.`)) return;
    try { await api.remove(s._id); await loadAll(); } catch (err) { fail(err); }
  };

  // ── salary actions ────────────────────────────────────────────────────────
  const confirmPay = async () => {
    const { report, amount, note } = payModal;
    if (!(Number(amount) > 0)) return;
    try {
      await api.pay(report.salesman._id, salMonth, salYear, Number(amount), note);
      setPayModal(null);
      loadReports();
    } catch (err) { fail(err); }
  };
  const undoPay = async (r) => {
    if (!window.confirm(`Undo salary payment for ${r.salesman.name}?`)) return;
    try { await api.undoPay(r.salesman._id, salMonth, salYear); loadReports(); } catch (err) { fail(err); }
  };
  const confirmBonus = async () => {
    const { report, amount, note } = bonusModal;
    if (!(Number(amount) >= 0)) return;
    try {
      await api.bonus(report.salesman._id, salMonth, salYear, Number(amount), note);
      setBonusModal(null);
      loadReports();
    } catch (err) { fail(err); }
  };
  const confirmAdvance = async () => {
    const { staff: s, amount, date, note } = advModal;
    if (!(Number(amount) > 0)) return flash('Enter an advance amount greater than 0');
    try {
      await api.addAdvance(s._id, { amount: Number(amount), date, note });
      setAdvModal(null);
      if (tab === 'salary') loadReports();
    } catch (err) { fail(err); }
  };
  const removeAdvance = async (r, adv) => {
    if (!window.confirm(`Remove advance of Rs. ${n0(adv.amount)}?`)) return;
    try { await api.deleteAdvance(r.salesman._id, adv._id); loadReports(); } catch (err) { fail(err); }
  };
  const openAdvance = (s, month = now.getMonth() + 1, year = now.getFullYear()) => {
    // default date: today if the chosen month is the current one, otherwise the 1st of that month
    const isCurrent = month === now.getMonth() + 1 && year === now.getFullYear();
    setAdvModal({ staff: s, amount: '', date: isCurrent ? todayKey : dayKey(year, month, 1), note: '' });
  };

  const totals = useMemo(() => ({
    net: reports.reduce((a, r) => a + r.netPayable, 0),
    adv: reports.reduce((a, r) => a + r.advanceTotal, 0),
    paid: reports.reduce((a, r) => a + r.amountPaid, 0),
    remaining: reports.reduce((a, r) => a + Math.max(0, r.remaining), 0),
  }), [reports]);

  const setF = (k) => (e) => setStaffModal((m) => ({ ...m, form: { ...m.form, [k]: e.target.value } }));
  const Spinner = () => <div className="flex justify-center py-16"><div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${t.spin}`}></div></div>;
  const selCls = 'px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white';

  // ── views ─────────────────────────────────────────────────────────────────
  const todayPanel = (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-black text-slate-900">Today's Attendance</p>
          <p className="text-xs text-slate-500">{today.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}{today.getDay() === 0 ? ' · Sunday (weekly off)' : ''}</p>
        </div>
        {active.length > 0 && today.getDay() !== 0 && (
          <div className="flex gap-2">
            <button onClick={() => markAllToday(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100">Mark all present</button>
            <button onClick={() => markAllToday(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100">Mark all absent</button>
          </div>
        )}
      </div>
      {active.length === 0 ? <p className="p-6 text-sm text-slate-400 text-center">No active staff yet.</p> : (
        <div className="divide-y divide-slate-100">
          {active.map((s) => {
            const rec = todayRec(s._id);
            return (
              <div key={s._id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${t.grad} flex items-center justify-center text-white font-black`}>{s.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400">{presentThisMonth(s._id)} days present this month</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${!rec ? 'bg-slate-100 text-slate-500' : rec.isPresent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {!rec ? 'Not marked' : rec.isPresent ? 'Present' : 'Absent'}
                </span>
                {today.getDay() !== 0 && (
                  <div className="flex gap-1">
                    <button onClick={() => markToday(s._id, true)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${rec?.isPresent ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-green-100'}`}>P</button>
                    <button onClick={() => markToday(s._id, false)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${rec && !rec.isPresent ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-red-100'}`}>A</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const staffTable = (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr><th className={th}>Name</th><th className={th}>ID</th><th className={th}>Phone</th><th className={th}>Joined</th><th className={`${th} text-right`}>Salary</th><th className={th}>Status</th><th className={`${th} text-right`}>Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {staff.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400">No staff added yet. Click “Add Staff”.</td></tr>}
          {staff.map((s) => (
            <tr key={s._id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3 font-bold text-slate-800">{s.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.employeeId}</td>
              <td className="px-4 py-3 text-slate-600">{s.phone}</td>
              <td className="px-4 py-3 text-slate-500">{toInputDate(s.joiningDate)}</td>
              <td className="px-4 py-3 text-right font-bold">Rs. {n0(s.salary)}</td>
              <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <button onClick={() => openAdvance(s)} className={`text-xs font-bold px-2.5 py-1 rounded-lg mr-1 ${t.btnSoft}`}>+ Advance</button>
                <button onClick={() => { setAttStaffId(s._id); setTab('attendance'); }} className="text-xs font-bold px-2.5 py-1 rounded-lg mr-1 bg-slate-100 text-slate-600 hover:bg-slate-200">Attendance</button>
                <button onClick={() => openStaff(s)} className="text-xs font-bold px-2.5 py-1 rounded-lg mr-1 bg-slate-100 text-slate-600 hover:bg-slate-200">Edit</button>
                <button onClick={() => deleteStaff(s)} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const calendar = () => {
    const s = staff.find((x) => x._id === attStaffId);
    if (!s) return <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">Select a staff member to see their calendar.</div>;
    const dim = new Date(attYear, attMonth, 0).getDate();
    let first = new Date(attYear, attMonth - 1, 1).getDay();
    first = first === 0 ? 6 : first - 1; // Monday first
    let working = 0;
    for (let d = 1; d <= dim; d++) if (new Date(attYear, attMonth - 1, d).getDay() !== 0) working++;
    const present = attRecords.filter((r) => r.isPresent).length;
    const absent = attRecords.filter((r) => !r.isPresent).length;
    const cells = [];
    for (let b = 0; b < first; b++) cells.push(<div key={`b${b}`} />);
    for (let d = 1; d <= dim; d++) {
      const date = new Date(attYear, attMonth - 1, d);
      const rec = attRecords.find((r) => recKey(r) === dayKey(attYear, attMonth, d));
      const future = date > today; const sunday = date.getDay() === 0; const isToday = date.getTime() === today.getTime();
      const cls = sunday ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-default'
        : future ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
        : !rec ? 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 cursor-pointer'
        : rec.isPresent ? 'bg-green-100 border-green-400 text-green-800 cursor-pointer' : 'bg-red-100 border-red-300 text-red-700 cursor-pointer';
      cells.push(
        <div key={d} onClick={() => toggleDay(d)} className={`rounded-xl border-2 py-2 flex flex-col items-center font-bold transition-all ${cls} ${isToday ? 'ring-2 ring-offset-1 ring-slate-800' : ''}`}>
          <span className="text-sm leading-tight">{d}</span>
          <span className="text-[10px] leading-none mt-0.5">{sunday ? 'Off' : rec ? (rec.isPresent ? 'P' : 'A') : isToday ? 'TODAY' : ''}</span>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`${t.grad} px-5 py-4 flex flex-wrap items-center justify-between gap-3`}>
          <div><p className="text-white font-black text-lg">{s.name}</p><p className="text-white/80 text-sm">{MONTHS[attMonth - 1]} {attYear}</p></div>
          <div className="flex gap-3 text-center">
            {[['Present', present], ['Absent', absent], ['Working days', working]].map(([l, v]) => (
              <div key={l} className="bg-white/20 rounded-xl px-4 py-2"><p className="text-white/70 text-[10px] font-bold uppercase">{l}</p><p className="text-white font-black text-xl">{v}</p></div>
            ))}
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-7 gap-2 mb-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((n) => <div key={n} className={`text-center text-xs font-black py-1 ${n === 'Sun' ? 'text-amber-500' : 'text-slate-500'}`}>{n}</div>)}</div>
          <div className="grid grid-cols-7 gap-2">{cells}</div>
          <p className="text-xs text-slate-400 mt-3">Click a day to toggle Present / Absent. Sundays are off; future days are locked.</p>
        </div>
      </div>
    );
  };

  const salaryView = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={salMonth} onChange={(e) => setSalMonth(Number(e.target.value))} className={selCls}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        <select value={salYear} onChange={(e) => setSalYear(Number(e.target.value))} className={selCls}>{years.map((y) => <option key={y}>{y}</option>)}</select>
        <p className="text-xs text-slate-400 ml-2">Net payable = earned salary + bonus − advances taken this month</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total net payable" value={`Rs. ${n0(totals.net)}`} />
        <Stat label="Advances given" value={`Rs. ${n0(totals.adv)}`} tone="text-amber-600" sub="deducted from this month" />
        <Stat label="Paid" value={`Rs. ${n0(totals.paid)}`} tone="text-green-600" />
        <Stat label="Still to pay" value={`Rs. ${n0(totals.remaining)}`} tone={totals.remaining > 0 ? 'text-red-600' : 'text-green-600'} />
      </div>
      {salLoading ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className={th}>Staff</th><th className={`${th} text-right`}>Salary</th><th className={`${th} text-center`}>Present</th>
                <th className={`${th} text-right`}>Earned</th><th className={`${th} text-right`}>Bonus</th><th className={`${th} text-right`}>Advance</th>
                <th className={`${th} text-right`}>Net payable</th><th className={`${th} text-right`}>Paid</th><th className={`${th} text-right`}>Remaining</th><th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.length === 0 && <tr><td colSpan="10" className="p-8 text-center text-slate-400">No active staff.</td></tr>}
              {reports.map((r) => (
                <Fragment key={r.salesman._id}>
                  <tr className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-bold text-slate-800">{r.salesman.name}</td>
                    <td className="px-4 py-3 text-right">Rs. {n0(r.monthlySalary)}</td>
                    <td className="px-4 py-3 text-center">{r.presentDays}/{r.workingDays}</td>
                    <td className="px-4 py-3 text-right">Rs. {n0(r.earnedSalary)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{r.bonus > 0 ? `+ ${n0(r.bonus)}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-amber-600">
                      {r.advanceTotal > 0 ? (
                        <button onClick={() => setExpanded(expanded === r.salesman._id ? null : r.salesman._id)} className="font-bold underline decoration-dotted">− {n0(r.advanceTotal)}</button>
                      ) : '—'}
                      {r.advanceCarryOver > 0 && <p className="text-[10px] text-red-500 font-semibold">Rs. {n0(r.advanceCarryOver)} exceeds pay</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-black">Rs. {n0(r.netPayable)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">{r.amountPaid > 0 ? `Rs. ${n0(r.amountPaid)}` : '—'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{r.isPaid && r.remaining <= 0 ? 'Paid ✓' : `Rs. ${n0(r.remaining)}`}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.isPaid
                        ? <button onClick={() => undoPay(r)} className="text-xs font-bold px-2.5 py-1 rounded-lg mr-1 bg-slate-100 text-slate-600 hover:bg-slate-200">Undo</button>
                        : <button onClick={() => setPayModal({ report: r, amount: Math.max(0, r.netPayable), note: '' })} className="text-xs font-bold px-2.5 py-1 rounded-lg mr-1 bg-green-600 text-white hover:bg-green-700">Pay</button>}
                      <button onClick={() => setBonusModal({ report: r, amount: r.bonus || '', note: r.bonusNote || '' })} className="text-xs font-bold px-2.5 py-1 rounded-lg mr-1 bg-slate-100 text-slate-600 hover:bg-slate-200">Bonus</button>
                      <button onClick={() => openAdvance(r.salesman, salMonth, salYear)} className={`text-xs font-bold px-2.5 py-1 rounded-lg ${t.btnSoft}`}>+ Advance</button>
                    </td>
                  </tr>
                  {expanded === r.salesman._id && r.advances.length > 0 && (
                    <tr className="bg-amber-50/50">
                      <td colSpan="10" className="px-6 py-3">
                        <p className="text-xs font-bold text-amber-700 mb-2">Advances taken in {MONTHS[salMonth - 1]}</p>
                        <div className="flex flex-wrap gap-2">
                          {r.advances.map((a) => (
                            <span key={a._id} className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs">
                              <b>Rs. {n0(a.amount)}</b><span className="text-slate-500">{String(a.date).slice(0, 10)}</span>{a.note && <span className="text-slate-400">· {a.note}</span>}
                              <button onClick={() => removeAdvance(r, a)} className="text-red-500 font-bold">×</button>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{vertical === 'clothes' ? 'Staff Management' : 'Salesmen'}</h1>
          <p className="text-sm text-slate-500">Staff, daily attendance, advances and monthly salary</p>
        </div>
        <button onClick={() => openStaff(null)} className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow ${t.btn}`}>+ Add {vertical === 'clothes' ? 'Staff' : 'Salesman'}</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="flex gap-6 border-b border-slate-200">
        {[['staff', 'Staff & Today'], ['attendance', 'Attendance Calendar'], ['salary', 'Salary & Advances']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`pb-3 text-sm font-bold border-b-2 -mb-px ${tab === k ? t.tabOn : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {tab === 'staff' && <div className="space-y-5">{todayPanel}{staffTable}</div>}
          {tab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <select value={attStaffId} onChange={(e) => setAttStaffId(e.target.value)} className={selCls}>
                  <option value="">Select staff…</option>{staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <select value={attMonth} onChange={(e) => setAttMonth(Number(e.target.value))} className={selCls}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
                <select value={attYear} onChange={(e) => setAttYear(Number(e.target.value))} className={selCls}>{years.map((y) => <option key={y}>{y}</option>)}</select>
              </div>
              {calendar()}
            </div>
          )}
          {tab === 'salary' && salaryView}
        </>
      )}

      {/* staff add / edit */}
      {staffModal && (
        <Modal title={staffModal.id ? 'Edit staff' : 'Add staff'} onClose={() => setStaffModal(null)} width="max-w-lg">
          {modalErr && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{modalErr}</div>}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-xs font-bold text-slate-600">Full name *<input className={`${fld} ${t.ring}`} value={staffModal.form.name} onChange={setF('name')} /></label>
            <label className="text-xs font-bold text-slate-600">Phone *<input className={`${fld} ${t.ring}`} value={staffModal.form.phone} onChange={setF('phone')} /></label>
            <label className="text-xs font-bold text-slate-600">Employee ID<input className={`${fld} ${t.ring}`} value={staffModal.form.employeeId} onChange={setF('employeeId')} placeholder="auto if empty" /></label>
            <label className="text-xs font-bold text-slate-600">Monthly salary (Rs.) *<input type="number" min="0" className={`${fld} ${t.ring}`} value={staffModal.form.salary} onChange={setF('salary')} /></label>
            <label className="text-xs font-bold text-slate-600">Joining date<input type="date" className={`${fld} ${t.ring}`} value={staffModal.form.joiningDate} onChange={setF('joiningDate')} /></label>
            <label className="col-span-2 text-xs font-bold text-slate-600">Email<input className={`${fld} ${t.ring}`} value={staffModal.form.email} onChange={setF('email')} /></label>
            <label className="col-span-2 text-xs font-bold text-slate-600">Address<input className={`${fld} ${t.ring}`} value={staffModal.form.address} onChange={setF('address')} /></label>
            <label className="col-span-2 text-xs font-bold text-slate-600">Notes<input className={`${fld} ${t.ring}`} value={staffModal.form.notes} onChange={setF('notes')} /></label>
            <label className="col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={staffModal.form.isActive} onChange={(e) => setStaffModal((m) => ({ ...m, form: { ...m.form, isActive: e.target.checked } }))} /> Active
            </label>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setStaffModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={saveStaff} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${t.btn}`}>Save</button>
          </div>
        </Modal>
      )}

      {/* advance */}
      {advModal && (
        <Modal title={`Give advance — ${advModal.staff.name}`} onClose={() => setAdvModal(null)}>
          <p className="text-xs text-slate-500 mb-3">The advance is deducted from the salary of the month it is given in.</p>
          <label className="text-xs font-bold text-slate-600">Amount (Rs.)<input type="number" min="1" autoFocus className={`${fld} ${t.ring}`} value={advModal.amount} onChange={(e) => setAdvModal({ ...advModal, amount: e.target.value })} /></label>
          <label className="block mt-3 text-xs font-bold text-slate-600">Date<input type="date" className={`${fld} ${t.ring}`} value={advModal.date} onChange={(e) => setAdvModal({ ...advModal, date: e.target.value })} /></label>
          <label className="block mt-3 text-xs font-bold text-slate-600">Note<input className={`${fld} ${t.ring}`} value={advModal.note} placeholder="e.g. medical, Eid" onChange={(e) => setAdvModal({ ...advModal, note: e.target.value })} /></label>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setAdvModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={confirmAdvance} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${t.btn}`}>Give advance</button>
          </div>
        </Modal>
      )}

      {/* pay salary */}
      {payModal && (
        <Modal title={`Pay salary — ${payModal.report.salesman.name}`} onClose={() => setPayModal(null)}>
          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1 mb-3">
            <div className="flex justify-between"><span className="text-slate-500">Earned ({payModal.report.presentDays}/{payModal.report.workingDays} days)</span><b>Rs. {n0(payModal.report.earnedSalary)}</b></div>
            {payModal.report.bonus > 0 && <div className="flex justify-between"><span className="text-slate-500">Bonus</span><b className="text-green-600">+ Rs. {n0(payModal.report.bonus)}</b></div>}
            {payModal.report.advanceDeducted > 0 && <div className="flex justify-between"><span className="text-slate-500">Advances deducted</span><b className="text-amber-600">− Rs. {n0(payModal.report.advanceDeducted)}</b></div>}
            <div className="flex justify-between border-t border-slate-200 pt-1"><span className="font-bold">Net payable</span><b>Rs. {n0(payModal.report.netPayable)}</b></div>
          </div>
          <label className="text-xs font-bold text-slate-600">Amount paying now (Rs.)<input type="number" min="1" className={`${fld} ${t.ring}`} value={payModal.amount} onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })} /></label>
          <label className="block mt-3 text-xs font-bold text-slate-600">Note<input className={`${fld} ${t.ring}`} value={payModal.note} onChange={(e) => setPayModal({ ...payModal, note: e.target.value })} /></label>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setPayModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={confirmPay} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white">Confirm payment</button>
          </div>
        </Modal>
      )}

      {/* bonus */}
      {bonusModal && (
        <Modal title={`Bonus — ${bonusModal.report.salesman.name}`} onClose={() => setBonusModal(null)}>
          <label className="text-xs font-bold text-slate-600">Bonus for {MONTHS[salMonth - 1]} (Rs.)<input type="number" min="0" className={`${fld} ${t.ring}`} value={bonusModal.amount} onChange={(e) => setBonusModal({ ...bonusModal, amount: e.target.value })} /></label>
          <label className="block mt-3 text-xs font-bold text-slate-600">Reason<input className={`${fld} ${t.ring}`} value={bonusModal.note} onChange={(e) => setBonusModal({ ...bonusModal, note: e.target.value })} /></label>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setBonusModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={confirmBonus} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${t.btn}`}>Save bonus</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

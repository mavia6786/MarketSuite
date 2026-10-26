import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeApi } from '../../services/financeApi';
import { themeOf } from '../../utils/theme';
import { n0, fmtDate, toInputDate } from '../../utils/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const th = 'px-3 py-3 text-xs font-bold text-slate-500 uppercase text-right';
const fld = 'w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white';
const money = (v) => `${v < 0 ? '− ' : ''}Rs. ${n0(Math.abs(v))}`;
const short = (v) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${Math.round(a / 1e3)}k` : String(Math.round(a));
  return (v < 0 ? '-' : '') + s;
};
const BADGE = { Profit: 'bg-green-100 text-green-700', Loss: 'bg-red-100 text-red-700', 'No data': 'bg-slate-100 text-slate-400' };

function Stat({ label, value, tone = 'text-slate-900', sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs text-slate-500 font-semibold">{label}</p>
      <p className={`text-xl font-black mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// Revenue bar + net profit bar per month (net can go negative). Forecast months are drawn lighter/outlined.
function Chart({ data }) {
  const W = 760, H = 240, padL = 44, padB = 28, padT = 12;
  const max = Math.max(1, ...data.flatMap((d) => [d.revenue, d.net]));
  const min = Math.min(0, ...data.map((d) => d.net));
  const span = max - min || 1;
  const y = (v) => padT + ((max - v) / span) * (H - padT - padB);
  const slot = (W - padL) / Math.max(1, data.length);
  const bw = Math.min(26, slot / 2.6);
  const ticks = [max, max / 2, 0, ...(min < 0 ? [min] : [])];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {ticks.map((tk, i) => (
        <g key={i}>
          <line x1={padL} x2={W} y1={y(tk)} y2={y(tk)} stroke={tk === 0 ? '#94a3b8' : '#e2e8f0'} strokeDasharray={tk === 0 ? '' : '3 3'} />
          <text x={padL - 6} y={y(tk) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{short(tk)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = padL + slot * i + slot / 2;
        const f = d.forecast ? 0.45 : 1;
        return (
          <g key={i} opacity={f}>
            <rect x={cx - bw - 1} y={y(d.revenue)} width={bw} height={Math.max(1, y(0) - y(d.revenue))} rx="3" fill="#94a3b8" />
            <rect x={cx + 1} y={d.net >= 0 ? y(d.net) : y(0)} width={bw} height={Math.max(1, Math.abs(y(d.net) - y(0)))} rx="3" fill={d.net >= 0 ? '#16a34a' : '#dc2626'} strokeDasharray={d.forecast ? '3 2' : ''} stroke={d.forecast ? '#0f172a' : 'none'} />
            <text x={cx} y={H - 10} textAnchor="middle" fontSize="10" fill="#64748b">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function FinancePage({ vertical }) {
  const t = themeOf(vertical);
  const navigate = useNavigate();
  const now = new Date();
  const [tab, setTab] = useState('pnl');
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null); // {row, ...}
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState('');

  // expenses
  const [expMonth, setExpMonth] = useState(now.getMonth() + 1);
  const [expYear, setExpYear] = useState(now.getFullYear());
  const [expenses, setExpenses] = useState(null);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ category: 'Rent', amount: '', date: toInputDate(now), note: '' });

  const fail = (err) => {
    setError(err.response?.data?.message || err.message);
    setTimeout(() => setError(''), 5000);
  };

  useEffect(() => {
    document.title = 'Profit & Loss';
    financeApi.categories().then(({ data: c }) => setCats(c)).catch(() => {});
  }, []);

  useEffect(() => {
    setData(null);
    setDetail(null);
    financeApi.monthly(year).then(({ data: d }) => setData(d)).catch(fail);
  }, [year]);

  useEffect(() => {
    if (tab === 'forecast' && !forecast) financeApi.forecast().then(({ data: d }) => setForecast(d)).catch(fail);
  }, [tab, forecast]);

  const loadExpenses = useCallback(() => {
    financeApi.expenses(expYear, expMonth).then(({ data: d }) => setExpenses(d)).catch(fail);
  }, [expYear, expMonth]);
  useEffect(() => { if (tab === 'expenses') loadExpenses(); }, [tab, loadExpenses]);

  const openMonth = async (row) => {
    if (row.status === 'No data') return;
    setDetail({ row, loading: true });
    try {
      const { data: d } = await financeApi.monthDetail(year, row.month);
      setDetail({ row, ...d });
    } catch (err) { fail(err); setDetail(null); }
  };

  const refreshMoney = () => {
    setForecast(null);
    financeApi.monthly(year).then(({ data: d }) => setData(d));
  };

  const addExpense = async () => {
    if (!(Number(form.amount) > 0)) return fail({ message: 'Enter an amount greater than 0' });
    try {
      await financeApi.addExpense({ ...form, amount: Number(form.amount) });
      setForm({ ...form, amount: '', note: '' });
      loadExpenses();
      refreshMoney();
    } catch (err) { fail(err); }
  };
  const removeExpense = async (e) => {
    if (!window.confirm(`Delete ${e.category} expense of Rs. ${n0(e.amount)}?`)) return;
    try {
      await financeApi.removeExpense(e._id);
      loadExpenses();
      refreshMoney();
    } catch (err) { fail(err); }
  };

  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];
  const selCls = 'px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm bg-white';
  const Spinner = () => <div className="flex justify-center py-16"><div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${t.spin}`}></div></div>;

  // ── P&L ───────────────────────────────────────────────────────────────────
  const pnl = !data ? <Spinner /> : (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Revenue" value={money(data.totals.revenue)} sub={`${n0(data.totals.orders)} orders`} />
        <Stat label="Gross profit" value={money(data.totals.grossProfit)} sub={data.totals.revenue ? `${Math.round((data.totals.grossProfit / data.totals.revenue) * 100)}% margin` : ''} />
        <Stat label="Salaries + expenses" value={money(data.totals.salaries + data.totals.expenses)} tone="text-amber-600" sub={`Salaries ${short(data.totals.salaries)} · Expenses ${short(data.totals.expenses)}`} />
        <Stat label="Net profit" value={money(data.totals.netProfit)} tone={data.totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
        <Stat label="Profit / loss months" value={`${data.totals.profitMonths} / ${data.totals.lossMonths}`} sub={data.totals.bestMonth ? `Best ${data.totals.bestMonth} · Weakest ${data.totals.worstMonth}` : 'No data yet'} />
      </div>

      {data.totals.itemsMissingCost > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          {data.totals.itemsMissingCost} sold item(s) have no cost price, so profit is overstated. Set cost prices in Products (or run <code>npm run migrate</code> once on the server).
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="font-black text-slate-900">Revenue vs Net profit</p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-slate-400 inline-block" /> Revenue</span>
            <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-green-600 inline-block" /> Profit</span>
            <span className="flex items-center gap-1"><i className="w-3 h-3 rounded bg-red-600 inline-block" /> Loss</span>
          </div>
        </div>
        <Chart data={data.months.map((m) => ({ label: m.label, revenue: m.revenue, net: m.netProfit }))} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className={`${th} text-left`}>Month</th><th className={th}>Orders</th><th className={th}>Revenue</th><th className={th}>Cost of goods</th>
              <th className={th}>Gross profit</th><th className={th}>Salaries</th><th className={th}>Expenses</th><th className={th}>Net profit</th><th className={`${th} text-center`}>Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.months.map((m) => (
              <tr key={m.month} onClick={() => openMonth(m)} className={`${m.status === 'No data' ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'} ${detail?.row?.month === m.month ? 'bg-slate-50' : ''}`}>
                <td className="px-3 py-3 font-bold text-slate-800">{MONTHS[m.month - 1]}{m.isCurrent && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">in progress</span>}</td>
                <td className="px-3 py-3 text-right">{m.orders || '—'}</td>
                <td className="px-3 py-3 text-right">{m.status === 'No data' ? '—' : n0(m.revenue)}</td>
                <td className="px-3 py-3 text-right text-slate-500">{m.status === 'No data' ? '—' : n0(m.cogs)}</td>
                <td className="px-3 py-3 text-right">{m.status === 'No data' ? '—' : n0(m.grossProfit)}{m.revenue > 0 && <span className="block text-[10px] text-slate-400">{m.grossMargin}%</span>}</td>
                <td className="px-3 py-3 text-right text-slate-500">{m.status === 'No data' ? '—' : n0(m.salaries)}{m.salaryEstimated && <span title="No attendance marked — full salary assumed" className="text-amber-500"> *</span>}</td>
                <td className="px-3 py-3 text-right text-slate-500">{m.status === 'No data' ? '—' : n0(m.expenses)}</td>
                <td className={`px-3 py-3 text-right font-black ${m.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{m.status === 'No data' ? '—' : money(m.netProfit)}</td>
                <td className="px-3 py-3 text-center"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${BADGE[m.status]}`}>{m.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Net profit = Revenue − cost of goods sold − salaries (earned + bonus) − shop expenses. Refunded sales are excluded. * = attendance not marked that month, full salary assumed. Click a month for details.</p>

      {detail && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-black text-slate-900">{MONTHS[detail.row.month - 1]} {year} — details</p>
            <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
          </div>
          {detail.loading ? <Spinner /> : (
            <div className="grid md:grid-cols-3 gap-5 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Top products by profit</p>
                {detail.top.length === 0 ? <p className="text-slate-400">No sales.</p> : detail.top.map((p) => (
                  <div key={p.name} className="flex justify-between py-1 border-b border-slate-50"><span className="truncate pr-2">{p.name} <span className="text-slate-400">×{p.units}</span></span><b className={p.profit >= 0 ? 'text-green-600' : 'text-red-600'}>{money(p.profit)}</b></div>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Money came in by</p>
                {Object.entries(detail.payMix).map(([k, v]) => <div key={k} className="flex justify-between py-1 border-b border-slate-50"><span>{k}</span><b>Rs. {n0(v)}</b></div>)}
                {!Object.keys(detail.payMix).length && <p className="text-slate-400">—</p>}
                <p className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">Supplier</p>
                <div className="flex justify-between py-1"><span>Stock bought</span><b>Rs. {n0(detail.row.supplierPurchases)}</b></div>
                <div className="flex justify-between py-1"><span>Paid to suppliers</span><b>Rs. {n0(detail.row.supplierPaid)}</b></div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Expenses</p>
                {detail.expenses.length === 0 ? <p className="text-slate-400">None recorded.</p> : detail.expenses.map((e) => (
                  <div key={e._id} className="flex justify-between py-1 border-b border-slate-50"><span>{e.category}<span className="text-slate-400 text-xs"> {e.note && `· ${e.note}`}</span></span><b>Rs. {n0(e.amount)}</b></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Forecast ──────────────────────────────────────────────────────────────
  const fc = !forecast ? <Spinner /> : (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${forecast.confidence === 'Good' ? 'bg-green-100 text-green-700' : forecast.confidence === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>Confidence: {forecast.confidence}</span>
        <span className="text-xs text-slate-500">Based on the last {forecast.basedOnMonths} full month(s) of your data</span>
      </div>

      {forecast.forecast.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          Not enough history yet. Predictions start after <b>2 full months</b> of sales — keep recording sales, expenses and attendance.
        </div>
      ) : (
        <>
          {forecast.thisMonth && (
            <div className={`rounded-xl p-5 text-white ${t.grad}`}>
              <p className="text-white/80 text-xs font-bold uppercase">{forecast.thisMonth.label} — projected finish (day {forecast.thisMonth.daysElapsed} of {forecast.thisMonth.daysInMonth})</p>
              <div className="flex flex-wrap gap-8 mt-2">
                <div><p className="text-white/70 text-xs">Sales so far</p><p className="text-2xl font-black">Rs. {n0(forecast.thisMonth.revenueSoFar)}</p></div>
                <div><p className="text-white/70 text-xs">Expected revenue</p><p className="text-2xl font-black">Rs. {n0(forecast.thisMonth.projectedRevenue)}</p></div>
                <div><p className="text-white/70 text-xs">Expected net {forecast.thisMonth.status.toLowerCase()}</p><p className="text-2xl font-black">{money(forecast.thisMonth.projectedNetProfit)}</p></div>
              </div>
              <p className="text-white/70 text-[11px] mt-2">Early in the month this swings a lot — it gets more reliable as the month goes on.</p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-3">
            {forecast.forecast.map((f) => (
              <div key={f.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between"><p className="font-black text-slate-900">{f.label}</p><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${BADGE[f.status]}`}>Expected {f.status}</span></div>
                <p className="text-xs text-slate-500 mt-3">Revenue</p>
                <p className="text-xl font-black">Rs. {n0(f.revenue)}</p>
                <p className="text-[11px] text-slate-400">likely between {short(f.revenueLow)} and {short(f.revenueHigh)}</p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div><p className="text-slate-400">Gross</p><b>{short(f.grossProfit)}</b></div>
                  <div><p className="text-slate-400">Salaries</p><b>{short(f.salaries)}</b></div>
                  <div><p className="text-slate-400">Expenses</p><b>{short(f.expenses)}</b></div>
                </div>
                <p className="text-xs text-slate-500 mt-3">Net {f.netProfit >= 0 ? 'profit' : 'loss'}</p>
                <p className={`text-xl font-black ${f.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{money(f.netProfit)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="font-black text-slate-900 mb-2">History and forecast <span className="text-xs font-normal text-slate-400">(faded bars = prediction)</span></p>
            <Chart data={[
              ...forecast.history.map((h) => ({ label: h.label, revenue: h.revenue, net: h.netProfit })),
              ...forecast.forecast.map((f) => ({ label: f.label.slice(0, 3), revenue: f.revenue, net: f.netProfit, forecast: true })),
            ]} />
          </div>
          <p className="text-xs text-slate-400">How it's calculated: recent months count more, with a gently damped trend; profit uses your recent gross margin, average expenses and salaries. It cannot know about Eid/seasonal spikes, sales or price changes, so treat it as a guide, not a promise.</p>
        </>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div><p className="font-black text-slate-900">Restock suggestions</p><p className="text-xs text-slate-500">Items that will run out within 3 weeks at the last 30 days' selling speed</p></div>
          {forecast.reorder.length > 0 && (
            <button onClick={() => navigate(t.routes.suppliers, { state: { prefillItems: forecast.reorder.map((r) => ({ ...r, costPrice: r.estCost && r.suggestedQty ? Math.round(r.estCost / r.suggestedQty) : '' })) } })} className={`px-3 py-2 rounded-lg text-xs font-bold ${t.btn}`}>Create purchase order</button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className={`${th} text-left`}>Product</th><th className={th}>In stock</th><th className={th}>Sold (30d)</th><th className={th}>Days left</th><th className={th}>Suggested qty</th><th className={th}>Est. cost</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {forecast.reorder.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-slate-400">Nothing urgent. Stock levels look fine.</td></tr>}
            {forecast.reorder.map((r) => (
              <tr key={r.productId}>
                <td className="px-3 py-3 font-semibold">{r.name}</td>
                <td className="px-3 py-3 text-right">{r.stock}</td>
                <td className="px-3 py-3 text-right">{r.sold30}</td>
                <td className={`px-3 py-3 text-right font-bold ${r.daysLeft <= 7 ? 'text-red-600' : 'text-amber-600'}`}>{r.daysLeft}</td>
                <td className="px-3 py-3 text-right font-bold">{r.suggestedQty}</td>
                <td className="px-3 py-3 text-right">Rs. {n0(r.estCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Expenses ──────────────────────────────────────────────────────────────
  const exp = (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p className="font-black text-slate-900 mb-1">Add expense</p>
        <p className="text-xs text-slate-500 mb-3">Rent, electricity, tea, repairs… (salaries and stock purchases are tracked separately)</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <label className="text-xs font-bold text-slate-600">Category
            <select className={`${fld} ${t.ring}`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <label className="text-xs font-bold text-slate-600">Amount (Rs.)<input type="number" min="1" className={`${fld} ${t.ring}`} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          <label className="text-xs font-bold text-slate-600">Date<input type="date" className={`${fld} ${t.ring}`} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className="text-xs font-bold text-slate-600">Note<input className={`${fld} ${t.ring}`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <button onClick={addExpense} className={`py-2.5 rounded-xl text-sm font-bold ${t.btn}`}>Add</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={expMonth} onChange={(e) => setExpMonth(Number(e.target.value))} className={selCls}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        <select value={expYear} onChange={(e) => setExpYear(Number(e.target.value))} className={selCls}>{years.map((y) => <option key={y}>{y}</option>)}</select>
        {expenses && <span className="ml-2 text-sm font-black text-slate-800">Total: Rs. {n0(expenses.total)}</span>}
      </div>
      {!expenses ? <Spinner /> : (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {expenses.items.length === 0 ? <p className="p-8 text-center text-slate-400 text-sm">No expenses in this month.</p> : expenses.items.map((e) => (
              <div key={e._id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                <span className="w-24 text-xs text-slate-500">{fmtDate(e.date)}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${t.chip}`}>{e.category}</span>
                <span className="flex-1 text-xs text-slate-400 truncate">{e.note}</span>
                <b>Rs. {n0(e.amount)}</b>
                <button onClick={() => removeExpense(e)} className="text-red-500 font-bold px-1">×</button>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">By category</p>
            {Object.keys(expenses.byCategory).length === 0 ? <p className="text-slate-400 text-sm">—</p> : Object.entries(expenses.byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="mb-2">
                <div className="flex justify-between text-sm"><span>{k}</span><b>Rs. {n0(v)}</b></div>
                <div className="h-1.5 bg-slate-100 rounded mt-1"><div className="h-1.5 rounded" style={{ width: `${(v / expenses.total) * 100}%`, background: t.hex }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Profit & Loss</h1>
          <p className="text-sm text-slate-500">Month-by-month profit, loss, expenses and what to expect next</p>
        </div>
        {tab === 'pnl' && <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selCls}>{years.map((y) => <option key={y}>{y}</option>)}</select>}
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
      <div className="flex gap-6 border-b border-slate-200">
        {[['pnl', 'Monthly P&L'], ['forecast', 'Forecast & Restock'], ['expenses', 'Expenses']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`pb-3 text-sm font-bold border-b-2 -mb-px ${tab === k ? t.tabOn : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
      </div>
      {tab === 'pnl' && pnl}
      {tab === 'forecast' && fc}
      {tab === 'expenses' && exp}
    </div>
  );
}

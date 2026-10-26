import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeApi } from '../services/financeApi';
import { supplierApi } from '../services/miscApi';
import { themeOf } from '../utils/theme';
import { n0 } from '../utils/format';

// Compact "money this month" strip shown on both dashboards.
export default function FinanceStrip({ vertical }) {
  const t = themeOf(vertical);
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [dues, setDues] = useState(null);

  useEffect(() => {
    const now = new Date();
    financeApi.monthly(now.getFullYear()).then(({ data }) => setRow(data.months[now.getMonth()])).catch(() => {});
    supplierApi.getOverview().then(({ data }) => setDues(data.totalPending)).catch(() => {});
  }, []);

  if (!row) return null;
  const net = row.netProfit;
  const Card = ({ label, value, tone = 'text-slate-900', sub }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-black mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-black text-slate-800">This month's money <span className="text-xs font-normal text-slate-400">(so far)</span></p>
        <button onClick={() => navigate(t.routes.finance)} className={`text-xs font-bold ${t.text}`}>Full profit & loss →</button>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Card label="Revenue" value={`Rs. ${n0(row.revenue)}`} sub={`${row.orders} orders`} />
        <Card label="Gross profit" value={`Rs. ${n0(row.grossProfit)}`} sub={row.revenue ? `${row.grossMargin}% margin` : ''} />
        <Card label={net >= 0 ? 'Net profit' : 'Net loss'} value={`${net < 0 ? '− ' : ''}Rs. ${n0(Math.abs(net))}`} tone={net >= 0 ? 'text-green-600' : 'text-red-600'} sub="after salaries & expenses" />
        <Card label="Supplier dues" value={`Rs. ${n0(dues || 0)}`} tone={dues > 0 ? 'text-red-600' : 'text-green-600'} sub="still to pay suppliers" />
      </div>
    </div>
  );
}

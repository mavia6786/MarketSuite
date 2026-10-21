import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Route guard for the UI. Hides pages a role cannot use; the API still enforces every permission server-side.
export default function RequirePermission({ perm, children }) {
  const { can } = useAuth();
  if (can(perm)) return children;
  return (
    <div className="p-10 text-center">
      <p className="text-5xl mb-3">🔒</p>
      <h2 className="text-xl font-black text-slate-800">You don't have access to this page</h2>
      <p className="text-slate-500 mt-1 text-sm">Your role does not include this permission. Ask the shop owner if you need it.</p>
      <Link to="/login" className="inline-block mt-5 text-sm font-bold text-indigo-600 underline">Back</Link>
    </div>
  );
}

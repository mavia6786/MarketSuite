import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { isAuthenticated, currentShop, currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Land on the first page this role may use (a Cashier has no dashboard, so goes straight to the POS).
  const getRoute = (user = currentUser, shop = currentShop) => {
    const clothes = shop?.type === 'Clothes';
    if (user?.mustChangePassword) return '/change-password';
    const perms = user?.permissions || [];
    if (perms.includes('reports.view')) return clothes ? '/dashboard/clothes' : '/dashboard';
    if (perms.includes('sales.create')) return clothes ? '/clothes/pos' : '/dashboard/pos';
    if (perms.includes('products.view')) return clothes ? '/clothes/products' : '/dashboard/products';
    return clothes ? '/dashboard/clothes' : '/dashboard';
  };

  useEffect(() => {
    if (isAuthenticated) navigate(getRoute());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (result.success) {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const sh = JSON.parse(localStorage.getItem('shop') || 'null');
      navigate(getRoute(u, sh));
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-900 flex overflow-hidden relative">
      {/* Left ambient panel (decorative) */}
      <div
        className="hidden lg:flex w-1/2 relative items-center justify-center p-16 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0f0f16,#111118)' }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.12),transparent 70%)' }}
          ></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.08),transparent 70%)' }}
          ></div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(245,158,11,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.04) 1px,transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          ></div>
        </div>
        <div className="relative text-center">
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-8 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 0 60px rgba(245,158,11,0.3)' }}
          >
            <span className="font-display font-black text-obsidian-900 text-2xl">M</span>
          </div>
          <h2 className="font-display text-4xl font-black text-white mb-4">MarketSuite</h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
            The premium platform for modern retail businesses. Manage everything from a single dashboard.
          </p>

          <div className="mt-12 space-y-3">
            {['🧾 Instant POS & Invoicing', '📦 Smart Inventory Alerts', '📊 Real-time Analytics'].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-left glass-card rounded-xl px-4 py-3 text-sm text-slate-400">
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-md fade-up">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-yellow-400 mb-10 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>

          <div className="mb-10">
            <p className="text-xs tracking-[0.2em] text-yellow-500/70 uppercase font-semibold mb-3">Welcome Back</p>
            <h1 className="font-display text-5xl font-black text-white leading-tight">Sign In</h1>
          </div>

          {errorMessage && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>
              {errorMessage}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Email Address</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="admin@stepup.pk"
                  className="lux-input w-full pl-10 pr-4 py-3.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Password</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="lux-input w-full pl-10 pr-4 py-3.5 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>

            <div
              className="px-4 py-3 rounded-xl text-xs text-slate-600 font-mono flex flex-col gap-2"
              style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 font-semibold">👟 Shoe Store Demo:</span> admin@stepup.pk / Admin@123
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 font-semibold">👗 Cloth Store Demo:</span> admin@styleub.pk / Admin@123
              </div>
            </div>

            <button onClick={handleLogin} disabled={isLoading} className="btn-gold w-full py-4 text-sm tracking-wide">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing In...
                </span>
              ) : (
                <span>Sign In to Dashboard →</span>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-slate-600 mt-8">
            No account?
            <button onClick={() => navigate('/signup')} className="text-yellow-500 font-semibold hover:text-yellow-400 ml-1 transition-colors">
              Create one free
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PERKS = [
  ['✦', 'No credit card required', 'Free to start'],
  ['✦', 'Setup in 2 minutes', 'Quick onboarding'],
  ['✦', 'Full feature access', 'Nothing locked'],
];

export default function SignUpPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignUp = async () => {
    setErrorMessage('');
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    const result = await register(fullName, email, password, phone);
    setIsLoading(false);
    if (result.success) navigate('/register-shop');
    else setErrorMessage(result.message || 'Registration failed. Please try again.');
  };

  return (
    <div className="min-h-screen bg-obsidian-900 flex overflow-hidden relative">
      {/* Left panel */}
      <div className="hidden lg:flex w-5/12 relative flex-col justify-between p-14 overflow-hidden" style={{ background: 'linear-gradient(160deg,#0f0f16,#111118)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle,rgba(245,158,11,0.08),transparent 70%)' }}></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.06),transparent 70%)' }}></div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(245,158,11,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.03) 1px,transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          ></div>
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              <span className="font-display font-black text-obsidian-900 text-sm">M</span>
            </div>
            <span className="font-display text-lg font-bold text-white">MarketSuite</span>
          </div>
          <h2 className="font-display text-5xl font-black text-white mb-5 leading-tight">
            Start Your
            <br />
            <span className="gold-text">Journey</span>
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
            Join retailers who use MarketSuite to streamline their operations and boost revenue.
          </p>
        </div>
        <div className="relative space-y-3">
          {PERKS.map(([icon, title, sub]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-yellow-500 text-xs mt-0.5 font-bold">{icon}</span>
              <div>
                <p className="text-white text-xs font-semibold">{title}</p>
                <p className="text-slate-600 text-xs">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md fade-up">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-yellow-400 mb-10 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>

          <div className="mb-8">
            <p className="text-xs tracking-[0.2em] text-yellow-500/70 uppercase font-semibold mb-3">New Account</p>
            <h1 className="font-display text-5xl font-black text-white">Create Account</h1>
          </div>

          {errorMessage && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>
              {errorMessage}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Ahmed Khan" className="lux-input w-full px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="03XX-XXXXXXX" className="lux-input w-full px-4 py-3 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Email Address</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="lux-input w-full px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Min. 6 characters" className="lux-input w-full px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">Confirm Password</label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="Re-enter password"
                className="lux-input w-full px-4 py-3 text-sm"
              />
            </div>

            <button onClick={handleSignUp} disabled={isLoading} className="btn-gold w-full py-4 text-sm tracking-wide mt-2">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                <span>Create Account & Continue →</span>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-slate-600 mt-7">
            Already have an account?
            <button onClick={() => navigate('/login')} className="text-yellow-500 font-semibold hover:text-yellow-400 ml-1 transition-colors">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

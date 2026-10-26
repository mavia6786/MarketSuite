import { Link } from 'react-router-dom';

// Port of the <NotFound> block in Routes.razor
export default function NotFound() {
  return (
    <div className="bg-obsidian-900 min-h-screen font-sans">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-black text-rose-600 mb-4">404</h1>
          <p className="text-slate-500 mb-6">Sorry, this page doesn't exist.</p>
          <Link to="/" className="px-6 py-3 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-xl font-bold">Go Home</Link>
        </div>
      </div>
    </div>
  );
}

import { Outlet } from 'react-router-dom';

// Port of Components/Layout/MainLayout.razor
export default function MainLayout() {
  return (
    <div className="bg-obsidian-900 min-h-screen font-sans">
      <Outlet />
    </div>
  );
}

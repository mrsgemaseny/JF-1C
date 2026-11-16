import { Outlet } from 'react-router-dom';

export function MainLayout() {
  return (
    <div className="min-h-screen bg-brand-beige text-brand-green font-sans flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}

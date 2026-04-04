import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main key={location.pathname} className="flex-1 overflow-auto animate-in fade-in duration-200">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
}

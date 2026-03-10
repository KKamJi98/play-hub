import { Outlet } from "react-router";
import Header from "../components/layout/Header";

export default function MainLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

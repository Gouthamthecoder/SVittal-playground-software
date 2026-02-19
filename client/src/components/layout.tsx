import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Users, BarChart3, LogOut, Ticket } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout } = useStore();

  const isNavActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 text-primary">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Ticket size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">PlayTracker</h1>
        </div>
        
        <nav className="flex gap-2 bg-secondary p-1 rounded-xl">
          <Link href="/">
            <a className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold ${isNavActive('/') ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <Users size={20} /> Dashboard
            </a>
          </Link>
          <Link href="/metrics">
            <a className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold ${isNavActive('/metrics') ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <BarChart3 size={20} /> Metrics
            </a>
          </Link>
        </nav>

        <button
          onClick={() => {
            logout();
            setLocation("/login");
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all font-bold"
        >
          <LogOut size={20} /> Logout
        </button>
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
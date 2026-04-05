import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Users, BarChart3, LogOut, Ticket, UserCog, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout, user, isAdmin } = useStore();

  const isNavActive = (path: string) => location === path;

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

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
          {isAdmin && (
            <>
              <Link href="/metrics">
                <a className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold ${isNavActive('/metrics') ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  <BarChart3 size={20} /> Metrics
                </a>
              </Link>
              <Link href="/users">
                <a className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold ${isNavActive('/users') ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  <UserCog size={20} /> Users
                </a>
              </Link>
            </>
          )}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all font-bold"
              data-testid="button-user-menu"
            >
              <div className="flex flex-col items-end leading-tight mr-1">
                <span className="text-sm font-bold text-foreground">{user?.username}</span>
                <span className={`text-xs font-bold uppercase tracking-wide ${isAdmin ? "text-primary" : "text-muted-foreground"}`}>
                  {user?.role}
                </span>
              </div>
              <ChevronDown size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl p-2">
            <div className="px-2 py-1 text-xs text-muted-foreground font-medium">
              Signed in as <span className="font-bold text-foreground">{user?.username}</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="rounded-lg cursor-pointer font-bold text-destructive focus:text-destructive focus:bg-destructive/10 gap-2"
              data-testid="button-logout"
            >
              <LogOut size={16} /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

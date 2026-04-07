import { Link, useLocation } from "wouter";
import { useStore, ShopInfo } from "@/lib/store";
import { useState, useEffect } from "react";
import { Users, BarChart3, LogOut, Ticket, UserCog, ChevronDown, Store, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout, user, isAdmin, currentShop, switchShop } = useStore();
  const { toast } = useToast();

  const [shopList, setShopList] = useState<ShopInfo[]>([]);
  const isNavActive = (path: string) => location === path;

  // Load shops for the switcher (admin gets all shops, staff gets their assigned shops)
  useEffect(() => {
    if (!user) return;
    const endpoint = isAdmin ? "/api/shops" : `/api/users/${user.id}/shops`;
    fetch(endpoint)
      .then(r => r.ok ? r.json() : [])
      .then(data => setShopList(data))
      .catch(() => {});
  }, [user, isAdmin]);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const handleSwitchShop = async (shop: ShopInfo) => {
    try {
      await switchShop(shop);
      toast({ title: "Shop switched", description: `Now viewing ${shop.name}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const switchableShops = shopList.filter(s => s.id !== currentShop?.id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3 text-primary">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Ticket size={28} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight leading-none">PlayTracker</h1>
            {currentShop && (
              <p className="text-xs text-muted-foreground font-semibold leading-none mt-0.5">{currentShop.name}</p>
            )}
          </div>
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

        <div className="flex items-center gap-2">
          {/* Shop switcher */}
          {switchableShops.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all font-bold text-sm"
                  data-testid="button-shop-switcher"
                >
                  <Store size={16} />
                  <span className="hidden md:inline max-w-[120px] truncate">{currentShop?.name}</span>
                  <ChevronDown size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl p-2">
                <div className="px-2 py-1 text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
                  Switch Shop
                </div>
                {shopList.map(shop => (
                  <DropdownMenuItem
                    key={shop.id}
                    onClick={() => shop.id !== currentShop?.id && handleSwitchShop(shop)}
                    className={`rounded-lg cursor-pointer font-medium py-2 gap-2 ${shop.id === currentShop?.id ? "opacity-60" : ""}`}
                    data-testid={`button-switch-shop-${shop.id}`}
                  >
                    <Store size={15} />
                    <span className="flex-1 truncate">{shop.name}</span>
                    {shop.id === currentShop?.id && <Check size={14} className="text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User menu */}
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
              {currentShop && (
                <div className="px-2 py-0.5 text-xs text-muted-foreground">
                  Shop: <span className="font-semibold text-foreground">{currentShop.name}</span>
                </div>
              )}
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
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

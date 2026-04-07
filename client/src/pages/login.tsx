import { useState } from "react";
import { useLocation } from "wouter";
import { useStore, ShopInfo } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, Eye, EyeOff, Store, ArrowLeft, Check } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { prelogin, login } = useStore();

  const [step, setStep] = useState<"credentials" | "shop">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [availableShops, setAvailableShops] = useState<ShopInfo[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const shops = await prelogin(username.trim(), password);
      if (shops.length === 0) {
        setError("Your account has no shop assigned. Please contact an admin.");
        return;
      }
      setAvailableShops(shops);
      if (shops.length === 1) {
        setSelectedShopId(shops[0].id);
      }
      setStep("shop");
    } catch (err: any) {
      setError(err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId) {
      setError("Please select a shop to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password, selectedShopId);
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Login failed.");
      setStep("credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-primary/10 p-4 rounded-2xl mb-4 text-primary">
            <Ticket size={48} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">PlayTracker</h1>
          <p className="text-muted-foreground text-lg">Staff Portal Login</p>
        </div>

        <Card className="border-border shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-card pb-4 border-b border-border/50">
            <CardTitle className="text-2xl font-bold text-center">
              {step === "credentials" ? "Welcome Back" : "Select Shop"}
            </CardTitle>
            <CardDescription className="text-center text-base">
              {step === "credentials"
                ? "Enter your credentials to continue."
                : `Signed in as ${username}. Choose which shop to work in.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8 px-6 pb-8 bg-card">
            {/* ── Step 1: Credentials ── */}
            {step === "credentials" && (
              <form onSubmit={handleCredentials} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-base font-bold">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    className={`h-12 text-base rounded-xl border-2 ${error ? "border-destructive" : "border-input"}`}
                    placeholder="Enter your username"
                    autoComplete="username"
                    data-testid="input-username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-bold">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      className={`h-12 text-base rounded-xl border-2 pr-12 ${error ? "border-destructive" : "border-input"}`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-destructive font-bold text-sm animate-in slide-in-from-top-1" data-testid="text-login-error">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 mt-2"
                  data-testid="button-next"
                  disabled={loading}
                >
                  {loading ? "Checking..." : "Next →"}
                </Button>
              </form>
            )}

            {/* ── Step 2: Shop selection ── */}
            {step === "shop" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-3">
                  {availableShops.map(shop => (
                    <button
                      key={shop.id}
                      type="button"
                      onClick={() => { setSelectedShopId(shop.id); setError(""); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        selectedShopId === shop.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-secondary/50"
                      }`}
                      data-testid={`button-select-shop-${shop.id}`}
                    >
                      <div className={`p-2 rounded-xl ${selectedShopId === shop.id ? "bg-primary/10" : "bg-secondary"}`}>
                        <Store size={20} className={selectedShopId === shop.id ? "text-primary" : "text-muted-foreground"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-foreground truncate">{shop.name}</p>
                        {shop.code && (
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{shop.code}</p>
                        )}
                      </div>
                      {selectedShopId === shop.id && (
                        <Check size={20} className="text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="text-destructive font-bold text-sm animate-in slide-in-from-top-1" data-testid="text-login-error">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-xl font-bold"
                    onClick={() => { setStep("credentials"); setError(""); setSelectedShopId(null); }}
                    data-testid="button-back"
                  >
                    <ArrowLeft size={16} className="mr-1" /> Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 text-base font-bold rounded-xl bg-primary hover:bg-primary/90"
                    data-testid="button-login"
                    disabled={loading || !selectedShopId}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

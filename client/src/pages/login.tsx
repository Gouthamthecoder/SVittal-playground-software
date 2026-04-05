import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Invalid username or password.");
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
            <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center text-base">Sign in to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-6 pb-8 bg-card">
            <form onSubmit={handleLogin} className="space-y-5">
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
                {error && (
                  <p className="text-destructive font-bold text-sm animate-in slide-in-from-top-1" data-testid="text-login-error">
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 mt-2"
                data-testid="button-login"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") {
      login();
      setLocation("/");
    } else {
      setError(true);
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
            <CardDescription className="text-center text-base">Enter your 4-digit staff PIN to continue.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-6 pb-8 bg-card">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="pin" className="text-base font-bold">Staff PIN (Use 1234)</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError(false);
                  }}
                  className={`text-center text-3xl tracking-widest h-16 rounded-xl border-2 ${error ? "border-destructive focus-visible:ring-destructive" : "border-input"}`}
                  placeholder="••••"
                  maxLength={4}
                  data-testid="input-pin"
                />
                {error && <p className="text-destructive font-bold text-sm text-center animate-in slide-in-from-top-1">Invalid PIN. Please try again.</p>}
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90"
                data-testid="button-login"
              >
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
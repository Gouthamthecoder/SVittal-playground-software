import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider, useStore } from "./lib/store";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Metrics from "@/pages/metrics";
import Login from "@/pages/login";
import UserManagement from "@/pages/users";
import Billing from "@/pages/billing";
import Plans from "@/pages/plans";
import Reports from "@/pages/reports";
import Layout from "@/components/layout";
import { useEffect } from "react";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any; adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin, authLoading } = useStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (adminOnly && !isAdmin) {
      setLocation("/");
    }
  }, [isAuthenticated, isAdmin, authLoading, adminOnly, setLocation]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground font-bold text-lg">
      Loading...
    </div>
  );

  if (!isAuthenticated) return null;
  if (adminOnly && !isAdmin) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute component={Billing} />
      </Route>
      <Route path="/plans">
        <ProtectedRoute component={Plans} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/metrics">
        <ProtectedRoute component={Metrics} adminOnly />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} adminOnly />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={UserManagement} adminOnly />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <Toaster />
          <Router />
        </StoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

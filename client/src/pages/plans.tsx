import { FormEvent, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, Clock3, Plus, Trash2, WalletCards, Send, IndianRupee } from "lucide-react";

interface Customer { id: number; name: string; phone: string }
interface Plan { id: number; name: string; description: string | null; totalHours: number; price: number | null; durationDays: number | null; active: boolean }
interface CustomerPlan { id: number; purchasedHours: number; remainingHours: number; status: string; customer: Customer; plan: Plan; endDate: string | null }
interface PaymentReceipt { amount: number; paymentMethod: "cash" | "card" | "upi"; paidAt: string; customer: Customer; plan: Plan; customerPlanId: number; endDate?: string | null }

export default function Plans() {
  const { isAdmin } = useStore();
  const { toast } = useToast();
  const [location] = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [customerPlans, setCustomerPlans] = useState<CustomerPlan[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [planId, setPlanId] = useState("");
  const [purchaseMethod, setPurchaseMethod] = useState<"cash" | "card" | "upi">("cash");
  const [newPlan, setNewPlan] = useState({ name: "", description: "", totalHours: "", price: "", durationDays: "" });
  const [payment, setPayment] = useState({ customerPlanId: "", amount: "", paymentMethod: "cash" as "cash" | "card" | "upi" });
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [planRes, balanceRes] = await Promise.all([fetch("/api/plans"), fetch("/api/customer-plans")]);
      if (!planRes.ok || !balanceRes.ok) throw new Error("Could not load plans and balances");
      setPlans(await planRes.json()); setCustomerPlans(await balanceRes.json());
    } catch (error: any) { toast({ title: "Unable to load plans", description: error.message, variant: "destructive" }); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const requestedCustomerId = new URLSearchParams(location.split("?")[1] || "").get("customerId");
    if (!requestedCustomerId) return;
    fetch(`/api/customers/${requestedCustomerId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Customer not found");
        return data as Customer;
      })
      .then((customer) => {
        setCustomers([customer]);
        setCustomerId(String(customer.id));
        setPhoneSearch(customer.phone);
      })
      .catch((error) => toast({ title: "Customer details unavailable", description: error.message, variant: "destructive" }));
  }, [location]);

  const searchCustomers = async (event: FormEvent) => {
    event.preventDefault();
    if (!phoneSearch.trim()) {
      setCustomers([]);
      return;
    }
    setSearchingCustomers(true);
    try {
      const res = await fetch(`/api/customers?phone=${encodeURIComponent(phoneSearch.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not search customers");
      setCustomers(data);
      if (data.length === 0) toast({ title: "No customers found", description: "Try another phone number." });
    } catch (error: any) { toast({ title: "Customer search failed", description: error.message, variant: "destructive" }); }
    finally { setSearchingCustomers(false); }
  };

  const createPlan = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const res = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: newPlan.name, description: newPlan.description || null, totalHours: Number(newPlan.totalHours), price: Number(newPlan.price), durationDays: newPlan.durationDays ? Number(newPlan.durationDays) : null,
      }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message || "Could not create plan");
      setNewPlan({ name: "", description: "", totalHours: "", price: "", durationDays: "" }); toast({ title: "Plan added" }); load();
    } catch (error: any) { toast({ title: "Could not add plan", description: error.message, variant: "destructive" }); } finally { setBusy(false); }
  };

  const assign = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const res = await fetch("/api/customer-plans/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: Number(customerId), planId: Number(planId), paymentMethod: purchaseMethod }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message || "Could not complete plan purchase");
      setReceipt({ ...data.payment, endDate: data.customerPlan.endDate });
      setCustomerId(""); setPlanId(""); setCustomers([]); setPhoneSearch(""); toast({ title: "Plan activated", description: "Payment was recorded and the plan is ready to use." }); load();
    } catch (error: any) { toast({ title: "Could not activate plan", description: error.message, variant: "destructive" }); } finally { setBusy(false); }
  };

  const useHours = async (customerPlan: CustomerPlan) => {
    const value = prompt(`How many hours should be deducted from ${customerPlan.customer.name}'s balance?`);
    if (!value) return;
    const hoursUsed = Number(value);
    if (!Number.isFinite(hoursUsed) || hoursUsed <= 0) return toast({ title: "Enter a positive number of hours", variant: "destructive" });
    const note = prompt("Optional usage note (for example: play session)") || null;
    const res = await fetch(`/api/customer-plans/${customerPlan.id}/usage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hoursUsed, note }) });
    const data = await res.json();
    if (!res.ok) return toast({ title: "Could not record usage", description: data.message, variant: "destructive" });
    toast({ title: "Play time deducted", description: `${hoursUsed} hour(s) removed from the balance.` }); load();
  };

  const upgrade = async (customerPlan: CustomerPlan) => {
    const choices = plans.filter((plan) => plan.active && plan.id !== customerPlan.plan.id);
    if (choices.length === 0) return toast({ title: "Add another active plan first", variant: "destructive" });
    const value = prompt(`Upgrade ${customerPlan.customer.name}. Enter a plan ID:\n${choices.map((plan) => `${plan.id}: ${plan.name} (${plan.totalHours} hours)`).join("\n")}`);
    if (!value) return;
    const res = await fetch(`/api/customer-plans/${customerPlan.id}/upgrade`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: Number(value) }) });
    const data = await res.json();
    if (!res.ok) return toast({ title: "Could not upgrade plan", description: data.message, variant: "destructive" });
    toast({ title: "Plan upgraded", description: "Unused hours were carried into the new plan balance." }); load();
  };

  const deletePlan = async (id: number) => {
    if (!confirm("Delete this plan? Plans already assigned to customers cannot be deleted.")) return;
    const res = await fetch(`/api/plans/${id}`, { method: "DELETE" }); const data = await res.json();
    if (!res.ok) return toast({ title: "Could not delete plan", description: data.message, variant: "destructive" });
    toast({ title: "Plan deleted" }); load();
  };

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const res = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        customerPlanId: Number(payment.customerPlanId), amount: Number(payment.amount), paymentMethod: payment.paymentMethod,
      }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.message || "Could not save payment");
      setReceipt(data); setPayment({ customerPlanId: "", amount: "", paymentMethod: "cash" });
      toast({ title: "Payment saved", description: "Collection details have been recorded." });
    } catch (error: any) { toast({ title: "Could not save payment", description: error.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const sendWhatsApp = () => {
    if (!receipt) return;
    const rawPhone = receipt.customer.phone.replace(/\D/g, "");
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    if (!phone) return toast({ title: "Phone number missing", variant: "destructive" });
    const planRecord = customerPlans.find((item) => item.id === receipt.customerPlanId);
    const validityDate = receipt.endDate ?? planRecord?.endDate;
    const validity = validityDate ? new Date(validityDate).toLocaleDateString() : "No expiry";
    const message = `Hello ${receipt.customer.name},\n\nYour ${receipt.plan.name} plan is confirmed.\nPlan validity: ${validity}\nPayment made: Rs ${receipt.amount.toFixed(2)} via ${receipt.paymentMethod.toUpperCase()}\n\nThank you!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const activeBalances = customerPlans.filter((item) => item.status === "active");
  return <div className="space-y-8">
    <div><p className="text-sm font-bold uppercase tracking-widest text-primary">Step 2</p><h2 className="text-3xl font-extrabold tracking-tight">Plans & Play Balance</h2><p className="mt-1 text-muted-foreground">Assign a plan, record each visit, and upgrade without losing unused play time.</p></div>
    <div className="grid gap-8 xl:grid-cols-3">
      <Card className="xl:col-span-2 border-none shadow-sm rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="text-primary" /> Select plan and complete payment</CardTitle></CardHeader><CardContent>
        <form onSubmit={searchCustomers} className="mb-4 flex gap-2"><Input value={phoneSearch} onChange={(e) => setPhoneSearch(e.target.value)} placeholder="Search customer by phone number" inputMode="tel" /><Button type="submit" variant="outline" disabled={searchingCustomers}>{searchingCustomers ? "Searching..." : "Search"}</Button></form>
        <form onSubmit={assign} className="grid gap-4 md:grid-cols-2"><select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>#{String(customer.id).padStart(6, "0")} · {customer.name} · {customer.phone}</option>)}</select><select required value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select paid plan</option>{plans.filter((plan) => plan.active && plan.price !== null && plan.price > 0).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.totalHours} hours · Rs {(plan.price ?? 0).toFixed(2)}</option>)}</select>{planId && <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-bold text-primary">Payment amount: Rs {(plans.find((plan) => String(plan.id) === planId)?.price ?? 0).toFixed(2)}</p>}<select required value={purchaseMethod} onChange={(e) => setPurchaseMethod(e.target.value as "cash" | "card" | "upi")} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option></select><Button disabled={busy || !planId} className="rounded-xl">{busy ? "Processing..." : "Submit payment and activate plan"}</Button></form>
        {receipt && <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="font-bold text-primary">Payment completed and plan activated</p><p className="mt-1 text-sm text-muted-foreground">{receipt.customer.name} · {receipt.plan.name} · Rs {receipt.amount.toFixed(2)} paid via {receipt.paymentMethod.toUpperCase()}</p><Button type="button" className="mt-3 rounded-xl" onClick={sendWhatsApp} data-testid="button-send-whatsapp-receipt"><Send size={16} /> Send plan receipt on WhatsApp</Button></div>}
      </CardContent></Card>
      {isAdmin && <Card className="border-none shadow-sm rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="text-primary" /> Add plan</CardTitle></CardHeader><CardContent><form onSubmit={createPlan} className="space-y-3"><Input required value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="Plan name" /><Input required type="number" min="0.25" step="0.25" value={newPlan.totalHours} onChange={(e) => setNewPlan({ ...newPlan, totalHours: e.target.value })} placeholder="Total play hours" /><Input required type="number" min="0.01" step="0.01" value={newPlan.price} onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })} placeholder="Plan price" /><Input type="number" min="1" value={newPlan.durationDays} onChange={(e) => setNewPlan({ ...newPlan, durationDays: e.target.value })} placeholder="Validity in days (optional)" /><Textarea value={newPlan.description} onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })} placeholder="Description (optional)" /><Button disabled={busy} type="submit" className="w-full rounded-xl">Create plan</Button></form></CardContent></Card>}
    </div>
    <Card className="border-none shadow-sm rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><IndianRupee className="text-primary" /> Record additional payment</CardTitle></CardHeader><CardContent>
      <form onSubmit={submitPayment} className="grid gap-4 md:grid-cols-4"><select required value={payment.customerPlanId} onChange={(e) => setPayment({ ...payment, customerPlanId: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-2"><option value="">Select customer plan</option>{activeBalances.map((item) => <option key={item.id} value={item.id}>#{String(item.customer.id).padStart(6, "0")} · {item.customer.name} · {item.plan.name}</option>)}</select><Input required type="number" min="0.01" step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} placeholder="Amount collected" /><select value={payment.paymentMethod} onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value as "cash" | "card" | "upi" })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option></select><Button type="submit" disabled={busy} className="rounded-xl md:col-span-4">Submit payment</Button></form>
    </CardContent></Card>
    <Card className="border-none shadow-sm rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="text-primary" /> Current customer balances</CardTitle></CardHeader><CardContent className="p-0">
      {activeBalances.length === 0 ? <p className="p-6 text-muted-foreground">No plans assigned yet.</p> : <div className="divide-y">{activeBalances.map((item) => <div key={item.id} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold">#{String(item.customer.id).padStart(6, "0")} · {item.customer.name} <span className="font-normal text-muted-foreground">· {item.plan.name}</span></p><p className="text-sm text-muted-foreground">Total hours: {item.purchasedHours.toFixed(2)} · Available: {item.remainingHours.toFixed(2)}{item.endDate ? ` · valid until ${new Date(item.endDate).toLocaleDateString()}` : ""}</p></div><div className="flex gap-2"><Badge className="self-center">{item.remainingHours.toFixed(2)} hrs left</Badge><Button variant="outline" size="sm" onClick={() => useHours(item)}>Deduct time</Button></div></div>)}</div>}
    </CardContent></Card>
    {isAdmin && <Card className="border-none shadow-sm rounded-2xl"><CardHeader><CardTitle>Plan catalogue</CardTitle></CardHeader><CardContent className="space-y-2">{plans.length === 0 ? <p className="text-muted-foreground">No plans configured.</p> : plans.map((plan) => <div key={plan.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3"><div><p className="font-bold">{plan.name} <span className="text-sm font-normal text-muted-foreground">#{plan.id}</span></p><p className="text-sm text-muted-foreground">{plan.totalHours} hours{plan.price !== null ? ` · ${plan.price}` : ""}{plan.durationDays ? ` · ${plan.durationDays} days` : ""}</p></div><Button variant="ghost" size="icon" onClick={() => deletePlan(plan.id)}><Trash2 size={16} className="text-destructive" /></Button></div>)}</CardContent></Card>}
  </div>;
}

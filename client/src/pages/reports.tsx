import { FormEvent, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, CalendarDays, CreditCard, Users, WalletCards } from "lucide-react";

interface Customer { id: number; name: string; phone: string; createdAt: string }
interface CustomerPlan { id: number; startDate: string; remainingHours: number; purchasedHours: number; status: string; customer: Customer; plan: { name: string } }
interface Payment { id: number; amount: number; paymentMethod: string; paidAt: string; customer: Customer; plan: { name: string } }
interface ReportData { customers: Customer[]; customerPlans: CustomerPlan[]; payments: Payment[] }

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
const customerCode = (id: number) => String(id).padStart(6, "0");

export default function Reports() {
  const { toast } = useToast();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<ReportData>({ customers: [], customerPlans: [], payments: [] });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load reports");
      setReport(data);
    } catch (error: any) { toast({ title: "Report unavailable", description: error.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const refresh = (event: FormEvent) => { event.preventDefault(); load(); };
  const paymentTotal = report.payments.reduce((total, payment) => total + payment.amount, 0);

  return <div className="space-y-8">
    <div><p className="text-sm font-bold uppercase tracking-widest text-primary">Admin</p><h2 className="text-3xl font-extrabold tracking-tight">Reports</h2><p className="mt-1 text-muted-foreground">Review customer registrations, plans, and payment collection for a selected date range.</p></div>
    <Card className="border-none shadow-sm rounded-2xl"><CardContent className="p-5"><form onSubmit={refresh} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><label className="mb-1 block text-sm font-bold">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div><div className="flex-1"><label className="mb-1 block text-sm font-bold">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div><Button type="submit" disabled={loading} className="rounded-xl"><CalendarDays size={16} /> {loading ? "Loading..." : "Generate report"}</Button></form></CardContent></Card>
    <div className="grid gap-4 md:grid-cols-3"><Card className="border-none shadow-sm rounded-2xl"><CardContent className="p-5"><Users className="mb-2 text-primary" /><p className="text-sm text-muted-foreground">New customers</p><p className="text-3xl font-extrabold">{report.customers.length}</p></CardContent></Card><Card className="border-none shadow-sm rounded-2xl"><CardContent className="p-5"><WalletCards className="mb-2 text-primary" /><p className="text-sm text-muted-foreground">Plans assigned</p><p className="text-3xl font-extrabold">{report.customerPlans.length}</p></CardContent></Card><Card className="border-none shadow-sm rounded-2xl"><CardContent className="p-5"><CreditCard className="mb-2 text-primary" /><p className="text-sm text-muted-foreground">Payments collected</p><p className="text-3xl font-extrabold">Rs {paymentTotal.toFixed(2)}</p></CardContent></Card></div>
    <Card className="border-none shadow-sm rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="text-primary" /> Customer details</CardTitle></CardHeader><CardContent className="p-0">{report.customers.length === 0 ? <p className="p-6 text-muted-foreground">No customer registrations in this date range.</p> : <div className="divide-y">{report.customers.map((customer) => <div key={customer.id} className="flex justify-between gap-4 px-6 py-3"><span className="font-semibold">#{customerCode(customer.id)} · {customer.name}</span><span className="text-sm text-muted-foreground">{customer.phone} · {new Date(customer.createdAt).toLocaleDateString()}</span></div>)}</div>}</CardContent></Card>
    <Card className="border-none shadow-sm rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="text-primary" /> Plan details</CardTitle></CardHeader><CardContent className="p-0">{report.customerPlans.length === 0 ? <p className="p-6 text-muted-foreground">No plans assigned in this date range.</p> : <div className="divide-y">{report.customerPlans.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"><div><p className="font-semibold">#{customerCode(item.customer.id)} · {item.customer.name} · {item.plan.name}</p><p className="text-sm text-muted-foreground">{item.remainingHours.toFixed(2)} of {item.purchasedHours.toFixed(2)} hours remaining</p></div><Badge variant="secondary">{item.status}</Badge></div>)}</div>}</CardContent></Card>
    <Card className="border-none shadow-sm rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary" /> Payment details</CardTitle></CardHeader><CardContent className="p-0">{report.payments.length === 0 ? <p className="p-6 text-muted-foreground">No payments collected in this date range.</p> : <div className="divide-y">{report.payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"><div><p className="font-semibold">#{customerCode(payment.customer.id)} · {payment.customer.name} · {payment.plan.name}</p><p className="text-sm text-muted-foreground">{new Date(payment.paidAt).toLocaleString()}</p></div><div className="text-right"><p className="font-extrabold">Rs {payment.amount.toFixed(2)}</p><Badge variant="secondary">{payment.paymentMethod.toUpperCase()}</Badge></div></div>)}</div>}</CardContent></Card>
  </div>;
}

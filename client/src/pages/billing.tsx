import { FormEvent, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { ClipboardList, Plus, Settings2, Trash2, Users } from "lucide-react";

interface BillingField { id: number; label: string; fieldType: "text" | "number" | "date" | "select"; required: boolean; options: string[]; active: boolean; sortOrder: number }
interface Customer { id: number; name: string; phone: string; dateOfBirth: string | null; customFields: Array<{ id: string; label: string; value: string }> }

const fieldTypes = ["text", "number", "date", "select"] as const;

export default function Billing() {
  const { isAdmin } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [fields, setFields] = useState<BillingField[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [values, setValues] = useState<Record<number, string>>({});
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<(typeof fieldTypes)[number]>("text");
  const [fieldOptions, setFieldOptions] = useState("");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [fieldRes, customerRes] = await Promise.all([fetch("/api/billing/fields"), fetch("/api/customers")]);
      if (!fieldRes.ok || !customerRes.ok) throw new Error("Could not load billing details");
      setFields(await fieldRes.json());
      setCustomers(await customerRes.json());
    } catch (error: any) {
      toast({ title: "Unable to load billing", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => { load(); }, []);
  const activeFields = fields.filter((field) => field.active);

  const createCustomer = async (event: FormEvent) => {
    event.preventDefault();
    const missing = activeFields.find((field) => field.required && !values[field.id]?.trim());
    if (missing) {
      toast({ title: "Required field", description: `${missing.label} is required.`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, dateOfBirth: dateOfBirth || null,
          customFields: activeFields.map((field) => ({ id: String(field.id), label: field.label, value: values[field.id] || "" })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save customer");
      setName(""); setPhone(""); setDateOfBirth(""); setValues({});
      toast({ title: "Customer saved", description: "Choose a plan and complete payment to activate it." });
      setLocation(`/plans?customerId=${data.id}`);
    } catch (error: any) {
      toast({ title: "Could not save customer", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const createField = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const res = await fetch("/api/billing/fields", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: fieldLabel, fieldType, required: fieldRequired, options: fieldOptions.split(",").map((value) => value.trim()).filter(Boolean), sortOrder: fields.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not add field");
      setFieldLabel(""); setFieldOptions(""); setFieldRequired(false); setFieldType("text");
      toast({ title: "Billing field added" }); load();
    } catch (error: any) { toast({ title: "Could not add field", description: error.message, variant: "destructive" }); }
  };

  const deleteField = async (id: number) => {
    if (!confirm("Remove this custom billing field? Existing customer details will be retained.")) return;
    const res = await fetch(`/api/billing/fields/${id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Billing field removed" }); load(); }
  };

  return <div className="space-y-8">
    <div>
      <p className="text-sm font-bold uppercase tracking-widest text-primary">Step 1</p>
      <h2 className="text-3xl font-extrabold tracking-tight">Customer Billing Details</h2>
      <p className="mt-1 text-muted-foreground">Register the customer first, then choose their plan and track remaining play time.</p>
    </div>
    <div className="grid gap-8 xl:grid-cols-3">
      <Card className="xl:col-span-2 border-none shadow-sm rounded-2xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="text-primary" /> New customer</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={createCustomer} className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" /></div>
            <div className="space-y-2"><Label>Phone number</Label><Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" /></div>
            <div className="space-y-2"><Label>Date of birth</Label><Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></div>
            {activeFields.map((field) => <div key={field.id} className="space-y-2">
              <Label>{field.label}{field.required ? " *" : ""}</Label>
              {field.fieldType === "select" ? <select required={field.required} value={values[field.id] || ""} onChange={(e) => setValues({ ...values, [field.id]: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select {field.label}</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}
              </select> : <Input required={field.required} type={field.fieldType} value={values[field.id] || ""} onChange={(e) => setValues({ ...values, [field.id]: e.target.value })} />}
            </div>)}
            <div className="md:col-span-2"><Button type="submit" disabled={saving} className="rounded-xl font-bold">{saving ? "Saving..." : "Save customer and continue to plans"}</Button></div>
          </form>
        </CardContent>
      </Card>
      {isAdmin && <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="text-primary" /> Billing fields</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={createField} className="space-y-3">
            <Input required value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} placeholder="Field label, e.g. School" />
            <Select value={fieldType} onValueChange={(value) => setFieldType(value as typeof fieldType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{fieldTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select>
            {fieldType === "select" && <Input value={fieldOptions} onChange={(e) => setFieldOptions(e.target.value)} placeholder="Options, separated by commas" />}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fieldRequired} onChange={(e) => setFieldRequired(e.target.checked)} /> Required</label>
            <Button type="submit" className="w-full rounded-xl"><Plus size={16} /> Add field</Button>
          </form>
          <div className="space-y-2 border-t pt-4">{fields.length === 0 ? <p className="text-sm text-muted-foreground">No custom fields yet.</p> : fields.map((field) => <div key={field.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm"><span>{field.label} <span className="text-muted-foreground">({field.fieldType})</span></span><Button variant="ghost" size="icon" onClick={() => deleteField(field.id)}><Trash2 size={15} className="text-destructive" /></Button></div>)}</div>
        </CardContent>
      </Card>}
    </div>
    <Card className="border-none shadow-sm rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Users className="text-primary" /> Customers</CardTitle></CardHeader><CardContent className="p-0">
      {customers.length === 0 ? <p className="p-6 text-muted-foreground">No customers registered yet.</p> : <div className="divide-y">{customers.map((customer) => <div key={customer.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4"><div><p className="font-bold">#{String(customer.id).padStart(6, "0")} · {customer.name}</p><p className="text-sm text-muted-foreground">{customer.phone}{customer.dateOfBirth ? ` · DOB ${customer.dateOfBirth}` : ""}</p></div><span className="text-sm text-muted-foreground">Ready for plan selection</span></div>)}</div>}
    </CardContent></Card>
  </div>;
}

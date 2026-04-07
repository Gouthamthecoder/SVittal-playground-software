import { useState, useMemo, useEffect } from "react";
import { useStore, KidStatus, KidEntry } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, Plus, CheckCircle, AlertTriangle, AlertCircle, X, Trash2, Clock4, Search, Filter, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// ── Reusable Confirm Dialog ───────────────────────────────────────────────────
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={v => !v && onCancel()}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-extrabold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="rounded-xl font-bold" onClick={onCancel} data-testid="confirm-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={`rounded-xl font-bold ${confirmVariant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
            onClick={onConfirm}
            data-testid="confirm-ok"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusSummary({ kids, getKidStatus }: { kids: KidEntry[], getKidStatus: (k: KidEntry) => KidStatus }) {
  const statuses = kids.map(getKidStatus);
  const total = kids.length;
  const green = statuses.filter(s => s === "green").length;
  const yellow = statuses.filter(s => s === "yellow").length;
  const red = statuses.filter(s => s === "red").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
          <p className="text-muted-foreground font-bold text-sm uppercase tracking-wider mb-1">Total Kids</p>
          <p className="text-4xl font-extrabold text-foreground">{total}</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-success/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
          <CheckCircle className="text-success mb-2" size={24} />
          <p className="text-success/80 font-bold text-sm uppercase tracking-wider mb-1">Active</p>
          <p className="text-4xl font-extrabold text-success">{green}</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-warning/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-warning"></div>
        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
          <AlertTriangle className="text-warning mb-2" size={24} />
          <p className="text-warning/80 font-bold text-sm uppercase tracking-wider mb-1">&lt; 10 Mins</p>
          <p className="text-4xl font-extrabold text-warning">{yellow}</p>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-danger/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-danger"></div>
        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
          <AlertCircle className="text-danger mb-2" size={24} />
          <p className="text-danger/80 font-bold text-sm uppercase tracking-wider mb-1">Exceeded</p>
          <p className="text-4xl font-extrabold text-danger">{red}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Edit Dialog ──────────────────────────────────────────────────────────────
function EditDialog({ kid, open, onClose }: { kid: KidEntry | null; open: boolean; onClose: () => void }) {
  const { updateKid } = useStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [kidName, setKidName] = useState("");
  const [hours, setHours] = useState("1");
  const [parents, setParents] = useState("1");
  const [childSocks, setChildSocks] = useState("");
  const [parentSocksInputs, setParentSocksInputs] = useState<string[]>([""]);
  const [customFields, setCustomFields] = useState<{ id: string; label: string; value: string }[]>([]);

  // Pre-fill whenever the dialog opens for a new kid
  useEffect(() => {
    if (!kid) return;
    setKidName(kid.kidName);
    setHours(String(kid.hoursOfPlay));
    setParents(String(kid.parentsCount));
    setChildSocks(kid.childSocks);
    const sockParts = kid.parentSocks ? kid.parentSocks.split(" | ") : [];
    const count = kid.parentsCount;
    setParentSocksInputs(Array.from({ length: count }, (_, i) => sockParts[i] ?? ""));
    setCustomFields(kid.customFields.map(cf => ({ ...cf })));
  }, [kid]);

  const handleParentsChange = (val: string) => {
    setParents(val);
    const count = parseInt(val, 10);
    setParentSocksInputs(prev => Array.from({ length: count }, (_, i) => prev[i] ?? ""));
  };

  // Step 1: Validate, then open confirm dialog
  const handleSave = () => {
    if (!kid) return;
    if (!kidName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (!childSocks.trim()) {
      toast({ title: "Child socks required", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  // Step 2: Actually save after confirmation
  const doSave = async () => {
    if (!kid) return;
    setConfirmOpen(false);
    setSaving(true);
    try {
      const filledSocks = parentSocksInputs.filter(s => s.trim() !== "" && s !== "__none__");
      await updateKid(kid.id, {
        kidName: kidName.trim(),
        hoursOfPlay: parseFloat(hours),
        parentsCount: parseInt(parents, 10),
        childSocks: childSocks.trim(),
        parentSocks: filledSocks.length > 0 ? filledSocks.join(" | ") : null,
        customFields: customFields.filter(f => f.label.trim() && f.value.trim()),
      });
      toast({ title: "Updated", description: `${kidName}'s details have been saved.` });
      onClose();
    } catch {
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden" data-testid="dialog-edit">
        <DialogHeader className="bg-primary px-6 py-4">
          <DialogTitle className="text-primary-foreground text-xl font-extrabold flex items-center gap-2">
            <Pencil size={20} /> Edit Entry
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Kid Name */}
          <div className="space-y-2">
            <Label className="font-bold">Kid's Name</Label>
            <Input value={kidName} onChange={e => setKidName(e.target.value)} className="h-11 rounded-xl border-2" data-testid="edit-input-kid-name" />
          </div>

          {/* Hours + Parents */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-bold">Hours of Play</Label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger className="h-11 rounded-xl border-2" data-testid="edit-select-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">30 Mins</SelectItem>
                  <SelectItem value="1">1 Hour</SelectItem>
                  <SelectItem value="1.5">1.5 Hours</SelectItem>
                  <SelectItem value="2">2 Hours</SelectItem>
                  <SelectItem value="3">3 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Parents</Label>
              <Select value={parents} onValueChange={handleParentsChange}>
                <SelectTrigger className="h-11 rounded-xl border-2" data-testid="edit-select-parents">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Child Socks */}
          <div className="space-y-2">
            <Label className="font-bold">Child Socks *</Label>
            <Select value={childSocks} onValueChange={setChildSocks}>
              <SelectTrigger className="h-11 rounded-xl border-2" data-testid="edit-input-child-socks">
                <SelectValue placeholder="Select size..." />
              </SelectTrigger>
              <SelectContent>
                {["XXS", "XS", "S", "M"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Parent Socks */}
          {parentSocksInputs.length > 0 && (
            <div className="space-y-2">
              <Label className="font-bold">Parent Socks {parentSocksInputs.length > 1 ? "(one per parent)" : ""}</Label>
              {parentSocksInputs.map((val, idx) => (
                <div key={idx} className="relative flex items-center gap-2">
                  {parentSocksInputs.length > 1 && (
                    <span className="text-xs font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-full whitespace-nowrap">P{idx + 1}</span>
                  )}
                  <Select value={val} onValueChange={v => setParentSocksInputs(prev => prev.map((x, i) => i === idx ? v : x))}>
                    <SelectTrigger className="h-11 rounded-xl border-2 flex-1" data-testid={`edit-input-parent-socks-${idx}`}>
                      <SelectValue placeholder="Select size (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {["S", "M", "L", "XL", "XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* Custom Fields */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Custom Info</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCustomFields(p => [...p, { id: Math.random().toString(), label: "", value: "" }])} className="h-8 text-primary font-bold hover:bg-primary/10">
                <Plus size={14} className="mr-1" /> Add
              </Button>
            </div>
            {customFields.map((cf) => (
              <div key={cf.id} className="flex gap-2 items-center">
                <Input value={cf.label} onChange={e => setCustomFields(p => p.map(f => f.id === cf.id ? { ...f, label: e.target.value } : f))} placeholder="Label" className="h-10 rounded-lg border-2 text-sm" />
                <Input value={cf.value} onChange={e => setCustomFields(p => p.map(f => f.id === cf.id ? { ...f, value: e.target.value } : f))} placeholder="Value" className="h-10 rounded-lg border-2 text-sm" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setCustomFields(p => p.filter(f => f.id !== cf.id))} className="text-destructive hover:bg-destructive/10 shrink-0 h-10 w-10">
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50 gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl flex-1" disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} className="rounded-xl flex-1 font-bold" disabled={saving} data-testid="button-save-edit">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      title="Save Changes?"
      description={`Are you sure you want to update the details for ${kidName}? This will overwrite the current session information.`}
      confirmLabel="Yes, Save"
      onConfirm={doSave}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { kids, addKid, removeKid, extendTime, getKidStatus, getRemainingMinutes, isLoading } = useStore();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [editingKid, setEditingKid] = useState<KidEntry | null>(null);

  type PendingAction =
    | { type: "end"; kid: KidEntry }
    | { type: "extend"; kid: KidEntry; hours: number };
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [kidName, setKidName] = useState("");
  const [hours, setHours] = useState("1");
  const [parents, setParents] = useState("1");
  const [childSocks, setChildSocks] = useState("");
  const [parentSocksInputs, setParentSocksInputs] = useState<string[]>([""]); // one per parent
  const [customFields, setCustomFields] = useState<{ id: string; label: string; value: string }[]>([]);

  const handleParentsChange = (val: string) => {
    setParents(val);
    const count = parseInt(val, 10);
    setParentSocksInputs(Array.from({ length: count }, (_, i) => parentSocksInputs[i] ?? ""));
  };

  const handleParentSocksChange = (idx: number, val: string) => {
    setParentSocksInputs(prev => prev.map((v, i) => i === idx ? val : v));
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredKids = useMemo(() => {
    return kids.filter((kid) => {
      const matchesSearch = kid.kidName.toLowerCase().includes(searchQuery.toLowerCase());
      const status = getKidStatus(kid);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [kids, searchQuery, statusFilter, getKidStatus]);

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { id: Math.random().toString(), label: "New Field", value: "" }]);
  };

  const handleCustomFieldChange = (id: string, field: "label" | "value", newValue: string) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, [field]: newValue } : f));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kidName) {
      toast({ title: "Name Required", description: "Please enter the kid's name.", variant: "destructive" });
      return;
    }
    if (!childSocks) {
      toast({ title: "Socks Required", description: "Please enter the child's socks ID.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const filledSocks = parentSocksInputs.filter(s => s.trim() !== "" && s !== "__none__");
      await addKid({
        kidName,
        hoursOfPlay: parseFloat(hours),
        parentsCount: parseInt(parents, 10),
        childSocks,
        parentSocks: filledSocks.length > 0 ? filledSocks.join(" | ") : undefined,
        customFields: customFields.filter(f => f.label.trim() !== "" && f.value.trim() !== ""),
      });
      toast({ title: "Success!", description: `${kidName} has been added to the floor.` });
      setKidName("");
      setHours("1");
      setParents("1");
      setChildSocks("");
      setParentSocksInputs([""]);
      setCustomFields([]);
    } catch {
      toast({ title: "Error", description: "Failed to add entry. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <StatusSummary kids={kids} getKidStatus={getKidStatus} />

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Entry Form */}
        <div className="lg:col-span-4">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden sticky top-24">
            <div className="bg-primary p-4 text-primary-foreground">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <Plus size={24} /> New Entry
              </h2>
            </div>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="kidName" className="font-bold text-base text-foreground/80">Kid's Name</Label>
                  <Input 
                    id="kidName" 
                    value={kidName} 
                    onChange={e => setKidName(e.target.value)} 
                    placeholder="Enter name..."
                    className="h-12 text-lg rounded-xl border-2 bg-secondary/30 focus-visible:bg-white"
                    data-testid="input-kid-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="hours" className="font-bold text-base text-foreground/80">Hours of Play</Label>
                    <Select value={hours} onValueChange={setHours}>
                      <SelectTrigger className="h-12 text-lg rounded-xl border-2 bg-secondary/30">
                        <SelectValue placeholder="Hours" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">30 Mins</SelectItem>
                        <SelectItem value="1">1 Hour</SelectItem>
                        <SelectItem value="1.5">1.5 Hours</SelectItem>
                        <SelectItem value="2">2 Hours</SelectItem>
                        <SelectItem value="3">3 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="parents" className="font-bold text-base text-foreground/80">Parents</Label>
                    <Select value={parents} onValueChange={handleParentsChange}>
                      <SelectTrigger className="h-12 text-lg rounded-xl border-2 bg-secondary/30">
                        <SelectValue placeholder="Parents" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="childSocks" className="font-bold text-base text-foreground/80">Child Socks *</Label>
                  <Select value={childSocks} onValueChange={setChildSocks}>
                    <SelectTrigger
                      id="childSocks"
                      className="h-12 text-lg rounded-xl border-2 bg-secondary/30"
                      data-testid="input-child-socks"
                    >
                      <SelectValue placeholder="Select size..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["XXS", "XS", "S", "M"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {parentSocksInputs.length > 0 && (
                  <div className="space-y-3">
                    <Label className="font-bold text-base text-foreground/80">
                      Parent Socks {parentSocksInputs.length > 1 ? "(one per parent)" : ""}
                    </Label>
                    {parentSocksInputs.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-top-1">
                        {parentSocksInputs.length > 1 && (
                          <span className="text-xs font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-full whitespace-nowrap">
                            P{idx + 1}
                          </span>
                        )}
                        <Select value={val} onValueChange={v => handleParentSocksChange(idx, v)}>
                          <SelectTrigger
                            className="h-12 text-lg rounded-xl border-2 bg-secondary/30 flex-1"
                            data-testid={`input-parent-socks-${idx}`}
                          >
                            <SelectValue placeholder="Select size (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None —</SelectItem>
                            {["S", "M", "L", "XL", "XXL"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Fields Section */}
                <div className="pt-2 border-t border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Custom Info</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={handleAddCustomField} className="h-8 text-primary font-bold hover:bg-primary/10 hover:text-primary">
                      <Plus size={16} className="mr-1" /> Add Field
                    </Button>
                  </div>
                  
                  {customFields.map((field) => (
                    <div key={field.id} className="flex gap-2 items-center animate-in slide-in-from-left-2">
                      <Input 
                        value={field.label} 
                        onChange={(e) => handleCustomFieldChange(field.id, "label", e.target.value)}
                        placeholder="e.g. Socks #"
                        className="h-10 text-sm rounded-lg border-2"
                      />
                      <Input 
                        value={field.value} 
                        onChange={(e) => handleCustomFieldChange(field.id, "value", e.target.value)}
                        placeholder="Value"
                        className="h-10 text-sm rounded-lg border-2"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomField(field.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
                        <X size={18} />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl mt-4" data-testid="button-submit-entry" disabled={submitting}>
                  {submitting ? "Adding..." : "Start Play Time"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <h2 className="text-2xl font-extrabold text-foreground">Current Floor Status</h2>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input 
                  placeholder="Search name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-[180px] bg-white border-2"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[140px] bg-white border-2">
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-muted-foreground" />
                    <SelectValue placeholder="Filter" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="green">Active</SelectItem>
                  <SelectItem value="yellow">&lt; 10 Mins</SelectItem>
                  <SelectItem value="red">Exceeded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {kids.length === 0 ? (
            <Card className="border-none shadow-sm bg-white/50 border-dashed border-2 border-border/50">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                <div className="bg-secondary p-4 rounded-full mb-4 text-muted-foreground">
                  <Users size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">No Kids on the Floor</h3>
                <p className="text-muted-foreground">Add an entry using the form to start tracking.</p>
              </CardContent>
            </Card>
          ) : filteredKids.length === 0 ? (
            <Card className="border-none shadow-sm bg-white/50 border-dashed border-2 border-border/50">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                <div className="bg-secondary p-4 rounded-full mb-4 text-muted-foreground">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">No matches found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filter.</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)] pr-4 -mr-4">
              <div className="space-y-4 pb-12">
                {filteredKids.map((kid) => {
                  const status = getKidStatus(kid);
                  const remaining = getRemainingMinutes(kid);
                  
                  let cardClass = "";
                  let badgeClass = "";
                  let icon = null;

                  if (status === "green") {
                    cardClass = "bg-white border-l-8 border-success hover:shadow-md transition-shadow";
                    badgeClass = "bg-success/10 text-success border-success/20";
                    icon = <CheckCircle size={20} className="text-success" />;
                  } else if (status === "yellow") {
                    cardClass = "bg-warning/5 border-l-8 border-warning hover:shadow-md transition-shadow";
                    badgeClass = "bg-warning/20 text-warning-foreground border-warning/30";
                    icon = <AlertTriangle size={20} className="text-warning" />;
                  } else {
                    cardClass = "bg-danger/5 border-l-8 border-danger hover:shadow-md transition-shadow ring-2 ring-danger/20";
                    badgeClass = "bg-danger/20 text-danger border-danger/30 animate-pulse";
                    icon = <AlertCircle size={20} className="text-danger" />;
                  }

                  return (
                    <Card key={kid.id} className={`border-none shadow-sm rounded-xl overflow-hidden relative group ${cardClass}`} data-testid={`card-kid-${kid.id}`}>
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center p-5 gap-4 sm:gap-6">
                          {/* Name and Status Icon */}
                          <div className="flex items-center gap-4 min-w-[200px]">
                            <div className="bg-background p-3 rounded-full shadow-sm">
                              {icon}
                            </div>
                            <div>
                              <h3 className="text-2xl font-extrabold text-foreground">{kid.kidName}</h3>
                              <p className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                                <Users size={14} /> {kid.parentsCount} Parent{kid.parentsCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          {/* Socks & Custom Fields */}
                          <div className="flex-1 flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary">
                              <span className="opacity-70 mr-1">Child:</span> {kid.childSocks}
                            </span>
                            {kid.parentSocks && kid.parentSocks.split(" | ").map((sock, si) => (
                              <span key={si} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary">
                                <span className="opacity-70 mr-1">{kid.parentsCount > 1 ? `P${si + 1}:` : "Parent:"}</span> {sock}
                              </span>
                            ))}
                            {kid.customFields.map((cf, idx) => (
                              <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-secondary text-secondary-foreground">
                                <span className="opacity-50 mr-1">{cf.label}:</span> {cf.value}
                              </span>
                            ))}
                          </div>

                          {/* Timer and Action */}
                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t border-border/50 sm:border-t-0 pt-4 sm:pt-0">
                            <div className={`px-4 py-2 rounded-xl border flex flex-col items-center min-w-[120px] ${badgeClass}`}>
                              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 mb-0.5">
                                {status === "red" ? "Overtime" : "Time Left"}
                              </span>
                              <span className="text-xl font-extrabold flex items-center gap-1.5">
                                <Clock size={18} />
                                {status === "red" ? `+${Math.abs(remaining)}m` : `${remaining}m`}
                              </span>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-12 w-12 rounded-xl bg-background hover:bg-secondary/80 transition-colors border-2"
                                  title="Actions"
                                  data-testid={`button-actions-${kid.id}`}
                                >
                                  <Clock4 size={20} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                                <DropdownMenuItem
                                  onClick={() => setEditingKid(kid)}
                                  className="rounded-lg cursor-pointer font-medium py-2 gap-2"
                                  data-testid={`button-edit-${kid.id}`}
                                >
                                  <Pencil size={15} /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1" />
                                <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Extend Time</div>
                                <DropdownMenuItem onClick={() => setPendingAction({ type: "extend", kid, hours: 0.5 })} className="rounded-lg cursor-pointer font-medium py-2">
                                  + 30 Minutes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setPendingAction({ type: "extend", kid, hours: 1 })} className="rounded-lg cursor-pointer font-medium py-2">
                                  + 1 Hour
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem
                                  onClick={() => setPendingAction({ type: "end", kid })}
                                  className="rounded-lg cursor-pointer font-medium py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                                  data-testid={`button-end-${kid.id}`}
                                >
                                  <Trash2 size={16} className="mr-2" /> End Session
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <EditDialog
        kid={editingKid}
        open={editingKid !== null}
        onClose={() => setEditingKid(null)}
      />

      {pendingAction && (
        <ConfirmDialog
          open
          title={
            pendingAction.type === "end"
              ? "End Session?"
              : `Extend Time by ${pendingAction.hours === 0.5 ? "30 minutes" : "1 hour"}?`
          }
          description={
            pendingAction.type === "end"
              ? `This will check out ${pendingAction.kid.kidName} and record their end time. This cannot be undone.`
              : `Add ${pendingAction.hours === 0.5 ? "30 minutes" : "1 hour"} of extra play time for ${pendingAction.kid.kidName}?`
          }
          confirmLabel={pendingAction.type === "end" ? "End Session" : "Yes, Extend"}
          confirmVariant={pendingAction.type === "end" ? "destructive" : "default"}
          onConfirm={() => {
            if (pendingAction.type === "end") {
              removeKid(pendingAction.kid.id);
            } else {
              extendTime(pendingAction.kid.id, pendingAction.hours);
            }
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
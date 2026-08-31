import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { UserCog, Trash2, Plus, ShieldCheck, User, Store, X, Upload, Download } from "lucide-react";

interface ManagedUser {
  id: string;
  username: string;
  role: string;
}

interface ManagedShop {
  id: number;
  name: string;
  code: string | null;
}

interface ShopUser {
  id: string;
  username: string;
  role: string;
  shopRole: string;
}

interface InventoryRow {
  category: "child" | "parent";
  size: string;
  initialQuantity: number;
  usedQuantity: number;
  availableQuantity: number;
}

// ── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const { user: currentUser } = useStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      setUsers(await res.json());
    } catch {
      toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      toast({ title: "Required", description: "Username and password are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create user");
      toast({ title: "User created", description: `${data.username} (${data.role}) added successfully.` });
      setNewUsername(""); setNewPassword(""); setNewRole("staff");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "User deleted", description: `${username} has been removed.` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-primary p-4 text-primary-foreground">
            <h2 className="text-xl font-extrabold flex items-center gap-2"><Plus size={22} /> New User</h2>
          </div>
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-username" className="font-bold">Username</Label>
                <Input id="new-username" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                  placeholder="e.g. sarah" className="h-11 rounded-xl border-2 bg-secondary/30"
                  data-testid="input-new-username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="font-bold">Password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 4 characters" className="h-11 rounded-xl border-2 bg-secondary/30"
                  data-testid="input-new-password" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "staff")}>
                  <SelectTrigger className="h-11 rounded-xl border-2 bg-secondary/30" data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff — Entry access only</SelectItem>
                    <SelectItem value="admin">Admin — Full access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-12 font-bold rounded-xl" disabled={submitting}
                data-testid="button-create-user">
                {submitting ? "Creating..." : "Create User"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-border/50 text-sm text-muted-foreground space-y-1">
          <p className="font-bold text-foreground">Role Permissions</p>
          <p><span className="font-bold text-primary">Admin</span> — Dashboard, Metrics, CSV export, User & Shop management</p>
          <p><span className="font-bold text-foreground">Staff</span> — Dashboard only (check in/out kids)</p>
        </div>
      </div>

      <div className="lg:col-span-8">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-lg font-extrabold">Active Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground font-bold">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-bold">No users found.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
                    data-testid={`row-user-${u.id}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${u.role === "admin" ? "bg-primary/10" : "bg-secondary"}`}>
                        {u.role === "admin"
                          ? <ShieldCheck size={20} className="text-primary" />
                          : <User size={20} className="text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="font-extrabold text-foreground" data-testid={`text-username-${u.id}`}>{u.username}</p>
                        <p className={`text-xs font-bold uppercase tracking-wide ${u.role === "admin" ? "text-primary" : "text-muted-foreground"}`}>
                          {u.role}{u.id === currentUser?.id && " · You"}
                        </p>
                      </div>
                    </div>
                    {u.id !== currentUser?.id && (
                      <Button variant="ghost" size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-9 w-9"
                        onClick={() => handleDelete(u.id, u.username)}
                        data-testid={`button-delete-user-${u.id}`}>
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Shops Tab ────────────────────────────────────────────────────────────────
function ShopsTab() {
  const { toast } = useToast();
  const [shops, setShops] = useState<ManagedShop[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [shopUsers, setShopUsers] = useState<Record<number, ShopUser[]>>({});
  const [shopInventory, setShopInventory] = useState<Record<number, InventoryRow[]>>({});
  const [inventoryFiles, setInventoryFiles] = useState<Record<number, File | null>>({});
  const [loading, setLoading] = useState(false);
  const [expandedShopId, setExpandedShopId] = useState<number | null>(null);

  // Create shop form
  const [newShopName, setNewShopName] = useState("");
  const [newShopCode, setNewShopCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Assign user form
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRole, setAssignRole] = useState<"staff" | "admin">("staff");
  const [assigning, setAssigning] = useState(false);
  const [importingInventory, setImportingInventory] = useState<number | null>(null);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shops");
      if (!res.ok) throw new Error("Failed to load shops");
      setShops(await res.json());
    } catch {
      toast({ title: "Error", description: "Could not load shops.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch {}
  };

  const fetchShopUsers = async (shopId: number) => {
    try {
      const res = await fetch(`/api/shops/${shopId}/users`);
      if (res.ok) {
        const data = await res.json();
        setShopUsers(prev => ({ ...prev, [shopId]: data }));
      }
    } catch {}
  };

  const fetchShopInventory = async (shopId: number) => {
    try {
      const res = await fetch(`/api/shops/${shopId}/socks-inventory`);
      if (res.ok) {
        const data = await res.json();
        setShopInventory(prev => ({ ...prev, [shopId]: data }));
      }
    } catch {}
  };

  useEffect(() => { fetchShops(); fetchUsers(); }, []);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) {
      toast({ title: "Required", description: "Shop name is required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newShopName.trim(), code: newShopCode.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create shop");
      toast({ title: "Shop created", description: `${data.name} added.` });
      setNewShopName(""); setNewShopCode("");
      fetchShops();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShop = async (id: number, name: string) => {
    if (!confirm(`Delete shop "${name}"? All session data for this shop will be unlinked.`)) return;
    try {
      const res = await fetch(`/api/shops/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Shop deleted", description: `${name} removed.` });
      fetchShops();
      if (expandedShopId === id) setExpandedShopId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedShopId || !assignUserId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/shops/${expandedShopId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: assignUserId, role: assignRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "User assigned", description: "User added to this shop." });
      setAssignUserId("");
      fetchShopUsers(expandedShopId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveUser = async (shopId: number, userId: string, username: string) => {
    try {
      const res = await fetch(`/api/shops/${shopId}/users/${userId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      toast({ title: "User removed", description: `${username} removed from this shop.` });
      fetchShopUsers(shopId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleShop = (shopId: number) => {
    if (expandedShopId === shopId) {
      setExpandedShopId(null);
    } else {
      setExpandedShopId(shopId);
      fetchShopUsers(shopId);
      fetchShopInventory(shopId);
    }
  };

  const handleInventoryFileChange = (shopId: number, file: File | null) => {
    setInventoryFiles(prev => ({ ...prev, [shopId]: file }));
  };

  const handleImportInventory = async (shopId: number) => {
    const file = inventoryFiles[shopId];
    if (!file) {
      toast({ title: "File required", description: "Choose a CSV file before importing.", variant: "destructive" });
      return;
    }

    setImportingInventory(shopId);
    try {
      const csvText = await file.text();
      const res = await fetch(`/api/shops/${shopId}/socks-inventory/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to import inventory");

      setShopInventory(prev => ({ ...prev, [shopId]: data.items }));
      setInventoryFiles(prev => ({ ...prev, [shopId]: null }));
      toast({
        title: "Inventory updated",
        description: "The shop inventory file was imported successfully.",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setImportingInventory(null);
    }
  };

  const handleExportInventory = (shopId: number) => {
    const a = document.createElement("a");
    a.href = `/api/shops/${shopId}/socks-inventory/export`;
    a.download = `shop-${shopId}-socks-inventory.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Download started", description: "Exporting current socks availability." });
  };

  const assignedUserIds = expandedShopId ? (shopUsers[expandedShopId] || []).map(u => u.id) : [];
  const unassignedUsers = users.filter(u => !assignedUserIds.includes(u.id));

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-primary p-4 text-primary-foreground">
            <h2 className="text-xl font-extrabold flex items-center gap-2"><Plus size={22} /> New Shop</h2>
          </div>
          <CardContent className="p-6">
            <form onSubmit={handleCreateShop} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shop-name" className="font-bold">Shop Name</Label>
                <Input id="shop-name" value={newShopName} onChange={e => setNewShopName(e.target.value)}
                  placeholder="e.g. Mall Branch" className="h-11 rounded-xl border-2 bg-secondary/30"
                  data-testid="input-shop-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-code" className="font-bold">Short Code <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="shop-code" value={newShopCode} onChange={e => setNewShopCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MALL" maxLength={20} className="h-11 rounded-xl border-2 bg-secondary/30"
                  data-testid="input-shop-code" />
              </div>
              <Button type="submit" className="w-full h-12 font-bold rounded-xl" disabled={submitting}
                data-testid="button-create-shop">
                {submitting ? "Creating..." : "Create Shop"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-8 space-y-4">
        <h2 className="text-lg font-extrabold">Shops &amp; Staff Assignments</h2>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground font-bold">Loading shops...</div>
        ) : shops.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-bold">No shops yet. Create one to get started.</div>
        ) : (
          shops.map(shop => (
            <Card key={shop.id} className="border-none shadow-sm rounded-2xl overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => toggleShop(shop.id)}
                data-testid={`row-shop-${shop.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-2 rounded-xl">
                    <Store size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-extrabold text-foreground">{shop.name}</p>
                    {shop.code && (
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{shop.code}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-9 w-9"
                    onClick={e => { e.stopPropagation(); handleDeleteShop(shop.id, shop.name); }}
                    data-testid={`button-delete-shop-${shop.id}`}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              {expandedShopId === shop.id && (
                <div className="border-t border-border/50 bg-secondary/20 p-5 space-y-4">
                  {/* Assigned users */}
                  <div>
                    <p className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">Assigned Staff</p>
                    {(shopUsers[shop.id] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {(shopUsers[shop.id] || []).map(su => (
                          <div key={su.id} className="flex items-center justify-between bg-card rounded-xl px-4 py-2.5"
                            data-testid={`row-shop-user-${shop.id}-${su.id}`}>
                            <div className="flex items-center gap-3">
                              <User size={16} className="text-muted-foreground" />
                              <span className="font-bold text-sm">{su.username}</span>
                              <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {su.shopRole}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveUser(shop.id, su.id, su.username)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              data-testid={`button-remove-user-${shop.id}-${su.id}`}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Socks Inventory</p>
                        <p className="text-sm text-muted-foreground">
                          Import a CSV with `category,size,quantity`. Current availability is calculated as imported stock minus all socks already used in sessions for this shop.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl font-bold"
                        onClick={() => handleExportInventory(shop.id)}
                        data-testid={`button-export-inventory-${shop.id}`}
                      >
                        <Download size={16} className="mr-2" /> Export Availability
                      </Button>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Inventory CSV</Label>
                        <Input
                          type="file"
                          accept=".csv,text/csv"
                          className="rounded-xl border-2 bg-background file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-bold file:text-primary"
                          onChange={(e) => handleInventoryFileChange(shop.id, e.target.files?.[0] ?? null)}
                          data-testid={`input-inventory-file-${shop.id}`}
                        />
                      </div>
                      <Button
                        type="button"
                        className="rounded-xl font-bold"
                        onClick={() => handleImportInventory(shop.id)}
                        disabled={importingInventory === shop.id}
                        data-testid={`button-import-inventory-${shop.id}`}
                      >
                        <Upload size={16} className="mr-2" />
                        {importingInventory === shop.id ? "Importing..." : "Import Inventory"}
                      </Button>
                    </div>

                    {(shopInventory[shop.id] || []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                        No inventory imported yet for this shop.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-border/60">
                        <table className="w-full text-sm">
                          <thead className="bg-secondary/40">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Size</th>
                              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Imported</th>
                              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Used</th>
                              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-muted-foreground">Available</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(shopInventory[shop.id] || []).map((item) => (
                              <tr
                                key={`${item.category}-${item.size}`}
                                className="border-t border-border/50 bg-white"
                                data-testid={`row-inventory-${shop.id}-${item.category}-${item.size}`}
                              >
                                <td className="px-4 py-3 font-bold capitalize text-foreground">{item.category}</td>
                                <td className="px-4 py-3 text-foreground">{item.size}</td>
                                <td className="px-4 py-3 text-foreground">{item.initialQuantity}</td>
                                <td className="px-4 py-3 text-foreground">{item.usedQuantity}</td>
                                <td className={`px-4 py-3 font-extrabold ${item.availableQuantity < 0 ? "text-destructive" : "text-primary"}`}>
                                  {item.availableQuantity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Assign user */}
                  {unassignedUsers.length > 0 && (
                    <form onSubmit={handleAssignUser} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Add Staff Member</Label>
                        <Select value={assignUserId} onValueChange={setAssignUserId}>
                          <SelectTrigger className="h-10 rounded-xl border-2 bg-card text-sm" data-testid="select-assign-user">
                            <SelectValue placeholder="Select user..." />
                          </SelectTrigger>
                          <SelectContent>
                            {unassignedUsers.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.username} ({u.role})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Shop Role</Label>
                        <Select value={assignRole} onValueChange={(v) => setAssignRole(v as "staff" | "admin")}>
                          <SelectTrigger className="h-10 rounded-xl border-2 bg-card text-sm" data-testid="select-assign-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="h-10 rounded-xl font-bold" disabled={assigning || !assignUserId}
                        data-testid="button-assign-user">
                        {assigning ? "..." : "Assign"}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function UserManagement() {
  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <UserCog size={28} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">Management</h1>
          <p className="text-muted-foreground font-medium">Manage users, shops, and staff assignments.</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="rounded-xl bg-secondary p-1 mb-6 h-auto">
          <TabsTrigger value="users" className="rounded-lg font-bold px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <User size={16} className="mr-2" /> Users
          </TabsTrigger>
          <TabsTrigger value="shops" className="rounded-lg font-bold px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Store size={16} className="mr-2" /> Shops
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="shops">
          <ShopsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

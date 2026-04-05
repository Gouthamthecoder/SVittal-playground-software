import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { UserCog, Trash2, Plus, ShieldCheck, User } from "lucide-react";

interface ManagedUser {
  id: string;
  username: string;
  role: string;
}

export default function UserManagement() {
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
      const data = await res.json();
      setUsers(data);
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
      setNewUsername("");
      setNewPassword("");
      setNewRole("staff");
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
    <div className="animate-in fade-in duration-300 space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-xl">
          <UserCog size={28} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">User Management</h1>
          <p className="text-muted-foreground font-medium">Add and manage staff access to PlayTracker.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Create User Form */}
        <div className="lg:col-span-4">
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="bg-primary p-4 text-primary-foreground">
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <Plus size={22} /> New User
              </h2>
            </div>
            <CardContent className="p-6">
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-username" className="font-bold">Username</Label>
                  <Input
                    id="new-username"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="e.g. sarah"
                    className="h-11 rounded-xl border-2 bg-secondary/30"
                    data-testid="input-new-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="font-bold">Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    className="h-11 rounded-xl border-2 bg-secondary/30"
                    data-testid="input-new-password"
                  />
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
                <Button type="submit" className="w-full h-12 font-bold rounded-xl" disabled={submitting} data-testid="button-create-user">
                  {submitting ? "Creating..." : "Create User"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-4 p-4 bg-muted/50 rounded-xl border border-border/50 text-sm text-muted-foreground space-y-1">
            <p className="font-bold text-foreground">Role Permissions</p>
            <p><span className="font-bold text-primary">Admin</span> — Dashboard, Metrics, CSV export, User management</p>
            <p><span className="font-bold text-foreground">Staff</span> — Dashboard only (check in/out kids)</p>
          </div>
        </div>

        {/* Users List */}
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
                    <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors" data-testid={`row-user-${u.id}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${u.role === "admin" ? "bg-primary/10" : "bg-secondary"}`}>
                          {u.role === "admin"
                            ? <ShieldCheck size={20} className="text-primary" />
                            : <User size={20} className="text-muted-foreground" />
                          }
                        </div>
                        <div>
                          <p className="font-extrabold text-foreground" data-testid={`text-username-${u.id}`}>{u.username}</p>
                          <p className={`text-xs font-bold uppercase tracking-wide ${u.role === "admin" ? "text-primary" : "text-muted-foreground"}`}>
                            {u.role}
                            {u.id === currentUser?.id && " · You"}
                          </p>
                        </div>
                      </div>
                      {u.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-9 w-9"
                          onClick={() => handleDelete(u.id, u.username)}
                          data-testid={`button-delete-user-${u.id}`}
                        >
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
    </div>
  );
}

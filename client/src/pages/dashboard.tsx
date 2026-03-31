import { useState } from "react";
import { useStore, KidStatus, KidEntry } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, Plus, CheckCircle, AlertTriangle, AlertCircle, X, Trash2, Clock4 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

export default function Dashboard() {
  const { kids, addKid, removeKid, extendTime, getKidStatus, getRemainingMinutes } = useStore();
  const { toast } = useToast();
  
  const [kidName, setKidName] = useState("");
  const [hours, setHours] = useState("1");
  const [parents, setParents] = useState("1");
  const [customFields, setCustomFields] = useState<{ id: string; label: string; value: string }[]>([]);

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { id: Math.random().toString(), label: "New Field", value: "" }]);
  };

  const handleCustomFieldChange = (id: string, field: "label" | "value", newValue: string) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, [field]: newValue } : f));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kidName) {
      toast({
        title: "Name Required",
        description: "Please enter the kid's name.",
        variant: "destructive",
      });
      return;
    }

    addKid({
      kidName,
      hoursOfPlay: parseFloat(hours),
      parentsCount: parseInt(parents, 10),
      customFields: customFields.filter(f => f.label.trim() !== "" && f.value.trim() !== ""),
    });

    toast({
      title: "Success!",
      description: `${kidName} has been added to the floor.`,
    });

    // Reset
    setKidName("");
    setHours("1");
    setParents("1");
    setCustomFields([]);
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
                    <Select value={parents} onValueChange={setParents}>
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

                <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl mt-4" data-testid="button-submit-entry">
                  Start Play Time
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-extrabold text-foreground">Current Floor Status</h2>
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
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)] pr-4 -mr-4">
              <div className="space-y-4 pb-12">
                {kids.map((kid) => {
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

                          {/* Custom Fields (Optional) */}
                          <div className="flex-1 flex flex-wrap gap-2">
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
                                <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Extend Time</div>
                                <DropdownMenuItem onClick={() => extendTime(kid.id, 0.5)} className="rounded-lg cursor-pointer font-medium py-2">
                                  + 30 Minutes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => extendTime(kid.id, 1)} className="rounded-lg cursor-pointer font-medium py-2">
                                  + 1 Hour
                                </DropdownMenuItem>
                                <div className="h-px bg-border/50 my-1 -mx-1" />
                                <DropdownMenuItem 
                                  onClick={() => removeKid(kid.id)} 
                                  className="rounded-lg cursor-pointer font-medium py-2 text-destructive focus:text-destructive focus:bg-destructive/10 mt-1"
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
    </div>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CalendarIcon, BarChart3, TrendingUp, Users, Clock, Footprints } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SessionRecord {
  id: number;
  kidName: string;
  childSocks: string;
  parentSocks: string | null;
  parentsCount: number;
  hoursOfPlay: number;
  customFields: { id: string; label: string; value: string }[];
  inTime: string;
  outTime: string | null;
  date: string;
}

function formatTime(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function calcDuration(inTime: string, outTime: string | null): string {
  if (!outTime) return "Active";
  const ms = new Date(outTime).getTime() - new Date(inTime).getTime();
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function buildHourlyData(sessions: SessionRecord[]) {
  const hourBuckets: Record<number, number> = {};
  for (let i = 8; i <= 21; i++) hourBuckets[i] = 0;
  sessions.forEach(s => {
    const hour = new Date(s.inTime).getHours();
    if (hour >= 8 && hour <= 21) hourBuckets[hour]++;
  });
  return Object.entries(hourBuckets).map(([hour, count]) => ({
    time: `${parseInt(hour) > 12 ? parseInt(hour) - 12 : parseInt(hour)}${parseInt(hour) >= 12 ? "PM" : "AM"}`,
    kids: count,
  }));
}

export default function Metrics() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sessions?date=${date}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSessions(data);
      } catch {
        toast({ title: "Error", description: "Could not load sessions for this date.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [date]);

  const handleExportCSV = () => {
    const url = `/api/sessions/export?date=${date}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `sessions-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Download Started", description: `Exporting data for ${date}` });
  };

  const totalKids = sessions.length;
  const activeSessions = sessions.filter(s => !s.outTime).length;
  const completedSessions = sessions.filter(s => !!s.outTime).length;
  const hourlyData = buildHourlyData(sessions);
  const uniqueSocks = new Set(sessions.map(s => s.childSocks)).size;

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground mb-1 flex items-center gap-2">
            <BarChart3 className="text-primary" /> Metrics Overview
          </h1>
          <p className="text-muted-foreground text-lg">Analyze daily attendance and play history.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Select Date</Label>
            <div className="relative">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 w-full sm:w-[200px] rounded-xl border-2 font-bold pl-10"
                data-testid="input-date"
              />
              <CalendarIcon className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <Button
            onClick={handleExportCSV}
            className="h-12 px-6 rounded-xl font-bold gap-2 mt-5 bg-secondary text-secondary-foreground hover:bg-secondary/80 border-2 border-transparent hover:border-border"
            data-testid="button-export-csv"
            disabled={sessions.length === 0}
          >
            <Download size={20} />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="opacity-80" />
              <p className="font-bold text-primary-foreground/80 uppercase tracking-wider text-xs">Total Kids</p>
            </div>
            <p className="text-4xl font-extrabold">{totalKids}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-success/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-success" />
              <p className="font-bold text-success/80 uppercase tracking-wider text-xs">Active Now</p>
            </div>
            <p className="text-4xl font-extrabold text-success">{activeSessions}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-muted-foreground" />
              <p className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Completed</p>
            </div>
            <p className="text-4xl font-extrabold text-foreground">{completedSessions}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Footprints size={18} className="text-muted-foreground" />
              <p className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Socks Issued</p>
            </div>
            <p className="text-4xl font-extrabold text-foreground">{uniqueSocks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Chart */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold text-foreground">Hourly Check-ins</CardTitle>
          <CardDescription className="text-base">Number of kids checked in per hour for {date}.</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 700 }} allowDecimals={false} />
              <Tooltip cursor={{ fill: "hsl(var(--secondary))" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", fontWeight: "bold", padding: "12px" }} />
              <Bar dataKey="kids" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Session Table */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold text-foreground">Session Details</CardTitle>
          <CardDescription className="text-base">All sessions recorded for {date}. {sessions.length === 0 && "No entries found."}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground font-bold">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-bold">No sessions recorded for this date.</div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50 text-left">
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">Kid Name</th>
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">Child Socks</th>
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">Parent Socks</th>
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">In Time</th>
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">Out Time</th>
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">Duration</th>
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">Booked</th>
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">Parents</th>
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">Extra Info</th>
                      <th className="px-5 py-3 font-bold text-muted-foreground uppercase tracking-wider text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, idx) => (
                      <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-secondary/20"} data-testid={`row-session-${s.id}`}>
                        <td className="px-5 py-4 font-extrabold text-foreground">{s.kidName}</td>
                        <td className="px-5 py-4">
                          <span className="font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs">{s.childSocks}</span>
                        </td>
                        <td className="px-5 py-4">
                          {s.parentSocks ? (
                            <span className="font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs">{s.parentSocks}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-bold text-foreground">{formatTime(s.inTime)}</td>
                        <td className="px-5 py-4 font-bold text-foreground">{formatTime(s.outTime)}</td>
                        <td className="px-5 py-4 font-bold text-foreground">{calcDuration(s.inTime, s.outTime)}</td>
                        <td className="px-5 py-4 text-foreground">
                          {s.hoursOfPlay >= 1 ? `${s.hoursOfPlay}h` : `${s.hoursOfPlay * 60}m`}
                        </td>
                        <td className="px-5 py-4 text-foreground">{s.parentsCount}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(s.customFields) && s.customFields.map((cf, i) => (
                              <span key={i} className="text-xs font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">
                                {cf.label}: {cf.value}
                              </span>
                            ))}
                            {(!s.customFields || s.customFields.length === 0) && <span className="text-muted-foreground text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {s.outTime ? (
                            <Badge variant="outline" className="text-xs font-bold bg-secondary">Done</Badge>
                          ) : (
                            <Badge className="text-xs font-bold bg-success/20 text-success border-success/30">Active</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

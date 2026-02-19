import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CalendarIcon, BarChart3, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MOCK_HISTORICAL_DATA } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export default function Metrics() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleDownload = () => {
    toast({
      title: "Downloading Data",
      description: "Preparing your CSV file for download...",
    });
    // Mock download behavior
    setTimeout(() => {
      toast({
        title: "Download Complete",
        description: `Metrics for ${date} have been downloaded.`,
      });
    }, 1500);
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground mb-1 flex items-center gap-2">
            <BarChart3 className="text-primary" /> Metrics Overview
          </h1>
          <p className="text-muted-foreground text-lg">Analyze daily attendance and peak hours.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Select Date</Label>
            <div className="relative">
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="h-12 w-full sm:w-[200px] rounded-xl border-2 font-bold pl-10"
              />
              <CalendarIcon className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          
          <Button 
            onClick={handleDownload}
            className="h-12 px-6 rounded-xl font-bold gap-2 mt-5 bg-secondary text-secondary-foreground hover:bg-secondary/80 border-2 border-transparent hover:border-border"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <UsersBackgroundIcon />
          </div>
          <CardContent className="p-8">
            <p className="font-bold text-primary-foreground/80 uppercase tracking-wider mb-2 text-sm">Total Kids Today</p>
            <p className="text-6xl font-extrabold">142</p>
            <p className="mt-4 text-sm font-medium flex items-center gap-1 bg-white/20 inline-flex px-3 py-1 rounded-full">
              <TrendingUp size={16} /> +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-foreground">Hourly Attendance</CardTitle>
            <CardDescription className="text-base">Number of kids present per hour for the selected day.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_HISTORICAL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--secondary))' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    fontWeight: 'bold',
                    padding: '12px'
                  }}
                />
                <Bar 
                  dataKey="kids" 
                  fill="hsl(var(--primary))" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                  activeBar={{ fill: 'hsl(var(--primary) / 0.8)' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersBackgroundIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
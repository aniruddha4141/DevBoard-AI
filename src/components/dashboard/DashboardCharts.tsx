"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface ChartsProps {
  ticketsByStatus: { name: string; value: number }[];
  bugsBySeverity: { name: string; value: number }[];
  activityOverTime: { day: string; count: number }[];
}

export function DashboardCharts({
  ticketsByStatus,
  bugsBySeverity,
  activityOverTime,
}: ChartsProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[300px]">
        <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
        <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  // Colors mapping for status and severity
  const STATUS_COLORS = {
    BACKLOG: "hsl(240 5% 64.9%)",
    TODO: "hsl(220 70% 50%)",
    IN_PROGRESS: "hsl(260 70% 50%)",
    REVIEW: "hsl(40 80% 50%)",
    DONE: "hsl(140 70% 40%)",
    CLOSED: "hsl(240 3.7% 25%)",
  };

  const SEVERITY_COLORS = {
    LOW: "hsl(140 70% 40%)",
    MEDIUM: "hsl(40 80% 50%)",
    HIGH: "hsl(25 90% 50%)",
    CRITICAL: "hsl(0 80% 50%)",
  };

  const getStatusColor = (name: string) => {
    return STATUS_COLORS[name as keyof typeof STATUS_COLORS] || "hsl(240 5% 50%)";
  };

  const getSeverityColor = (name: string) => {
    return SEVERITY_COLORS[name as keyof typeof SEVERITY_COLORS] || "hsl(240 5% 50%)";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tickets by Status Pie Chart */}
      <div className="rounded-xl border border-border bg-card/40 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tickets by Status</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Active task distribution in sprint
          </p>
        </div>
        <div className="h-48 w-full flex items-center justify-center mt-3">
          {ticketsByStatus.every((t) => t.value === 0) ? (
            <span className="text-xs text-muted-foreground">No ticket data available</span>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ticketsByStatus.filter((t) => t.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ticketsByStatus
                    .filter((t) => t.value > 0)
                    .map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 10% 4%)",
                    border: "1px solid hsl(240 3.7% 16%)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {ticketsByStatus.map((t) => (
            <div key={t.name} className="flex items-center gap-1.5 text-[10px]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getStatusColor(t.name) }}
              />
              <span className="text-muted-foreground uppercase">{t.name}:</span>
              <span className="font-semibold text-foreground">{t.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bugs by Severity Bar Chart */}
      <div className="rounded-xl border border-border bg-card/40 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Bugs by Severity</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Active issues breakdown
          </p>
        </div>
        <div className="h-48 w-full mt-3">
          {bugsBySeverity.every((b) => b.value === 0) ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No active bugs reported</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bugsBySeverity} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{
                    backgroundColor: "hsl(240 10% 4%)",
                    border: "1px solid hsl(240 3.7% 16%)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {bugsBySeverity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getSeverityColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Weekly Activity Line Chart */}
      <div className="rounded-xl border border-border bg-card/40 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Weekly Team Activity</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Activity and commit log counts
          </p>
        </div>
        <div className="h-48 w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityOverTime} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(240 10% 4%)",
                  border: "1px solid hsl(240 3.7% 16%)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(263.4 70% 50.4%)"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(263.4 70% 50.4%)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

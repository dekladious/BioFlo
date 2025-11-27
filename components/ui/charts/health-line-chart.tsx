"use client";

import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils/cn";

type LineConfig = {
  dataKey: string;
  color?: string;
  name?: string;
  strokeWidth?: number;
  dot?: boolean;
};

export type HealthLineChartProps<T extends Record<string, any>> = {
  data: T[];
  lines: LineConfig[];
  xKey?: keyof T;
  height?: number;
  className?: string;
  yAxisHidden?: boolean;
  showGrid?: boolean;
  valueFormatter?: (value: number) => string;
};

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: TooltipProps<number, string> & { valueFormatter?: (value: number) => string }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-card">
      <p className="mb-1 text-faint">{label}</p>
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-4 text-main">
            <span className="flex items-center gap-2 text-soft">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold">
              {typeof entry.value === "number" && valueFormatter ? valueFormatter(entry.value) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HealthLineChart<T extends Record<string, any>>({
  data,
  lines,
  xKey = "label",
  height = 220,
  className,
  yAxisHidden,
  showGrid = true,
  valueFormatter,
}: HealthLineChartProps<T>) {
  if (!data || data.length === 0 || lines.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[180px] items-center justify-center rounded-3xl border border-[var(--border-dim)] bg-[var(--bg-elevated-ghost)] text-sm text-soft",
          className
        )}
      >
        No data yet
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full", className)} style={{ minHeight: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data}>
          {showGrid && <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />}
          <XAxis
            dataKey={xKey as string}
            stroke="rgba(255,255,255,0.4)"
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <YAxis
            hide={yAxisHidden}
            stroke="rgba(255,255,255,0.4)"
            tickLine={false}
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color || "var(--accent-primary)"}
              strokeWidth={line.strokeWidth ?? 2.2}
              dot={line.dot ? { strokeWidth: 1.5, r: 3 } : false}
              activeDot={{ r: 5 }}
              name={line.name}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}






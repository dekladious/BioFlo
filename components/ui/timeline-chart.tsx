import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils/cn";

type SeriesPoint = { x: string | number | Date; y: number };
type Series = {
  name: string;
  data: SeriesPoint[];
  color?: string;
};

type TimelineChartProps = {
  title?: string;
  primarySeries: Series;
  secondarySeries?: Series;
  yLabel?: string;
  activeRange?: "day" | "week" | "month";
  onRangeChange?: (value: "day" | "week" | "month") => void;
  className?: string;
};

const RANGE_OPTIONS: Array<"day" | "week" | "month"> = ["day", "week", "month"];

export function TimelineChart({
  title,
  primarySeries,
  secondarySeries,
  yLabel,
  activeRange,
  onRangeChange,
  className,
}: TimelineChartProps) {
  const data = primarySeries.data.map((point, idx) => ({
    primary: point.y,
    secondary: secondarySeries?.data[idx]?.y,
    label: formatLabel(point.x),
  }));

  return (
    <div className={cn("rounded-3xl border border-border-subtle bg-surface-alt p-4 shadow-card", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
          {yLabel && <p className="text-xs text-text-soft">{yLabel}</p>}
        </div>
        {onRangeChange && (
          <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-1 py-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => onRangeChange(option)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold capitalize transition",
                  activeRange === option
                    ? "bg-accent-primary/20 text-accent-primary"
                    : "text-text-soft hover:text-text-primary"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--border-subtle)"
              tick={{ fill: "var(--text-soft)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--border-subtle)"
              tick={{ fill: "var(--text-soft)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="primary"
              stroke={primarySeries.color || "#22d3ee"}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              name={primarySeries.name}
            />
            {secondarySeries && (
              <Line
                type="monotone"
                dataKey="secondary"
                stroke={secondarySeries.color || "rgba(148,163,184,0.6)"}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name={secondarySeries.name}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface px-3 py-2 text-xs text-text-primary shadow-card">
      {payload.map((item: any) => (
        <div key={item.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: item.color }}
          />
          <span className="text-text-soft">{item.name}</span>
          <span className="font-semibold">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

function formatLabel(value: SeriesPoint["x"]) {
  if (value instanceof Date) {
    return value.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  if (typeof value === "number") {
    return String(value);
  }
  return value;
}





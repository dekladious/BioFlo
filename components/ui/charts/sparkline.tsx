"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

type SparklineProps<T extends Record<string, any>> = {
  data: T[];
  dataKey: keyof T;
  height?: number;
  stroke?: string;
  fill?: string;
};

export function Sparkline<T extends Record<string, any>>({
  data,
  dataKey,
  height = 48,
  stroke = "var(--accent-secondary)",
  fill = "rgba(91,94,255,0.25)",
}: SparklineProps<T>) {
  if (!data || data.length === 0) {
    return <div className="h-[48px] w-full rounded-full bg-[rgba(148,163,184,0.08)]" />;
  }

  return (
    <div className="h-full w-full" style={{ minHeight: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity={0.7} />
              <stop offset="100%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip cursor={false} content={() => null} />
          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke={stroke}
            strokeWidth={2}
            fill="url(#sparkline-fill)"
            fillOpacity={1}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}






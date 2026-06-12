"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

interface CumulativeProfitItem {
  year: number;
  month: number;
  realizedProfit: number;
  cumulativeProfit: number;
}

interface CumulativeProfitChartProps {
  data: CumulativeProfitItem[];
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString("vi-VN", {
    month: "short",
    year: "2-digit",
  });
}

function formatShortCurrency(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

export function CumulativeProfitChart({ data }: CumulativeProfitChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: formatMonthLabel(item.year, item.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={{ stroke: "#475569" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatShortCurrency}
        />
        <ReferenceLine y={0} stroke="#64748b" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #475569",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
          labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
          formatter={(value, name) => {
            const labels: Record<string, string> = {
              cumulativeProfit: "Lũy kế",
              realizedProfit: "Trong tháng",
            };
            const num = typeof value === "number" ? value : 0;
            const key = String(name);
            return [formatCurrency(num), labels[key] || key];
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulativeProfit"
          name="cumulativeProfit"
          stroke="#34d399"
          strokeWidth={2}
          fill="url(#cumulativeFill)"
          dot={{ fill: "#34d399", r: 3 }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

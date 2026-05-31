"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

interface MonthlyProfitItem {
  year: number;
  month: number;
  t0Profit: number;
  longTermProfit: number;
  totalProfit: number;
}

interface MonthlyProfitChartProps {
  data: MonthlyProfitItem[];
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

export function MonthlyProfitChart({ data }: MonthlyProfitChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    label: formatMonthLabel(item.year, item.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
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
              t0Profit: "Lãi/lỗ T0",
              longTermProfit: "Lãi/lỗ dài hạn",
              totalProfit: "Tổng",
            };
            const num = typeof value === "number" ? value : 0;
            const key = String(name);
            return [formatCurrency(num), labels[key] || key];
          }}
        />
        <Legend
          formatter={(value) => {
            const labels: Record<string, string> = {
              t0Profit: "Lãi/lỗ T0",
              longTermProfit: "Lãi/lỗ dài hạn",
            };
            return labels[value] || value;
          }}
          wrapperStyle={{ color: "#94a3b8", fontSize: 13, paddingTop: 12 }}
        />
        <Line
          type="monotone"
          dataKey="t0Profit"
          name="t0Profit"
          stroke="#eab308"
          strokeWidth={2}
          dot={{ fill: "#eab308", r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="longTermProfit"
          name="longTermProfit"
          stroke="#22d3ee"
          strokeWidth={2}
          dot={{ fill: "#22d3ee", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

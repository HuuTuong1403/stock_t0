"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  PieLabelRenderProps,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/format";

export interface AllocationItem {
  name: string;
  value: number;
}

interface PortfolioAllocationChartProps {
  data: AllocationItem[];
}

const COLORS = [
  "#22d3ee",
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#f87171",
  "#60a5fa",
  "#f472b6",
  "#4ade80",
  "#fb923c",
  "#e879f9",
  "#2dd4bf",
  "#facc15",
];

export function PortfolioAllocationChart({
  data,
}: PortfolioAllocationChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  const chartData = data
    .filter((item) => item.value > 0)
    .map((item) => ({
      ...item,
      share: total > 0 ? (item.value / total) * 100 : 0,
    }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={120}
          paddingAngle={2}
          stroke="#0f172a"
          strokeWidth={2}
          label={(props) => {
            const { name, percent } = props as PieLabelRenderProps & {
              name?: string;
            };
            return `${name} ${(((percent as number) ?? 0) * 100).toFixed(1)}%`;
          }}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #475569",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
          labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
          formatter={(value, _name, item) => {
            const num = typeof value === "number" ? value : 0;
            const share = (item?.payload?.share as number) ?? 0;
            return [`${formatCurrency(num)} (${share.toFixed(1)}%)`, "Giá trị"];
          }}
        />
        <Legend
          wrapperStyle={{ color: "#94a3b8", fontSize: 13, paddingTop: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

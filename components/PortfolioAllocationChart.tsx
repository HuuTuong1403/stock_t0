"use client";

import { useMemo, useState } from "react";
import {
  Cell,
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

function renderSliceLabel(props: PieLabelRenderProps & { name?: string }) {
  const percent = ((props.percent as number) ?? 0) * 100;
  if (percent < 3) return null;
  return `${props.name} ${percent.toFixed(1)}%`;
}

export function PortfolioAllocationChart({
  data,
}: PortfolioAllocationChartProps) {
  const [hiddenNames, setHiddenNames] = useState<Set<string>>(() => new Set());

  const chartData = useMemo(() => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    return data
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        share: total > 0 ? (item.value / total) * 100 : 0,
      }));
  }, [data]);

  const colorByName = useMemo(
    () =>
      new Map(
        chartData.map((item, index) => [
          item.name,
          COLORS[index % COLORS.length],
        ]),
      ),
    [chartData],
  );

  const visibleData = useMemo(
    () => chartData.filter((item) => !hiddenNames.has(item.name)),
    [chartData, hiddenNames],
  );

  const toggleLegendItem = (name: string) => {
    setHiddenNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (chartData.length - next.size > 1) {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart margin={{ top: 28, right: 28, bottom: 8, left: 28 }}>
          <Pie
            data={visibleData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={visibleData.length > 1 ? 2 : 0}
            stroke="#0f172a"
            strokeWidth={2}
            label={visibleData.length > 0 ? renderSliceLabel : false}
            labelLine={{ stroke: "#64748b", strokeWidth: 1 }}
          >
            {visibleData.map((entry) => (
              <Cell
                key={entry.name}
                fill={colorByName.get(entry.name) ?? COLORS[0]}
              />
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
              return [
                `${formatCurrency(num)} (${share.toFixed(1)}%)`,
                "Giá trị",
              ];
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-2">
        {chartData.map((item) => {
          const hidden = hiddenNames.has(item.name);
          const color = colorByName.get(item.name) ?? COLORS[0];
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => toggleLegendItem(item.name)}
              className="inline-flex items-center gap-1.5 text-[13px] cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                color: hidden ? "#64748b" : "#94a3b8",
                textDecoration: hidden ? "line-through" : "none",
              }}
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: color, opacity: hidden ? 0.35 : 1 }}
              />
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

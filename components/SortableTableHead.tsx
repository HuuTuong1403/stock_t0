"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/hooks/use-table-sort";

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  activeKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
}

export function SortableTableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
  className,
}: SortableTableHeadProps) {
  const isActive = activeKey === sortKey && direction !== null;

  return (
    <TableHead className={cn(className, align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
          align === "right" && "ml-auto",
          isActive ? "text-emerald-400" : "text-inherit"
        )}
      >
        <span>{label}</span>
        {isActive && direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5 shrink-0" />
        ) : isActive && direction === "desc" ? (
          <ArrowDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

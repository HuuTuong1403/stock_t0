"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isTradingHours } from "@/lib/utils/trading-hours";

interface PageRefreshBarProps {
  lastUpdated: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
  className?: string;
}

function formatLastUpdated(date: Date) {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function PageRefreshBar({
  lastUpdated,
  refreshing,
  onRefresh,
  className,
}: PageRefreshBarProps) {
  const trading = isTradingHours();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-400",
        className
      )}
    >
      {lastUpdated && (
        <span>Cập nhật lúc {formatLastUpdated(lastUpdated)}</span>
      )}
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border",
          trading
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-slate-600 bg-slate-800/50 text-slate-500"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            trading ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
          )}
        />
        {trading ? "Đang giao dịch" : "Ngoài giờ"}
      </span>
      {trading && (
        <span className="text-xs text-slate-500 hidden sm:inline">
          Tự làm mới mỗi 60s
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white h-8"
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-spin")}
        />
        Làm mới
      </Button>
    </div>
  );
}

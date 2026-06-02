"use client";

import { useEffect } from "react";

import { isTradingHours } from "@/lib/utils/trading-hours";

interface UseAutoRefreshOptions {
  intervalMs?: number;
  enabled?: boolean;
  onlyDuringTradingHours?: boolean;
}

export function useAutoRefresh(
  onRefresh: () => void | Promise<void>,
  {
    intervalMs = 60_000,
    enabled = true,
    onlyDuringTradingHours = true,
  }: UseAutoRefreshOptions = {}
) {
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (onlyDuringTradingHours && !isTradingHours()) return;
      void onRefresh();
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [onRefresh, intervalMs, enabled, onlyDuringTradingHours]);
}

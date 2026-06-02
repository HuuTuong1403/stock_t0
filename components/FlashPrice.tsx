"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface FlashPriceProps {
  value: number;
  children: React.ReactNode;
  className?: string;
  showArrow?: boolean;
}

export function FlashPrice({
  value,
  children,
  className,
  showArrow = true,
}: FlashPriceProps) {
  const prevRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== null && value > 0 && prev > 0 && prev !== value) {
      setFlash(value > prev ? "up" : "down");
      const timer = setTimeout(() => setFlash(null), 1500);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-0.5 rounded px-1 transition-colors duration-300",
        flash === "up" && "flash-up",
        flash === "down" && "flash-down",
        className
      )}
    >
      {showArrow && flash === "up" && (
        <ArrowUpRight className="h-3 w-3 text-emerald-400 shrink-0" />
      )}
      {showArrow && flash === "down" && (
        <ArrowDownRight className="h-3 w-3 text-red-400 shrink-0" />
      )}
      {children}
    </span>
  );
}

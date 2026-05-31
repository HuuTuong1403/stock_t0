"use client";

import { TableBody } from "@/components/ui/table";
import { useFlipRows } from "@/lib/hooks/use-flip-rows";
import { cn } from "@/lib/utils";

interface FlipTableBodyProps {
  flipKey: string;
  children: React.ReactNode;
  className?: string;
}

export function FlipTableBody({
  flipKey,
  children,
  className,
}: FlipTableBodyProps) {
  const ref = useFlipRows(flipKey);

  return (
    <TableBody ref={ref} className={className}>
      {children}
    </TableBody>
  );
}

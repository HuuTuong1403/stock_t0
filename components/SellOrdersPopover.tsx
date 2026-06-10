"use client";

import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SellOrderInfo {
  tradeDate: string;
  type: "T0" | "LONG_TERM";
  price: number;
  quantity: number;
  profit: number;
}

interface SellOrdersPopoverProps {
  stockCode: string;
  orders?: SellOrderInfo[];
}

export function SellOrdersPopover({ stockCode, orders }: SellOrdersPopoverProps) {
  const [open, setOpen] = useState(false);
  const sellOrders = orders ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="font-mono font-semibold text-emerald-400 cursor-pointer underline decoration-dotted underline-offset-4 decoration-slate-500"
        >
          {stockCode}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-96 bg-slate-900 border-slate-700 p-0 overflow-hidden"
      >
        <div className="px-4 py-2.5 border-b border-slate-700 bg-slate-800/50">
          <p className="text-sm font-semibold text-white">
            Lệnh bán -{" "}
            <span className="font-mono text-emerald-400">{stockCode}</span>
          </p>
        </div>

        {sellOrders.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            Chưa có lệnh bán
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-400">
                  <th className="px-3 py-2 text-left font-medium">Ngày</th>
                  <th className="px-3 py-2 text-left font-medium">Loại</th>
                  <th className="px-3 py-2 text-right font-medium">Giá</th>
                  <th className="px-3 py-2 text-right font-medium">KL</th>
                  <th className="px-3 py-2 text-right font-medium">Lãi/lỗ</th>
                </tr>
              </thead>
              <tbody>
                {sellOrders.map((order, index) => (
                  <tr
                    key={index}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                      {formatDate(order.tradeDate)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
                          order.type === "T0"
                            ? "bg-yellow-500/15 text-yellow-400"
                            : "bg-cyan-500/15 text-cyan-400"
                        )}
                      >
                        {order.type === "T0" ? "T0" : "Dài hạn"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-200">
                      {formatCurrency(order.price)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-200">
                      {formatCurrency(order.quantity)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-semibold",
                        order.profit >= 0 ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {order.profit >= 0 ? "+" : ""}
                      {formatCurrency(order.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

function formatRangeLabel(range: DateRange | undefined) {
  if (!range?.from) return null;
  const fromStr = format(range.from, "dd/MM/yyyy", { locale: vi });
  if (!range.to) return `${fromStr} — ...`;
  return `${fromStr} — ${format(range.to, "dd/MM/yyyy", { locale: vi })}`;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = "Chọn khoảng ngày",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const label = formatRangeLabel(value);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white",
              !label && "text-slate-500"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{label ?? placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-slate-900 border-slate-700"
          align="end"
        >
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            defaultMonth={value?.from}
            locale={vi}
            className="rounded-md"
          />
        </PopoverContent>
      </Popover>
      {value?.from && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-slate-400 hover:text-white hover:bg-slate-700"
          onClick={() => onChange(undefined)}
          aria-label="Xóa bộ lọc ngày"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

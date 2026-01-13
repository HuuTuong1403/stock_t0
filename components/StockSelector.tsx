"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InfiniteSelect,
  InfiniteSelectOption,
} from "@/components/ui/infinite-select";
import { getStocks } from "@/lib/services/stock";

interface Stock {
  code: string;
  name: string;
  industry: string;
  marketPrice?: number;
}

interface StockSelectorProps {
  onSelect?: (stock: Stock | null) => void;
  value?: string; // stock code
  className?: string;
  placeholder?: string;
}

export function StockSelector({
  onSelect,
  value,
  className,
  placeholder = "Chọn cổ phiếu...",
}: StockSelectorProps) {
  const [stocks, setStocks] = useState<InfiniteSelectOption<Stock>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const valueLoadedRef = useRef<string>("");
  const onSelectRef = useRef(onSelect);

  // Update ref when onSelect changes
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Load selected stock when value changes (for edit mode)
  useEffect(() => {
    if (value && valueLoadedRef.current !== value) {
      // Fetch the selected stock if not in current options
      const fetchSelectedStock = async () => {
        try {
          // Check if already exists using functional update
          setStocks((prev) => {
            const exists = prev.find((s) => s.value === value);
            if (exists) {
              valueLoadedRef.current = value;
              // Schedule onSelect call after render to avoid setState during render
              setTimeout(() => {
                onSelectRef.current?.(exists.data);
              }, 0);
              return prev;
            }
            return prev;
          });

          // Search for exact match
          const res = await getStocks({
            page: 1,
            limit: 100,
            search: value.toUpperCase(),
          });

          if (res && typeof res === "object" && "data" in res) {
            const stockData = res.data as Stock[];
            const foundStock = stockData.find(
              (s) => s.code === value.toUpperCase()
            );

            if (foundStock) {
              const stockOption: InfiniteSelectOption<Stock> = {
                value: foundStock.code,
                label: `${foundStock.code} - ${foundStock.name}`,
                subtitle: foundStock.industry,
                data: foundStock,
              };

              setStocks((prev) => {
                // Only add if not already exists
                if (!prev.find((s) => s.value === value)) {
                  valueLoadedRef.current = value;
                  return [stockOption, ...prev];
                }
                return prev;
              });

              // Schedule onSelect call after render to avoid setState during render
              setTimeout(() => {
                onSelectRef.current?.(foundStock);
              }, 0);
            }
          }
        } catch (error) {
          console.error("Error fetching selected stock:", error);
        }
      };

      fetchSelectedStock();
    } else if (!value) {
      valueLoadedRef.current = "";
    }
  }, [value, onSelect]);

  // Handle load page for infinite scroll
  const handleLoadPage = useCallback(async (page: number, search: string) => {
    const isAppend = page > 1;

    try {
      if (!isAppend) {
        setLoading(true);
        setStocks([]);
      } else {
        setLoadingMore(true);
      }

      const res = await getStocks({
        page,
        limit: 10,
        search,
      });

      if (res && typeof res === "object" && "data" in res) {
        const newStocks = (res.data as Stock[]).map((stock) => ({
          value: stock.code,
          label: `${stock.code} - ${stock.name}`,
          subtitle: stock.industry,
          data: stock,
        })) as InfiniteSelectOption<Stock>[];

        const pagination = res.pagination as {
          page: number;
          totalPages: number;
        };

        if (isAppend) {
          setStocks((prev) => [...prev, ...newStocks]);
        } else {
          setStocks(newStocks);
        }

        setHasMore(pagination.page < pagination.totalPages);

        return {
          data: newStocks,
          hasMore: pagination.page < pagination.totalPages,
        };
      }

      return { data: [], hasMore: false };
    } catch (error) {
      console.error("Error fetching stocks:", error);
      return { data: [], hasMore: false };
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  return (
    <InfiniteSelect<Stock>
      options={stocks}
      value={value}
      onSelect={(option) => onSelect?.(option?.data || null)}
      onLoadPage={handleLoadPage}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      placeholder={placeholder}
      searchPlaceholder="Tìm kiếm cổ phiếu..."
      className={className}
      emptyMessage="Không tìm thấy cổ phiếu"
      renderOption={(option, selected) => (
        <>
          <Check
            className={cn(
              "mr-2 h-4 w-4",
              selected ? "opacity-100" : "opacity-0"
            )}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-emerald-400">
                {option.data.code}
              </span>
              <span className="text-slate-300 text-sm">{option.data.name}</span>
            </div>
            {option.subtitle && (
              <div className="text-xs text-slate-500 mt-0.5">
                {option.subtitle}
              </div>
            )}
          </div>
        </>
      )}
      renderValue={(option) =>
        option ? `${option.data.code} - ${option.data.name}` : placeholder
      }
    />
  );
}

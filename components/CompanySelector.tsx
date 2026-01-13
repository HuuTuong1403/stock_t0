"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InfiniteSelect,
  InfiniteSelectOption,
} from "@/components/ui/infinite-select";
import axiosClient from "@/lib/axiosClient";

interface StockCompany {
  _id: string;
  name: string;
  buyFeeRate: number;
  sellFeeRate: number;
  taxRate: number;
  isDefault?: boolean;
}

interface CompanySelectorProps {
  onSelect?: (company: StockCompany | null) => void;
  value?: string; // company _id
  className?: string;
  placeholder?: string;
}

export function CompanySelector({
  onSelect,
  value,
  className,
  placeholder = "Chọn công ty chứng khoán...",
}: CompanySelectorProps) {
  const [companies, setCompanies] = useState<
    InfiniteSelectOption<StockCompany>[]
  >([]);
  const [allCompanies, setAllCompanies] = useState<StockCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Fetch all companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data } = await axiosClient.get("/stock-companies");
        if (data && Array.isArray(data)) {
          setAllCompanies(data);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };
    fetchCompanies();
  }, []);

  // Load selected company when value changes (for edit mode)
  const valueLoadedRef = useRef<string>("");
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (value && allCompanies.length > 0 && valueLoadedRef.current !== value) {
      const foundCompany = allCompanies.find((c) => c._id === value);
      if (foundCompany) {
        const companyOption: InfiniteSelectOption<StockCompany> = {
          value: foundCompany._id,
          label: foundCompany.name,
          subtitle: foundCompany.isDefault ? "(Mặc định)" : undefined,
          data: foundCompany,
        };

        setCompanies((prev) => {
          // Check if already exists
          const exists = prev.find((c) => c.value === value);
          if (exists) {
            valueLoadedRef.current = value;
            return prev;
          }

          valueLoadedRef.current = value;
          return [companyOption, ...prev];
        });

        // Schedule onSelect call after render to avoid setState during render
        setTimeout(() => {
          onSelectRef.current?.(foundCompany);
        }, 0);
      }
    } else if (!value) {
      valueLoadedRef.current = "";
    }
  }, [value, allCompanies, onSelect]);

  // Handle load page for infinite scroll (filter by search)
  const handleLoadPage = useCallback(
    async (page: number, search: string) => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        // Filter companies by search term
        let filteredCompanies = allCompanies;
        if (search) {
          const searchLower = search.toLowerCase();
          filteredCompanies = allCompanies.filter((company: StockCompany) =>
            company.name.toLowerCase().includes(searchLower)
          );
        }

        // Convert to InfiniteSelectOption format
        const companyOptions = filteredCompanies.map(
          (company: StockCompany) => ({
            value: company._id,
            label: company.name,
            subtitle: company.isDefault ? "(Mặc định)" : undefined,
            data: company,
          })
        ) as InfiniteSelectOption<StockCompany>[];

        if (page === 1) {
          setCompanies(companyOptions);
        } else {
          // For infinite scroll, append if needed (though API doesn't paginate)
          setCompanies((prev) => [...prev, ...companyOptions]);
        }
        setHasMore(false); // API không hỗ trợ pagination

        return { data: companyOptions, hasMore: false };
      } catch (error) {
        console.error("Error loading companies:", error);
        return { data: [], hasMore: false };
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [allCompanies]
  );

  return (
    <InfiniteSelect<StockCompany>
      options={companies}
      value={value}
      onSelect={(option) => onSelect?.(option?.data || null)}
      onLoadPage={handleLoadPage}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      placeholder={placeholder}
      searchPlaceholder="Tìm kiếm công ty chứng khoán..."
      className={className}
      emptyMessage="Không tìm thấy công ty chứng khoán"
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
              <span className="text-slate-300 text-sm font-medium">
                {option.data.name}
              </span>
              {option.data.isDefault && (
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                  Mặc định
                </span>
              )}
            </div>
            {option.subtitle && (
              <div className="text-xs text-slate-500 mt-0.5">
                {option.subtitle}
              </div>
            )}
          </div>
        </>
      )}
      renderValue={(option) => (option ? option.data.name : placeholder)}
    />
  );
}

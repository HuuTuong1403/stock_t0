"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";

export interface InfiniteSelectOption<T = unknown> {
  value: string;
  label: string;
  data: T;
  subtitle?: string;
}

interface InfiniteSelectProps<T = unknown> {
  options: InfiniteSelectOption<T>[];
  value?: string;
  onSelect?: (option: InfiniteSelectOption<T> | null) => void;
  onLoadPage?: (
    page: number,
    search: string,
    filters?: Record<string, string>
  ) => Promise<{
    data: InfiniteSelectOption<T>[];
    hasMore: boolean;
  }>;
  onFilterChange?: (filters: Record<string, string>) => void;
  filters?: Record<string, string>;
  filterComponent?: ReactNode;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  emptyMessage?: string;
  renderOption?: (
    option: InfiniteSelectOption<T>,
    selected: boolean
  ) => ReactNode;
  renderValue?: (option: InfiniteSelectOption<T> | undefined) => ReactNode;
}

export function InfiniteSelect<T = unknown>({
  options,
  value,
  onSelect,
  onLoadPage,
  onFilterChange,
  filters = {},
  filterComponent,
  loading = false,
  loadingMore = false,
  hasMore = false,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  className,
  emptyMessage = "Không tìm thấy",
  renderOption,
  renderValue,
}: InfiniteSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const onLoadPageRef = useRef(onLoadPage);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!open) {
      // Reset search terms when closing
      setSearchTerm("");
      setDebouncedSearchTerm("");
    }
  }, [open]);

  // Update ref when onLoadPage changes
  useEffect(() => {
    onLoadPageRef.current = onLoadPage;
  }, [onLoadPage]);

  // Store filters in ref to avoid dependency issues
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Reset page when search changes (only when dropdown opens or search term changes)
  const prevDebouncedSearchTermRef = useRef<string>("");
  const prevOpenRef = useRef<boolean>(false);

  useEffect(() => {
    // Only load if dropdown is open AND (opening OR search term changed)
    const searchChanged =
      prevDebouncedSearchTermRef.current !== debouncedSearchTerm;
    const justOpened = !prevOpenRef.current && open;

    if (onLoadPageRef.current && open && (searchChanged || justOpened)) {
      setCurrentPage(1);
      onLoadPageRef
        .current(1, debouncedSearchTerm, filtersRef.current)
        .catch((error) => {
          console.error("Error loading page:", error);
        });
    }

    prevDebouncedSearchTermRef.current = debouncedSearchTerm;
    prevOpenRef.current = open;
  }, [open, debouncedSearchTerm]);

  // Infinite scroll observer
  useEffect(() => {
    if (!onLoadPageRef.current || !hasMore || loadingMore || loading || !open)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          onLoadPageRef.current?.(
            nextPage,
            debouncedSearchTerm,
            filtersRef.current
          );
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, debouncedSearchTerm, currentPage, open]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    const option = options.find((opt) => opt.value === optionValue);
    onSelect?.(option || null);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      {/* Filter component - hiển thị ở đây nếu có */}
      {filterComponent && <div className="mb-2">{filterComponent}</div>}

      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
          onClick={() => setOpen(!open)}
        >
          {renderValue
            ? renderValue(selectedOption)
            : selectedOption
            ? selectedOption.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg">
            <div className="p-2 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 bg-slate-900 border-slate-600 text-white"
                  autoFocus
                />
              </div>
            </div>

            {/* Filter component inside dropdown */}
            {filterComponent && (
              <div className="p-2 border-b border-slate-700 bg-slate-900/50 sticky top-0 z-10">
                {filterComponent}
              </div>
            )}

            <div
              ref={scrollContainerRef}
              className="max-h-[300px] overflow-y-auto"
            >
              {loading && options.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : options.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  {emptyMessage}
                </div>
              ) : (
                <>
                  {options.map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center px-3 py-2 hover:bg-slate-700",
                        value === option.value && "bg-slate-700"
                      )}
                      onClick={() => handleSelect(option.value)}
                    >
                      {renderOption ? (
                        renderOption(option, value === option.value)
                      ) : (
                        <>
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === option.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="text-slate-300">{option.label}</div>
                            {option.subtitle && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {option.subtitle}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Loading more indicator */}
                  {loadingMore && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                  )}

                  {/* Observer target for infinite scroll */}
                  {hasMore && <div ref={observerTarget} className="h-1" />}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

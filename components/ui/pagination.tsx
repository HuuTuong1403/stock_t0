import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const pages = [];
  const maxVisiblePages = 5;

  // Calculate which pages to show
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        Trước
      </Button>

      {startPage > 1 && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            1
          </Button>
          {startPage > 2 && <span className="text-slate-500">...</span>}
        </>
      )}

      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
          className={
            currentPage === page
              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
              : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
          }
        >
          {page}
        </Button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="text-slate-500">...</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {totalPages}
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
      >
        Sau
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

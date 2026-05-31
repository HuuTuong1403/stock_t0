"use client";

import { useCallback, useState } from "react";

export type SortDirection = "asc" | "desc" | null;

export function compareSortValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  const strA = String(a);
  const strB = String(b);
  const dateA = Date.parse(strA);
  const dateB = Date.parse(strB);

  if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
    return dateA - dateB;
  }

  return strA.localeCompare(strB, "vi", { numeric: true, sensitivity: "base" });
}

export function sortTableData<T>(
  data: T[],
  sortKey: string | null,
  sortDirection: SortDirection,
  getValue: (item: T, key: string) => unknown
): T[] {
  if (!sortKey || !sortDirection) return data;

  const sorted = [...data].sort((a, b) => {
    const cmp = compareSortValues(getValue(a, sortKey), getValue(b, sortKey));
    return sortDirection === "asc" ? cmp : -cmp;
  });

  return sorted;
}

export function useTableSort() {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortVersion, setSortVersion] = useState(0);

  const toggleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDirection("asc");
        setSortVersion((v) => v + 1);
        return;
      }

      if (sortDirection === "asc") {
        setSortDirection("desc");
        setSortVersion((v) => v + 1);
        return;
      }

      if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
        setSortVersion((v) => v + 1);
      }
    },
    [sortKey, sortDirection]
  );

  const sortData = useCallback(
    <T,>(data: T[], getValue: (item: T, key: string) => unknown) =>
      sortTableData(data, sortKey, sortDirection, getValue),
    [sortKey, sortDirection]
  );

  const flipKey = `${sortKey ?? "none"}-${sortDirection ?? "none"}-${sortVersion}`;

  return {
    sortKey,
    sortDirection,
    flipKey,
    toggleSort,
    sortData,
  };
}

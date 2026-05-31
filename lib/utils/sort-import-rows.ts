import * as XLSX from "xlsx";

export type ImportRow = {
  row: Record<string, unknown>;
  excelRow: number;
};

export function parseImportTradeDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }

  const date = new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
}

export function sortImportRowsByTradeDate(
  data: Record<string, unknown>[],
  compareSameDate?: (a: ImportRow, b: ImportRow) => number
): ImportRow[] {
  return data
    .map((row, index) => ({ row, excelRow: index + 2 }))
    .sort((a, b) => {
      const dateA = parseImportTradeDate(a.row["Ngày giao dịch"]);
      const dateB = parseImportTradeDate(b.row["Ngày giao dịch"]);
      const timeA = dateA?.getTime() ?? Number.POSITIVE_INFINITY;
      const timeB = dateB?.getTime() ?? Number.POSITIVE_INFINITY;

      if (timeA !== timeB) return timeA - timeB;

      if (compareSameDate) {
        const sameDateCompare = compareSameDate(a, b);
        if (sameDateCompare !== 0) return sameDateCompare;
      }

      return a.excelRow - b.excelRow;
    });
}

export function isBuyOrderType(value: unknown): boolean {
  const typeStr = String(value || "")
    .toUpperCase()
    .trim();
  return typeStr === "BUY" || typeStr === "MUA";
}

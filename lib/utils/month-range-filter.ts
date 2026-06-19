import { endOfMonth, startOfMonth } from "date-fns";

export type MonthPoint = { year: number; month: number };

export function monthToDate({ year, month }: MonthPoint): Date {
  return startOfMonth(new Date(year, month - 1));
}

export function isMonthInRange(
  point: MonthPoint,
  from?: Date,
  to?: Date
): boolean {
  if (!from && !to) return true;

  const monthStart = startOfMonth(monthToDate(point));
  const monthEnd = endOfMonth(monthToDate(point));

  if (from && to) {
    return monthStart <= to && monthEnd >= from;
  }
  if (from) return monthEnd >= from;
  if (to) return monthStart <= to;
  return true;
}

export function filterByMonthRange<T extends MonthPoint>(
  data: T[],
  from?: Date,
  to?: Date
): T[] {
  if (!from && !to) return data;
  return data.filter((item) => isMonthInRange(item, from, to));
}

export function recalculateCumulative<
  T extends MonthPoint & { realizedProfit: number },
>(data: T[]): Array<T & { cumulativeProfit: number }> {
  let running = 0;
  return data.map((item) => {
    running += item.realizedProfit;
    return { ...item, cumulativeProfit: running };
  });
}

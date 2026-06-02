export function buildT0ExportParams(
  filterStock: string,
  filterStartDate: string,
  filterEndDate: string
): Record<string, string> {
  const params: Record<string, string> = {};
  const [stockCode, companyId] = filterStock.split("|");
  if (stockCode) params.stockCode = stockCode;
  if (companyId) params.companyId = companyId;
  if (filterStartDate) params.startDate = filterStartDate;
  if (filterEndDate) params.endDate = filterEndDate;
  return params;
}

export function buildLongTermExportParams(
  filterStock: string,
  filterType: string,
  filterStartDate: string,
  filterEndDate: string
): Record<string, string> {
  const params: Record<string, string> = {};
  const [stockCode, companyId] = filterStock.split("|");
  if (stockCode) params.stockCode = stockCode;
  if (companyId) params.companyId = companyId;
  if (filterType && filterType !== "all") params.type = filterType;
  if (filterStartDate) params.startDate = filterStartDate;
  if (filterEndDate) params.endDate = filterEndDate;
  return params;
}

export function buildDividendExportParams(
  filterStock: string,
  filterType: string
): Record<string, string> {
  const params: Record<string, string> = {};
  if (filterStock && filterStock !== "all") params.stockCode = filterStock;
  if (filterType && filterType !== "all") params.type = filterType;
  return params;
}

export function buildStockExportParams(
  search: string
): Record<string, string> {
  const params: Record<string, string> = {};
  if (search.trim()) params.search = search.trim();
  return params;
}

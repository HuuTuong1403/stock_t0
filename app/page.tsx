"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard,
  Building2,
  Zap,
  TrendingUp,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";
import { MonthlyProfitChart } from "@/components/MonthlyProfitChart";
import { PortfolioAllocationChart } from "@/components/PortfolioAllocationChart";
import { SortableTableHead } from "@/components/SortableTableHead";
import { FlipTableBody } from "@/components/FlipTableBody";
import { FlashPrice } from "@/components/FlashPrice";
import { PageRefreshBar } from "@/components/PageRefreshBar";
import { UpdatePricesButton } from "@/components/UpdatePricesButton";
import {
  SellOrdersPopover,
  type SellOrderInfo,
} from "@/components/SellOrdersPopover";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { sortTableData, useTableSort } from "@/lib/hooks/use-table-sort";
import { useAutoRefresh } from "@/lib/hooks/use-auto-refresh";

interface Stats {
  counts: {
    stocks: number;
    t0Orders: number;
    longTermOrders: number;
    dividends: number;
  };
  t0Summary: {
    totalProfitBeforeFees: number;
    totalProfitAfterFees: number;
    totalBuyValue: number;
    totalSellValue: number;
  };
  longTermSummary: {
    totalProfit: number;
  };
  dividendSummary: Array<{
    _id: string;
    count: number;
  }>;
  longTermPortfolio: Array<{
    stockCode: string;
    company: string;
    companyName: string;
    quantity: number;
    quantitySell: number;
    averageCostBasis: number;
    marketPrice: number;
    currentCostBasis: number;
  }>;
  recentT0Orders: Array<{
    _id: string;
    tradeDate: string;
    stockCode: string;
    quantity: number;
    profitAfterFees: number;
  }>;
  monthlyT0Profit: Array<{
    _id: { year: number; month: number };
    totalProfit: number;
    orderCount: number;
  }>;
  monthlyProfit: Array<{
    year: number;
    month: number;
    t0Profit: number;
    longTermProfit: number;
    totalProfit: number;
  }>;
  t0StatsByStock: Array<{
    stockCode: string;
    company: string;
    companyName: string;
    marketPrice: number;
    orderCount: number;
    totalQuantity: number;
    totalProfitBeforeFees: number;
    totalProfitAfterFees: number;
    totalBuyValue: number;
    totalSellValue: number;
  }>;
  longTermStatsByStock: Array<{
    stockCode: string;
    company: string;
    companyName: string;
    marketPrice: number;
    buyOrders: number;
    sellOrders: number;
    totalBuyQuantity: number;
    totalSellQuantity: number;
    totalBuyValue: number;
    totalSellValue: number;
    totalProfit: number;
  }>;
  dividendStatsByStock: Array<{
    _id: string;
    count: number;
    stockDividends: number;
    cashDividends: number;
    totalValue: number;
  }>;
  combinedStatsByStock: Array<{
    stockCode: string;
    buyQuantity: number;
    sellQuantity: number;
    remainingQuantity: number;
    buyValue: number;
    sellValue: number;
    remainingValue: number;
    t0Profit: number;
    longTermProfit: number;
    totalProfit: number;
  }>;
  sellOrdersByStock: Record<string, SellOrderInfo[]>;
}

const quickLinks = [
  {
    title: "Cổ phiếu",
    href: "/stocks",
    icon: Building2,
    color: "emerald",
    description: "Quản lý danh sách mã cổ phiếu",
  },
  {
    title: "Lệnh T0",
    href: "/t0-orders",
    icon: Zap,
    color: "yellow",
    description: "Giao dịch trong ngày",
  },
  {
    title: "Lệnh dài hạn",
    href: "/long-term-orders",
    icon: TrendingUp,
    color: "cyan",
    description: "Đầu tư dài hạn",
  },
  {
    title: "Cổ tức",
    href: "/dividends",
    icon: Coins,
    color: "amber",
    description: "Quản lý cổ tức",
  },
];

function recordSortValue<T extends object>(item: T, key: string) {
  return (item as Record<string, unknown>)[key];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const recentOrdersSort = useTableSort();
  const combinedSort = useTableSort();
  const portfolioSort = useTableSort();
  const t0StatsSort = useTableSort();
  const longTermStatsSort = useTableSort();
  const dividendStatsSort = useTableSort();

  const fetchStats = useCallback(
    async (opts?: { silent?: boolean; manual?: boolean }) => {
      const silent = opts?.silent ?? false;
      const manual = opts?.manual ?? false;

      if (manual) setRefreshing(true);

      try {
        const { data } = await axiosClient.get("/stats");
        setStats(data);
        setLastUpdated(new Date());
      } catch (error: unknown) {
        console.error("Error fetching stats:", error);
        if (!silent) {
          toast.error(getErrorMessage(error) || "Lỗi khi tải thống kê");
        }
      } finally {
        setLoading(false);
        if (manual) setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStats();
    axiosClient
      .get("/auth/me")
      .then(({ data }) => setIsAdmin(data.user?.type === "admin"))
      .catch(() => setIsAdmin(false));
  }, [fetchStats]);

  useAutoRefresh(() => fetchStats({ silent: true }));

  const getColorClass = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> =
      {
        emerald: {
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/30",
        },
        yellow: {
          bg: "bg-yellow-500/10",
          text: "text-yellow-400",
          border: "border-yellow-500/30",
        },
        cyan: {
          bg: "bg-cyan-500/10",
          text: "text-cyan-400",
          border: "border-cyan-500/30",
        },
        amber: {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/30",
        },
      };
    return colors[color] || colors.emerald;
  };

  const totalProfit =
    (stats?.t0Summary.totalProfitAfterFees || 0) +
    (stats?.longTermSummary.totalProfit || 0);
  const totalProfitLongTermAvg =
    stats?.longTermPortfolio.reduce(
      (acc, stock) =>
        acc + (stock.marketPrice - stock.averageCostBasis) * stock.quantity,
      0,
    ) || 0;
  const totalProfitLongTermCurrent =
    stats?.longTermPortfolio.reduce(
      (acc, stock) =>
        acc + (stock.marketPrice - stock.currentCostBasis) * stock.quantity,
      0,
    ) || 0;

  const combinedTotals = stats?.combinedStatsByStock.reduce(
    (acc, stock) => ({
      buyQuantity: acc.buyQuantity + stock.buyQuantity,
      sellQuantity: acc.sellQuantity + stock.sellQuantity,
      remainingQuantity: acc.remainingQuantity + stock.remainingQuantity,
      buyValue: acc.buyValue + stock.buyValue,
      sellValue: acc.sellValue + stock.sellValue,
      remainingValue: acc.remainingValue + stock.remainingValue,
      t0Profit: acc.t0Profit + stock.t0Profit,
      longTermProfit: acc.longTermProfit + stock.longTermProfit,
      totalProfit: acc.totalProfit + stock.totalProfit,
    }),
    {
      buyQuantity: 0,
      sellQuantity: 0,
      remainingQuantity: 0,
      buyValue: 0,
      sellValue: 0,
      remainingValue: 0,
      t0Profit: 0,
      longTermProfit: 0,
      totalProfit: 0,
    },
  );

  const sortedRecentT0Orders = useMemo(
    () =>
      sortTableData(
        stats?.recentT0Orders ?? [],
        recentOrdersSort.sortKey,
        recentOrdersSort.sortDirection,
        recordSortValue,
      ),
    [
      stats?.recentT0Orders,
      recentOrdersSort.sortKey,
      recentOrdersSort.sortDirection,
    ],
  );

  const sortedCombinedStats = useMemo(
    () =>
      sortTableData(
        stats?.combinedStatsByStock ?? [],
        combinedSort.sortKey,
        combinedSort.sortDirection,
        recordSortValue,
      ),
    [
      stats?.combinedStatsByStock,
      combinedSort.sortKey,
      combinedSort.sortDirection,
    ],
  );

  const portfolioItems = useMemo(
    () =>
      stats?.longTermPortfolio.filter(
        (stock) => stock.quantity - stock.quantitySell > 0,
      ) ?? [],
    [stats?.longTermPortfolio],
  );

  const allocationData = useMemo(() => {
    const valueByStock = new Map<string, number>();
    for (const stock of portfolioItems) {
      const held = stock.quantity - stock.quantitySell;
      const marketValue = held * stock.marketPrice;
      if (marketValue <= 0) continue;
      valueByStock.set(
        stock.stockCode,
        (valueByStock.get(stock.stockCode) ?? 0) + marketValue,
      );
    }
    return Array.from(valueByStock.entries())
      .map(([stockCode, value]) => ({ stockCode, value }))
      .sort((a, b) => b.value - a.value);
  }, [portfolioItems]);

  const sortedPortfolio = useMemo(
    () =>
      sortTableData(
        portfolioItems,
        portfolioSort.sortKey,
        portfolioSort.sortDirection,
        (item, key) => {
          const held = item.quantity - item.quantitySell;
          switch (key) {
            case "stockCode":
              return item.stockCode;
            case "companyName":
              return item.companyName;
            case "heldQuantity":
              return held;
            case "averageCostBasis":
              return item.averageCostBasis;
            case "currentCostBasis":
              return item.currentCostBasis;
            case "marketPrice":
              return item.marketPrice;
            case "profitByAvg":
              return (item.marketPrice - item.averageCostBasis) * held;
            case "averagePercentage":
              return item.averageCostBasis > 0
                ? ((item.marketPrice - item.averageCostBasis) /
                    item.averageCostBasis) *
                    100
                : 0;
            case "profitByCurrent":
              return item.currentCostBasis > 0
                ? (item.marketPrice - item.currentCostBasis) * held
                : 0;
            case "currentPercentage":
              return item.currentCostBasis > 0
                ? ((item.marketPrice - item.currentCostBasis) /
                    item.currentCostBasis) *
                    100
                : 0;
            default:
              return null;
          }
        },
      ),
    [portfolioItems, portfolioSort.sortKey, portfolioSort.sortDirection],
  );

  const sortedT0Stats = useMemo(
    () =>
      sortTableData(
        stats?.t0StatsByStock ?? [],
        t0StatsSort.sortKey,
        t0StatsSort.sortDirection,
        recordSortValue,
      ),
    [stats?.t0StatsByStock, t0StatsSort.sortKey, t0StatsSort.sortDirection],
  );

  const sortedLongTermStats = useMemo(
    () =>
      sortTableData(
        stats?.longTermStatsByStock ?? [],
        longTermStatsSort.sortKey,
        longTermStatsSort.sortDirection,
        recordSortValue,
      ),
    [
      stats?.longTermStatsByStock,
      longTermStatsSort.sortKey,
      longTermStatsSort.sortDirection,
    ],
  );

  const sortedDividendStats = useMemo(
    () =>
      sortTableData(
        stats?.dividendStatsByStock ?? [],
        dividendStatsSort.sortKey,
        dividendStatsSort.sortDirection,
        (item, key) =>
          key === "stockCode" ? item._id : recordSortValue(item, key),
      ),
    [
      stats?.dividendStatsByStock,
      dividendStatsSort.sortKey,
      dividendStatsSort.sortDirection,
    ],
  );

  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl border border-emerald-500/30">
              <LayoutDashboard className="h-8 w-8 text-emerald-400" />
            </div>
            Dashboard
          </h1>
          <p className="text-slate-400 mt-2">
            Tổng quan về hoạt động giao dịch của bạn
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <UpdatePricesButton
              onSuccess={() => fetchStats({ silent: true })}
            />
          )}
          <PageRefreshBar
            lastUpdated={lastUpdated}
            refreshing={refreshing}
            onRefresh={() => fetchStats({ manual: true })}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-linear-to-br from-slate-800/80 to-emerald-900/20 border-emerald-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Cổ phiếu</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats?.counts.stocks || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-lg">
                <Building2 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-slate-800/80 to-yellow-900/20 border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Lệnh T0</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats?.counts.t0Orders || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Zap className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-slate-800/80 to-cyan-900/20 border-cyan-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Lệnh dài hạn</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats?.counts.longTermOrders || 0}
                </p>
              </div>
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-slate-800/80 to-amber-900/20 border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Cổ tức</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats?.counts.dividends || 0}
                </p>
              </div>
              <div className="p-3 bg-amber-500/20 rounded-lg">
                <Coins className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-400 font-normal">
              Lợi nhuận T0
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {(stats?.t0Summary.totalProfitAfterFees || 0) >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-400" />
              )}
              <span
                className={`text-2xl font-bold ${
                  (stats?.t0Summary.totalProfitAfterFees || 0) >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {(stats?.t0Summary.totalProfitAfterFees || 0) >= 0 ? "+" : ""}
                {formatCurrency(stats?.t0Summary.totalProfitAfterFees || 0)}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Sau phí và thuế</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-400 font-normal">
              Lợi nhuận dài hạn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {(stats?.longTermSummary.totalProfit || 0) >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-400" />
              )}
              <span
                className={`text-2xl font-bold ${
                  (stats?.longTermSummary.totalProfit || 0) >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {(stats?.longTermSummary.totalProfit || 0) >= 0 ? "+" : ""}
                {formatCurrency(stats?.longTermSummary.totalProfit || 0)}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Từ các lệnh bán</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-slate-800/50 to-emerald-900/30 border-emerald-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-300 font-normal">
              Tổng lợi nhuận
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {totalProfit >= 0 ? (
                <ArrowUpRight className="h-6 w-6 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-6 w-6 text-red-400" />
              )}
              <span
                className={`text-3xl font-bold ${
                  totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {totalProfit >= 0 ? "+" : ""}
                {formatCurrency(totalProfit)}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">T0 + Dài hạn</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links & Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Links */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Truy cập nhanh</CardTitle>
            <CardDescription className="text-slate-400">
              Các chức năng chính của hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => {
                const colorClasses = getColorClass(link.color);
                return (
                  <Link key={link.href} href={link.href}>
                    <div
                      className={`p-4 rounded-lg border ${colorClasses.border} ${colorClasses.bg} hover:scale-[1.02] transition-all duration-200 cursor-pointer`}
                    >
                      <link.icon
                        className={`h-6 w-6 ${colorClasses.text} mb-2`}
                      />
                      <h3 className="font-semibold text-white">{link.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent T0 Orders */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Lệnh T0 gần đây</CardTitle>
            <CardDescription className="text-slate-400">
              5 giao dịch T0 mới nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentT0Orders && stats.recentT0Orders.length > 0 ? (
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                      <SortableTableHead
                        label="Ngày"
                        sortKey="tradeDate"
                        activeKey={recentOrdersSort.sortKey}
                        direction={recentOrdersSort.sortDirection}
                        onSort={recentOrdersSort.toggleSort}
                        className="text-slate-400"
                      />
                      <SortableTableHead
                        label="Mã CP"
                        sortKey="stockCode"
                        activeKey={recentOrdersSort.sortKey}
                        direction={recentOrdersSort.sortDirection}
                        onSort={recentOrdersSort.toggleSort}
                        className="text-slate-400"
                      />
                      <SortableTableHead
                        label="SL"
                        sortKey="quantity"
                        activeKey={recentOrdersSort.sortKey}
                        direction={recentOrdersSort.sortDirection}
                        onSort={recentOrdersSort.toggleSort}
                        align="right"
                        className="text-slate-400"
                      />
                      <SortableTableHead
                        label="Lợi nhuận"
                        sortKey="profitAfterFees"
                        activeKey={recentOrdersSort.sortKey}
                        direction={recentOrdersSort.sortDirection}
                        onSort={recentOrdersSort.toggleSort}
                        align="right"
                        className="text-slate-400"
                      />
                    </TableRow>
                  </TableHeader>
                  <FlipTableBody flipKey={recentOrdersSort.flipKey}>
                    {sortedRecentT0Orders.map((order) => (
                      <TableRow
                        key={order._id}
                        data-flip-id={order._id}
                        className="border-slate-700 hover:bg-slate-700/30"
                      >
                        <TableCell className="text-slate-300 text-sm">
                          {formatDate(order.tradeDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-yellow-500/50 text-yellow-400 font-mono"
                          >
                            {order.stockCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {formatCurrency(order.quantity)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            order.profitAfterFees >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {order.profitAfterFees >= 0 ? "+" : ""}
                          {formatCurrency(order.profitAfterFees)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </FlipTableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                Chưa có lệnh T0 nào
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Profit Chart */}
      {stats?.monthlyProfit && stats.monthlyProfit.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">
              Lãi/lỗ theo tháng (T0 + Dài hạn)
            </CardTitle>
            <CardDescription className="text-slate-400">
              6 tháng gần nhất — vàng: T0, xanh dương: dài hạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyProfitChart data={stats.monthlyProfit} />
          </CardContent>
        </Card>
      )}

      {/* Combined Stats by Stock */}
      {stats?.combinedStatsByStock && stats.combinedStatsByStock.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Tổng hợp lãi/lỗ theo cổ phiếu
            </CardTitle>
            <CardDescription className="text-slate-400">
              Gộp lệnh T0 và dài hạn theo từng mã cổ phiếu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-700 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                    <SortableTableHead
                      label="Mã CP"
                      sortKey="stockCode"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="SL mua"
                      sortKey="buyQuantity"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="SL bán"
                      sortKey="sellQuantity"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="SL còn lại"
                      sortKey="remainingQuantity"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Giá trị mua"
                      sortKey="buyValue"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Giá trị bán"
                      sortKey="sellValue"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Giá trị còn lại"
                      sortKey="remainingValue"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Lãi/lỗ T0"
                      sortKey="t0Profit"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Lãi/lỗ dài hạn"
                      sortKey="longTermProfit"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Tổng lãi/lỗ"
                      sortKey="totalProfit"
                      activeKey={combinedSort.sortKey}
                      direction={combinedSort.sortDirection}
                      onSort={combinedSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                  </TableRow>
                </TableHeader>
                <FlipTableBody flipKey={combinedSort.flipKey}>
                  {sortedCombinedStats.map((stock) => (
                    <TableRow
                      key={stock.stockCode}
                      data-flip-id={stock.stockCode}
                      className="border-slate-700 hover:bg-slate-700/30"
                    >
                      <TableCell>
                        <SellOrdersPopover
                          stockCode={stock.stockCode}
                          orders={stats?.sellOrdersByStock?.[stock.stockCode]}
                        />
                      </TableCell>
                      <TableCell className="text-right text-slate-200">
                        {formatCurrency(stock.buyQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-slate-200">
                        {formatCurrency(stock.sellQuantity)}
                      </TableCell>
                      <TableCell className="text-right text-slate-200">
                        {stock.remainingQuantity > 0
                          ? formatCurrency(stock.remainingQuantity)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right text-red-400">
                        {formatCurrency(stock.buyValue)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-400">
                        {formatCurrency(stock.sellValue)}
                      </TableCell>
                      <TableCell className="text-right text-blue-400">
                        {stock.remainingValue > 0
                          ? formatCurrency(stock.remainingValue)
                          : "-"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          stock.t0Profit >= 0
                            ? "text-yellow-400"
                            : "text-red-400",
                        )}
                      >
                        {stock.t0Profit >= 0 ? "+" : ""}
                        {formatCurrency(stock.t0Profit)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          stock.longTermProfit >= 0
                            ? "text-cyan-400"
                            : "text-red-400",
                        )}
                      >
                        {stock.longTermProfit >= 0 ? "+" : ""}
                        {formatCurrency(stock.longTermProfit)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          stock.totalProfit >= 0
                            ? "text-emerald-400"
                            : "text-red-400",
                        )}
                      >
                        {stock.totalProfit >= 0 ? "+" : ""}
                        {formatCurrency(stock.totalProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </FlipTableBody>
                <TableBody>
                  <TableRow className="border-slate-700 bg-slate-900/30 hover:bg-slate-900/30">
                    <TableCell
                      colSpan={1}
                      className="text-right font-bold text-slate-300"
                    >
                      Tổng cộng
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-200">
                      {formatCurrency(combinedTotals?.buyQuantity || 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-200">
                      {formatCurrency(combinedTotals?.sellQuantity || 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-200">
                      {(combinedTotals?.remainingQuantity || 0) > 0
                        ? formatCurrency(combinedTotals?.remainingQuantity || 0)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-400">
                      {formatCurrency(combinedTotals?.buyValue || 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-400">
                      {formatCurrency(combinedTotals?.sellValue || 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-400">
                      {(combinedTotals?.remainingValue || 0) > 0
                        ? formatCurrency(combinedTotals?.remainingValue || 0)
                        : "-"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold",
                        (combinedTotals?.t0Profit || 0) >= 0
                          ? "text-yellow-400"
                          : "text-red-400",
                      )}
                    >
                      {formatCurrency(combinedTotals?.t0Profit || 0)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold",
                        (combinedTotals?.longTermProfit || 0) >= 0
                          ? "text-cyan-400"
                          : "text-red-400",
                      )}
                    >
                      {formatCurrency(combinedTotals?.longTermProfit || 0)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold",
                        (combinedTotals?.totalProfit || 0) >= 0
                          ? "text-emerald-400"
                          : "text-red-400",
                      )}
                    >
                      {formatCurrency(combinedTotals?.totalProfit || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Allocation Pie Chart */}
      {allocationData.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan-400" />
              Tỷ trọng danh mục
            </CardTitle>
            <CardDescription className="text-slate-400">
              Tỷ trọng theo giá trị thị trường của cổ phiếu đang nắm giữ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioAllocationChart data={allocationData} />
          </CardContent>
        </Card>
      )}

      {/* Long-term Portfolio */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            Danh mục dài hạn
          </CardTitle>
          <CardDescription className="text-slate-400">
            Cổ phiếu đang nắm giữ với lãi/lỗ hiện tại
          </CardDescription>
        </CardHeader>
        <CardContent>
          {portfolioItems.length > 0 ? (
            <div className="rounded-lg border border-slate-700 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                    <SortableTableHead
                      label="Mã CP"
                      sortKey="stockCode"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Công ty"
                      sortKey="companyName"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Số lượng"
                      sortKey="heldQuantity"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Giá vốn TB"
                      sortKey="averageCostBasis"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Giá vốn HT"
                      sortKey="currentCostBasis"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Giá TT"
                      sortKey="marketPrice"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Lãi/Lỗ (TB)"
                      sortKey="profitByAvg"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="% thay đổi (TB)"
                      sortKey="averagePercentage"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="Lãi/Lỗ (HT)"
                      sortKey="profitByCurrent"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                    <SortableTableHead
                      label="% thay đổi (HT)"
                      sortKey="currentPercentage"
                      activeKey={portfolioSort.sortKey}
                      direction={portfolioSort.sortDirection}
                      onSort={portfolioSort.toggleSort}
                      align="right"
                      className="text-slate-300 font-semibold"
                    />
                  </TableRow>
                </TableHeader>
                <FlipTableBody flipKey={portfolioSort.flipKey}>
                  {sortedPortfolio.map((stock) => {
                    const held = stock.quantity - stock.quantitySell;
                    const rowKey = `${stock.stockCode}-${stock.company}`;
                    const profitByAvg =
                      stock.marketPrice - stock.averageCostBasis;

                    const profitByCurrent =
                      stock.currentCostBasis > 0
                        ? stock.marketPrice - stock.currentCostBasis
                        : null;
                    const averagePercentage =
                      stock.averageCostBasis > 0
                        ? ((stock.marketPrice - stock.averageCostBasis) /
                            stock.averageCostBasis) *
                          100
                        : null;
                    const currentPercentage =
                      stock.currentCostBasis > 0
                        ? ((stock.marketPrice - stock.currentCostBasis) /
                            stock.currentCostBasis) *
                          100
                        : null;

                    return (
                      <TableRow
                        key={rowKey}
                        data-flip-id={rowKey}
                        className="border-slate-700 hover:bg-slate-700/30"
                      >
                        <TableCell>
                          <span className="font-mono font-semibold text-cyan-400">
                            {stock.stockCode}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-400">
                            {stock.companyName || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-200">
                          {formatCurrency(held)}
                        </TableCell>
                        <TableCell className="text-right text-slate-200">
                          {stock.averageCostBasis > 0
                            ? formatCurrency(stock.averageCostBasis)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-slate-200">
                          {stock.currentCostBasis > 0
                            ? formatCurrency(stock.currentCostBasis)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-slate-200">
                          <FlashPrice value={stock.marketPrice}>
                            {stock.marketPrice > 0
                              ? formatCurrency(stock.marketPrice)
                              : "-"}
                          </FlashPrice>
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            profitByAvg >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          <FlashPrice
                            value={profitByAvg * held}
                            showArrow={false}
                          >
                            {profitByAvg >= 0 ? "+" : ""}
                            {formatCurrency(profitByAvg * held)}
                          </FlashPrice>
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            averagePercentage !== null
                              ? averagePercentage >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                              : "text-slate-500"
                          }`}
                        >
                          {averagePercentage !== null ? (
                            <div className="flex items-center justify-end gap-1">
                              {averagePercentage >= 0 ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {averagePercentage >= 0 ? "+" : ""}
                              {averagePercentage.toFixed(1)}%
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            profitByCurrent !== null
                              ? profitByCurrent >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                              : "text-slate-500"
                          }`}
                        >
                          {profitByCurrent !== null ? (
                            <>
                              {profitByCurrent >= 0 ? "+" : ""}
                              {formatCurrency(profitByCurrent * held)}
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        <TableCell
                          className={`text-right font-semibold ${
                            currentPercentage !== null
                              ? currentPercentage >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                              : "text-slate-500"
                          }`}
                        >
                          {currentPercentage !== null ? (
                            <div className="flex items-center justify-end gap-1">
                              {currentPercentage >= 0 ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {currentPercentage >= 0 ? "+" : ""}
                              {currentPercentage.toFixed(1)}%
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </FlipTableBody>
                <TableBody>
                  <TableRow className="border-slate-700 hover:bg-slate-700/30">
                    <TableCell
                      colSpan={6}
                      className="text-right text-cyan-400 font-bold"
                    >
                      Tổng lãi/lỗ:
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-cyan-400 font-bold",
                        totalProfitLongTermAvg >= 0
                          ? "text-emerald-400"
                          : "text-red-400",
                      )}
                    >
                      {formatCurrency(totalProfitLongTermAvg)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-cyan-400 font-bold",
                        totalProfitLongTermCurrent >= 0
                          ? "text-emerald-400"
                          : "text-red-400",
                      )}
                    >
                      {formatCurrency(totalProfitLongTermCurrent)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              Chưa có cổ phiếu dài hạn nào
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats by Stock - Tabs */}
      {((stats?.t0StatsByStock && stats.t0StatsByStock.length > 0) ||
        (stats?.longTermStatsByStock &&
          stats.longTermStatsByStock.length > 0) ||
        (stats?.dividendStatsByStock &&
          stats.dividendStatsByStock.length > 0)) && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Thống kê theo cổ phiếu
            </CardTitle>
            <CardDescription className="text-slate-400">
              Xem chi tiết thống kê theo từng mã cổ phiếu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="t0" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-900/50">
                <TabsTrigger
                  value="t0"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-400"
                  disabled={
                    !stats?.t0StatsByStock || stats.t0StatsByStock.length === 0
                  }
                >
                  <Zap className="h-4 w-4 mr-2" />
                  T0 ({stats?.t0StatsByStock?.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="longterm"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                  disabled={
                    !stats?.longTermStatsByStock ||
                    stats.longTermStatsByStock.length === 0
                  }
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Dài hạn ({stats?.longTermStatsByStock?.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="dividend"
                  className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400"
                  disabled={
                    !stats?.dividendStatsByStock ||
                    stats.dividendStatsByStock.length === 0
                  }
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Cổ tức ({stats?.dividendStatsByStock?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* T0 Stats Tab */}
              <TabsContent value="t0" className="mt-4">
                {stats?.t0StatsByStock && stats.t0StatsByStock.length > 0 ? (
                  <div className="rounded-lg border border-slate-700 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                          <SortableTableHead
                            label="Mã CP"
                            sortKey="stockCode"
                            activeKey={t0StatsSort.sortKey}
                            direction={t0StatsSort.sortDirection}
                            onSort={t0StatsSort.toggleSort}
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Công ty"
                            sortKey="companyName"
                            activeKey={t0StatsSort.sortKey}
                            direction={t0StatsSort.sortDirection}
                            onSort={t0StatsSort.toggleSort}
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Giá TT"
                            sortKey="marketPrice"
                            activeKey={t0StatsSort.sortKey}
                            direction={t0StatsSort.sortDirection}
                            onSort={t0StatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Số lệnh"
                            sortKey="orderCount"
                            activeKey={t0StatsSort.sortKey}
                            direction={t0StatsSort.sortDirection}
                            onSort={t0StatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="GT Mua"
                            sortKey="totalBuyValue"
                            activeKey={t0StatsSort.sortKey}
                            direction={t0StatsSort.sortDirection}
                            onSort={t0StatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="GT Bán"
                            sortKey="totalSellValue"
                            activeKey={t0StatsSort.sortKey}
                            direction={t0StatsSort.sortDirection}
                            onSort={t0StatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="LN sau phí"
                            sortKey="totalProfitAfterFees"
                            activeKey={t0StatsSort.sortKey}
                            direction={t0StatsSort.sortDirection}
                            onSort={t0StatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                        </TableRow>
                      </TableHeader>
                      <FlipTableBody flipKey={t0StatsSort.flipKey}>
                        {sortedT0Stats.map((stock) => {
                          const rowKey = `${stock.stockCode}-${stock.company}`;
                          return (
                            <TableRow
                              key={rowKey}
                              data-flip-id={rowKey}
                              className="border-slate-700 hover:bg-slate-700/30"
                            >
                              <TableCell>
                                <span className="font-mono font-semibold text-yellow-400">
                                  {stock.stockCode}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-slate-400">
                                  {stock.companyName || "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-slate-200">
                                <FlashPrice value={stock.marketPrice}>
                                  {stock.marketPrice > 0
                                    ? formatCurrency(stock.marketPrice)
                                    : "-"}
                                </FlashPrice>
                              </TableCell>
                              <TableCell className="text-right text-slate-200">
                                {stock.orderCount}
                              </TableCell>
                              <TableCell className="text-right text-red-400">
                                {formatCurrency(stock.totalBuyValue)}
                              </TableCell>
                              <TableCell className="text-right text-emerald-400">
                                {formatCurrency(stock.totalSellValue)}
                              </TableCell>
                              <TableCell
                                className={`text-right font-semibold ${
                                  stock.totalProfitAfterFees >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                {stock.totalProfitAfterFees >= 0 ? "+" : ""}
                                {formatCurrency(stock.totalProfitAfterFees)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </FlipTableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Chưa có dữ liệu T0
                  </div>
                )}
              </TabsContent>

              {/* Long-term Stats Tab */}
              <TabsContent value="longterm" className="mt-4">
                {stats?.longTermStatsByStock &&
                stats.longTermStatsByStock.length > 0 ? (
                  <div className="rounded-lg border border-slate-700 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                          <SortableTableHead
                            label="Mã CP"
                            sortKey="stockCode"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Công ty"
                            sortKey="companyName"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Giá TT"
                            sortKey="marketPrice"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Lệnh MUA"
                            sortKey="buyOrders"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Lệnh BÁN"
                            sortKey="sellOrders"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="SL Mua"
                            sortKey="totalBuyQuantity"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="SL Bán"
                            sortKey="totalSellQuantity"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="GT Mua"
                            sortKey="totalBuyValue"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="GT Bán"
                            sortKey="totalSellValue"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Lợi nhuận"
                            sortKey="totalProfit"
                            activeKey={longTermStatsSort.sortKey}
                            direction={longTermStatsSort.sortDirection}
                            onSort={longTermStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                        </TableRow>
                      </TableHeader>
                      <FlipTableBody flipKey={longTermStatsSort.flipKey}>
                        {sortedLongTermStats.map((stock) => {
                          const rowKey = `${stock.stockCode}-${stock.company}`;
                          return (
                            <TableRow
                              key={rowKey}
                              data-flip-id={rowKey}
                              className="border-slate-700 hover:bg-slate-700/30"
                            >
                              <TableCell>
                                <span className="font-mono font-semibold text-cyan-400">
                                  {stock.stockCode}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-slate-400">
                                  {stock.companyName || "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-slate-200">
                                <FlashPrice value={stock.marketPrice}>
                                  {stock.marketPrice > 0
                                    ? formatCurrency(stock.marketPrice)
                                    : "-"}
                                </FlashPrice>
                              </TableCell>
                              <TableCell className="text-right text-slate-200">
                                {stock.buyOrders}
                              </TableCell>
                              <TableCell className="text-right text-slate-200">
                                {stock.sellOrders}
                              </TableCell>
                              <TableCell className="text-right text-slate-200">
                                {formatCurrency(stock.totalBuyQuantity)}
                              </TableCell>
                              <TableCell className="text-right text-slate-200">
                                {formatCurrency(stock.totalSellQuantity)}
                              </TableCell>
                              <TableCell className="text-right text-emerald-400">
                                {formatCurrency(stock.totalBuyValue)}
                              </TableCell>
                              <TableCell className="text-right text-red-400">
                                {formatCurrency(stock.totalSellValue)}
                              </TableCell>
                              <TableCell
                                className={`text-right font-semibold ${
                                  stock.totalProfit >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                {stock.totalProfit >= 0 ? "+" : ""}
                                {formatCurrency(stock.totalProfit)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </FlipTableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Chưa có dữ liệu dài hạn
                  </div>
                )}
              </TabsContent>

              {/* Dividend Stats Tab */}
              <TabsContent value="dividend" className="mt-4">
                {stats?.dividendStatsByStock &&
                stats.dividendStatsByStock.length > 0 ? (
                  <div className="rounded-lg border border-slate-700 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                          <SortableTableHead
                            label="Mã CP"
                            sortKey="stockCode"
                            activeKey={dividendStatsSort.sortKey}
                            direction={dividendStatsSort.sortDirection}
                            onSort={dividendStatsSort.toggleSort}
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Tổng số"
                            sortKey="count"
                            activeKey={dividendStatsSort.sortKey}
                            direction={dividendStatsSort.sortDirection}
                            onSort={dividendStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Cổ phiếu"
                            sortKey="stockDividends"
                            activeKey={dividendStatsSort.sortKey}
                            direction={dividendStatsSort.sortDirection}
                            onSort={dividendStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Tiền mặt"
                            sortKey="cashDividends"
                            activeKey={dividendStatsSort.sortKey}
                            direction={dividendStatsSort.sortDirection}
                            onSort={dividendStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                          <SortableTableHead
                            label="Tổng giá trị (%)"
                            sortKey="totalValue"
                            activeKey={dividendStatsSort.sortKey}
                            direction={dividendStatsSort.sortDirection}
                            onSort={dividendStatsSort.toggleSort}
                            align="right"
                            className="text-slate-300 font-semibold"
                          />
                        </TableRow>
                      </TableHeader>
                      <FlipTableBody flipKey={dividendStatsSort.flipKey}>
                        {sortedDividendStats.map((stock) => (
                          <TableRow
                            key={stock._id}
                            data-flip-id={stock._id}
                            className="border-slate-700 hover:bg-slate-700/30"
                          >
                            <TableCell>
                              <span className="font-mono font-semibold text-amber-400">
                                {stock._id}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-slate-200">
                              {stock.count}
                            </TableCell>
                            <TableCell className="text-right text-purple-400">
                              {stock.stockDividends}
                            </TableCell>
                            <TableCell className="text-right text-amber-400">
                              {stock.cashDividends}
                            </TableCell>
                            <TableCell className="text-right text-slate-200">
                              {stock.totalValue.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </FlipTableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Chưa có dữ liệu cổ tức
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

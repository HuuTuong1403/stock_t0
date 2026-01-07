"use client";

import { useState, useEffect } from "react";
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
  TableHead,
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
  t0StatsByStock: Array<{
    _id: string;
    orderCount: number;
    totalProfitBeforeFees: number;
    totalProfitAfterFees: number;
    totalBuyValue: number;
    totalSellValue: number;
  }>;
  longTermStatsByStock: Array<{
    _id: string;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  const totalProfit =
    (stats?.t0Summary.totalProfitAfterFees || 0) +
    (stats?.longTermSummary.totalProfit || 0);

  return (
    <div className="space-y-8">
      {/* Header */}
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
                      <TableHead className="text-slate-400">Ngày</TableHead>
                      <TableHead className="text-slate-400">Mã CP</TableHead>
                      <TableHead className="text-slate-400 text-right">
                        SL
                      </TableHead>
                      <TableHead className="text-slate-400 text-right">
                        Lợi nhuận
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentT0Orders.map((order) => (
                      <TableRow
                        key={order._id}
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
                  </TableBody>
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

      {/* Monthly Profit */}
      {stats?.monthlyT0Profit && stats.monthlyT0Profit.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">
              Lợi nhuận T0 theo tháng
            </CardTitle>
            <CardDescription className="text-slate-400">
              6 tháng gần nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.monthlyT0Profit.map((month) => {
                const monthName = new Date(
                  month._id.year,
                  month._id.month - 1
                ).toLocaleDateString("vi-VN", {
                  month: "short",
                  year: "2-digit",
                });
                return (
                  <div
                    key={`${month._id.year}-${month._id.month}`}
                    className={`p-4 rounded-lg border ${
                      month.totalProfit >= 0
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    <p className="text-slate-400 text-sm">{monthName}</p>
                    <p
                      className={`text-lg font-bold mt-1 ${
                        month.totalProfit >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {month.totalProfit >= 0 ? "+" : ""}
                      {formatCurrency(month.totalProfit)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {month.orderCount} lệnh
                    </p>
                  </div>
                );
              })}
            </div>
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
          {stats?.longTermPortfolio && stats.longTermPortfolio.length > 0 ? (
            <div className="rounded-lg border border-slate-700 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                    <TableHead className="text-slate-300 font-semibold">
                      Mã CP
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Số lượng
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Giá vốn TB
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Giá vốn HT
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Giá TT
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Lãi/Lỗ (TB)
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      % thay đổi (TB)
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Lãi/Lỗ (HT)
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      % thay đổi (HT)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.longTermPortfolio.map((stock) => {
                    console.log("🚀 => stock:", stock)
                    const profitByAvg =
                      stock.marketPrice - stock.averageCostBasis;
                    const profitByCurrent =
                      stock.currentCostBasis > 0
                        ? stock.marketPrice - stock.currentCostBasis
                        : null;
                    // % thay đổi tính theo giá vốn hiện tại (ưu tiên), nếu không có thì tính theo giá vốn TB
                    const averagePercentage =
                      ((stock.marketPrice - stock.averageCostBasis) /
                        stock.averageCostBasis) *
                      100;
                    const currentPercentage =
                      ((stock.marketPrice - stock.currentCostBasis) /
                        stock.currentCostBasis) *
                      100;

                    return (
                      <TableRow
                        key={stock.stockCode}
                        className="border-slate-700 hover:bg-slate-700/30"
                      >
                        <TableCell>
                          <span className="font-mono font-semibold text-cyan-400">
                            {stock.stockCode}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-200">
                          {formatCurrency(stock.quantity - stock.quantitySell)}
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
                          {stock.marketPrice > 0
                            ? formatCurrency(stock.marketPrice)
                            : "-"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            profitByAvg >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {profitByAvg >= 0 ? "+" : ""}
                          {formatCurrency(profitByAvg * stock.quantity)}
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
                              {formatCurrency(profitByCurrent * stock.quantity)}
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
                          <TableHead className="text-slate-300 font-semibold">
                            Mã CP
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            Số lệnh
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            GT Mua
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            GT Bán
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            LN sau phí
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.t0StatsByStock.map((stock) => (
                          <TableRow
                            key={stock._id}
                            className="border-slate-700 hover:bg-slate-700/30"
                          >
                            <TableCell>
                              <span className="font-mono font-semibold text-yellow-400">
                                {stock._id}
                              </span>
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
                        ))}
                      </TableBody>
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
                          <TableHead className="text-slate-300 font-semibold">
                            Mã CP
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            Lệnh MUA
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            Lệnh BÁN
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            SL Mua
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            SL Bán
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            GT Mua
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            GT Bán
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            Lợi nhuận
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.longTermStatsByStock.map((stock) => (
                          <TableRow
                            key={stock._id}
                            className="border-slate-700 hover:bg-slate-700/30"
                          >
                            <TableCell>
                              <span className="font-mono font-semibold text-cyan-400">
                                {stock._id}
                              </span>
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
                        ))}
                      </TableBody>
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
                          <TableHead className="text-slate-300 font-semibold">
                            Mã CP
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            Tổng số
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            Cổ phiếu
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            Tiền mặt
                          </TableHead>
                          <TableHead className="text-slate-300 font-semibold text-right">
                            Tổng giá trị (%)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.dividendStatsByStock.map((stock) => (
                          <TableRow
                            key={stock._id}
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
                      </TableBody>
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

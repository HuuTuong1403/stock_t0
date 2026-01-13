"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, TrendingUp, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/format";
import { ImportExportDialog } from "@/components/ImportExportDialog";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";

interface LongTermOrder {
  _id: string;
  tradeDate: string;
  stockCode: string;
  company: StockCompany;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  fee: number;
  tax: number;
  costBasis: number;
  profit: number;
  createdAt?: string;
}

interface StockUser {
  _id: string;
  stockCode: string;
  costPrice: number;
  company: StockCompany | string;
  createdAt: string;
  updatedAt: string;
}

interface StockCompany {
  _id: string;
  name: string;
  buyFeeRate: number;
  sellFeeRate: number;
  taxRate: number;
  isDefault: boolean;
}

export default function LongTermOrdersPage() {
  const [orders, setOrders] = useState<LongTermOrder[]>([]);
  const [stockUsers, setStockUsers] = useState<StockUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<LongTermOrder | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterStock, setFilterStock] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    tradeDate: formatDateInput(new Date()),
    stockCode: "",
    type: "BUY" as "BUY" | "SELL",
    quantity: "",
    price: "",
    costBasis: "",
    profit: "",
  });

  const fetchOrders = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      const [stockCode, companyId] = filterStock.split("|");

      if (stockCode) params.stockCode = stockCode;
      if (companyId) params.companyId = companyId;
      if (filterType) params.type = filterType;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const { data } = await axiosClient.get("/long-term-orders", { params });
      setOrders(data);
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
      toast.error(getErrorMessage(error) || "Lỗi khi tải danh sách lệnh");
    } finally {
      setLoading(false);
    }
  }, [filterStock, filterType, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchOrders();
    fetchStockUsers();
  }, [fetchOrders]);

  const fetchStockUsers = async () => {
    try {
      const { data } = await axiosClient.get("/stock-users");
      setStockUsers(data);
    } catch (error: unknown) {
      console.error("Error fetching stock users:", error);
      toast.error(
        getErrorMessage(error) || "Lỗi khi tải danh sách cổ phiếu người dùng"
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const [stockCode, company] = formData.stockCode.split("|");
      const payload: Record<string, unknown> = {
        tradeDate: formData.tradeDate,
        stockCode,
        type: formData.type,
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price),
        company,
      };

      // Only include costBasis and profit for SELL orders
      if (formData.type === "SELL") {
        payload.costBasis = parseFloat(formData.costBasis) || 0;
        payload.profit = parseFloat(formData.profit) || 0;
      }

      if (editingOrder) {
        await axiosClient.put(`/long-term-orders/${editingOrder._id}`, payload);
        toast.success("Cập nhật thành công");
      } else {
        await axiosClient.post("/long-term-orders", payload);
        toast.success("Thêm lệnh thành công");
      }

      setIsDialogOpen(false);
      setEditingOrder(null);
      resetForm();
      fetchOrders();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Có lỗi xảy ra");
    }
  };

  const handleEdit = (order: LongTermOrder) => {
    setEditingOrder(order);

    setFormData({
      tradeDate: formatDateInput(order.tradeDate),
      stockCode: order.stockCode + "|" + (order.company as StockCompany)?._id,
      type: order.type,
      quantity: order.quantity.toString(),
      price: order.price.toString(),
      costBasis: order.costBasis.toString(),
      profit: order.profit.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa lệnh này?")) return;

    try {
      await axiosClient.delete(`/long-term-orders/${id}`);
      toast.success("Xóa lệnh thành công");
      fetchOrders();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Lỗi khi xóa lệnh");
    }
  };

  const resetForm = () => {
    setFormData({
      tradeDate: formatDateInput(new Date()),
      stockCode: "",
      type: "BUY",
      quantity: "",
      price: "",
      costBasis: "",
      profit: "",
    });
  };

  const openNewDialog = () => {
    setEditingOrder(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const clearFilters = () => {
    setFilterStock("");
    setFilterType("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  // Calculate totals
  const buyOrders = orders.filter((o) => o.type === "BUY");
  const sellOrders = orders.filter((o) => o.type === "SELL");

  const totals = {
    totalBuyValue: buyOrders.reduce((acc, o) => acc + o.quantity * o.price, 0),
    totalBuyQuantity: buyOrders.reduce((acc, o) => acc + o.quantity, 0),
    totalSellValue: sellOrders.reduce(
      (acc, o) => acc + o.quantity * o.price,
      0
    ),
    totalSellQuantity: sellOrders.reduce((acc, o) => acc + o.quantity, 0),
    totalProfit: sellOrders.reduce((acc, o) => acc + o.profit, 0),
  };

  // Calculate remaining quantity for each order
  const calculateRemainingQuantity = (order: LongTermOrder) => {
    // Get all orders of the same stockCode up to and including current order
    // Sort by tradeDate first, then by createdAt for same date, then by _id
    const sameStockOrders = orders
    .filter((o) => o.stockCode === order.stockCode && o.company._id === order.company._id)
      .sort((a, b) => {
        const dateA = new Date(a.tradeDate).getTime();
        const dateB = new Date(b.tradeDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        // If same date, use createdAt if available, otherwise use _id
        if (a.createdAt && b.createdAt) {
          const createdA = new Date(a.createdAt).getTime();
          const createdB = new Date(b.createdAt).getTime();
          if (createdA !== createdB) return createdA - createdB;
        }
        // Final tiebreaker: use _id
        return a._id.localeCompare(b._id);
      });

    // Find current order's position in sorted list
    const currentOrderIndex = sameStockOrders.findIndex(
      (o) => o._id === order._id
    );
    const ordersUpToCurrent = sameStockOrders.slice(0, currentOrderIndex + 1);

    // Calculate total buy and sell quantities
    const totalBuy = ordersUpToCurrent
      .filter((o) => o.type === "BUY")
      .reduce((sum, o) => sum + o.quantity, 0);
    const totalSell = ordersUpToCurrent
      .filter((o) => o.type === "SELL")
      .reduce((sum, o) => sum + o.quantity, 0);

    return totalBuy - totalSell;
  };

  // Calculate and format holding time
  const formatHoldingTime = (tradeDate: string) => {
    const tradeDateTime = new Date(tradeDate).getTime();
    const now = new Date().getTime();
    const diffMs = now - tradeDateTime;

    if (diffMs < 0) return "Chưa đến";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return `${diffDays} ngày`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-cyan-400" />
            Lệnh giao dịch dài hạn
          </h1>
          <p className="text-slate-400 mt-1">Quản lý danh mục đầu tư dài hạn</p>
        </div>

        <div className="flex gap-2">
          <ImportExportDialog type="long-term-orders" onSuccess={fetchOrders} />
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <Filter className="h-4 w-4 mr-2" />
            Bộ lọc
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openNewDialog}
                className="bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm lệnh
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingOrder ? "Sửa lệnh" : "Thêm lệnh mới"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Nhập thông tin lệnh mua hoặc bán dài hạn
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Ngày giao dịch</Label>
                      <Input
                        type="date"
                        value={formData.tradeDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tradeDate: e.target.value,
                          })
                        }
                        className="bg-slate-800 border-slate-600 text-white"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Loại lệnh</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: "BUY" | "SELL") =>
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem
                            value="BUY"
                            className="text-emerald-400 hover:bg-slate-700"
                          >
                            MUA
                          </SelectItem>
                          <SelectItem
                            value="SELL"
                            className="text-red-400 hover:bg-slate-700"
                          >
                            BÁN
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Mã cổ phiếu</Label>
                      <Select
                        value={formData.stockCode}
                        onValueChange={(value) =>
                          setFormData({ ...formData, stockCode: value })
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue placeholder="Chọn mã CP" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {stockUsers.map((stockUser) => (
                            <SelectItem
                              key={stockUser._id}
                              value={
                                stockUser.stockCode +
                                "|" +
                                (stockUser.company as StockCompany)?._id
                              }
                              className="text-white hover:bg-slate-700"
                            >
                              {stockUser.stockCode} (
                              {(stockUser.company as StockCompany)?.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Số lượng</Label>
                      <Input
                        type="number"
                        placeholder="VD: 1000"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity: e.target.value })
                        }
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                        required
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Giá</Label>
                      <Input
                        type="number"
                        placeholder="VD: 25000"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    {editingOrder ? "Cập nhật" : "Thêm"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-slate-300">Mã cổ phiếu</Label>
                <Select value={filterStock} onValueChange={setFilterStock}>
                  <SelectTrigger className="w-[150px] bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">
                      Tất cả
                    </SelectItem>
                    {stockUsers.map((stockUser) => (
                      <SelectItem
                        key={stockUser._id}
                        value={
                          stockUser.stockCode +
                          "|" +
                          (stockUser.company as StockCompany)?._id
                        }
                        className="text-white hover:bg-slate-700"
                      >
                        {stockUser.stockCode} (
                        {(stockUser.company as StockCompany)?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Loại lệnh</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[120px] bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">
                      Tất cả
                    </SelectItem>
                    <SelectItem value="BUY" className="text-emerald-400">
                      MUA
                    </SelectItem>
                    <SelectItem value="SELL" className="text-red-400">
                      BÁN
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Từ ngày</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Đến ngày</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4 mr-1" />
                Xóa bộ lọc
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Tổng giá trị mua</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              {formatCurrency(totals.totalBuyValue)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatCurrency(totals.totalBuyQuantity)} CP
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Tổng giá trị bán</p>
            <p className="text-xl font-bold text-red-400 mt-1">
              {formatCurrency(totals.totalSellValue)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatCurrency(totals.totalSellQuantity)} CP
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Số lệnh MUA</p>
            <p className="text-xl font-bold text-white mt-1">
              {buyOrders.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-linear-to-br from-slate-800/50 to-cyan-900/20 border-cyan-500/30">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Tổng lợi nhuận</p>
            <p
              className={`text-xl font-bold mt-1 ${
                totals.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {totals.totalProfit >= 0 ? "+" : ""}
              {formatCurrency(totals.totalProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Danh sách lệnh dài hạn</CardTitle>
          <CardDescription className="text-slate-400">
            Tổng cộng {orders.length} lệnh giao dịch
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-700 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                    <TableHead className="text-slate-300 font-semibold">
                      Ngày
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      Thời gian nắm giữ
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      Mã CP
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      CTCK
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      Loại
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      SL
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      SL còn lại
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Giá
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Phí
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Thuế
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Lợi nhuận
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="text-center text-slate-500 py-8"
                      >
                        Chưa có lệnh giao dịch nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => {
                      const remainingQty = calculateRemainingQuantity(order);
                      return (
                        <TableRow
                          key={order._id}
                          className="border-slate-700 hover:bg-slate-700/30"
                        >
                          <TableCell className="text-slate-300">
                            {formatDate(order.tradeDate)}
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {formatHoldingTime(order.tradeDate)}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-semibold text-cyan-400">
                              {order.stockCode}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {(order.company as StockCompany)?.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.type === "BUY" ? "default" : "destructive"
                              }
                              className={
                                order.type === "BUY"
                                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              }
                            >
                              {order.type === "BUY" ? "MUA" : "BÁN"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-200">
                            {formatCurrency(order.quantity)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              remainingQty > 0
                                ? "text-emerald-400"
                                : remainingQty < 0
                                ? "text-red-400"
                                : "text-slate-400"
                            }`}
                          >
                            {formatCurrency(remainingQty)}
                          </TableCell>
                          <TableCell className="text-right text-slate-200">
                            {formatCurrency(order.price)}
                          </TableCell>
                          <TableCell className="text-right text-slate-400">
                            {formatCurrency(order.fee)}
                          </TableCell>
                          <TableCell className="text-right text-slate-400">
                            {order.type === "SELL"
                              ? formatCurrency(order.tax)
                              : "-"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              order.type === "SELL"
                                ? order.profit >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                                : "text-slate-500"
                            }`}
                          >
                            {order.type === "SELL"
                              ? `${
                                  order.profit >= 0 ? "+" : ""
                                }${formatCurrency(order.profit)}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(order)}
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(order._id)}
                                className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
import { Plus, Pencil, Trash2, Zap, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/format";
import { ImportExportDialog } from "@/components/ImportExportDialog";
import { getStockUsers } from "@/lib/services/stock-user";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";

interface T0Order {
  _id: string;
  tradeDate: string;
  stockCode: string;
  company: StockCompany;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyValue: number;
  sellValue: number;
  buyFee: number;
  sellFee: number;
  sellTax: number;
  profitBeforeFees: number;
  profitAfterFees: number;
}

interface StockCompany {
  _id: string;
  name: string;
  buyFeeRate: number;
  sellFeeRate: number;
  taxRate: number;
  isDefault: boolean;
}

interface StockUser {
  _id: string;
  stockCode: string;
  costPrice: number;
  company: StockCompany | string;
  createdAt: string;
  updatedAt: string;
}

export default function T0OrdersPage() {
  const [orders, setOrders] = useState<T0Order[]>([]);
  const [stockUsers, setStockUsers] = useState<StockUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<T0Order | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterStock, setFilterStock] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    tradeDate: formatDateInput(new Date()),
    stockCode: "",
    quantity: "",
    buyPrice: "",
    sellPrice: "",
  });

  const fetchOrders = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      const [stockCode, companyId] = filterStock.split("|");
      if (stockCode) params.stockCode = stockCode;
      if (companyId) params.companyId = companyId;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const { data } = await axiosClient.get("/t0-orders", { params });
      
      setOrders(data);
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
      toast.error(getErrorMessage(error) || "Lỗi khi tải danh sách lệnh");
    } finally {
      setLoading(false);
    }
  }, [filterStock, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchOrders();
    fetchStockUsers();
  }, [fetchOrders]);

  const fetchStockUsers = async () => {
    try {
      const data = await getStockUsers();
      setStockUsers(data);
    } catch (error) {
      console.error("Error fetching stock users:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const [stockCode, company] = formData.stockCode.split("|");
      const payload = {
        ...formData,
        stockCode,
        quantity: parseInt(formData.quantity),
        buyPrice: parseFloat(formData.buyPrice),
        sellPrice: parseFloat(formData.sellPrice),
        company,
      };

      if (editingOrder) {
        await axiosClient.put(`/t0-orders/${editingOrder._id}`, payload);
        toast.success("Cập nhật thành công");
      } else {
        await axiosClient.post("/t0-orders", payload);
        toast.success("Thêm lệnh T0 thành công");
      }

      setIsDialogOpen(false);
      setEditingOrder(null);
      resetForm();
      fetchOrders();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Có lỗi xảy ra");
    }
  };

  const handleEdit = (order: T0Order) => {
    setEditingOrder(order);
    setFormData({
      tradeDate: formatDateInput(order.tradeDate),
      stockCode: order.stockCode + "|" + (order.company as StockCompany)?._id,
      quantity: order.quantity.toString(),
      buyPrice: order.buyPrice.toString(),
      sellPrice: order.sellPrice.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa lệnh này?")) return;

    try {
      await axiosClient.delete(`/t0-orders/${id}`);
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
      quantity: "",
      buyPrice: "",
      sellPrice: "",
    });
  };

  const openNewDialog = () => {
    setEditingOrder(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const clearFilters = () => {
    setFilterStock("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  // Calculate totals
  const totals = orders.reduce(
    (acc, order) => ({
      buyValue: acc.buyValue + order.buyValue,
      sellValue: acc.sellValue + order.sellValue,
      profitBeforeFees: acc.profitBeforeFees + order.profitBeforeFees,
      profitAfterFees: acc.profitAfterFees + order.profitAfterFees,
    }),
    { buyValue: 0, sellValue: 0, profitBeforeFees: 0, profitAfterFees: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="h-7 w-7 text-yellow-400" />
            Lệnh giao dịch T0
          </h1>
          <p className="text-slate-400 mt-1">
            Quản lý các lệnh giao dịch trong ngày
          </p>
        </div>

        <div className="flex gap-2">
          <ImportExportDialog type="t0-orders" onSuccess={fetchOrders} />
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
                className="bg-linear-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg shadow-yellow-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm lệnh T0
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingOrder ? "Sửa lệnh T0" : "Thêm lệnh T0 mới"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Nhập thông tin giao dịch mua và bán trong ngày
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Giá mua</Label>
                      <Input
                        type="number"
                        placeholder="VD: 25000"
                        value={formData.buyPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, buyPrice: e.target.value })
                        }
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Giá bán</Label>
                      <Input
                        type="number"
                        placeholder="VD: 25500"
                        value={formData.sellPrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sellPrice: e.target.value,
                          })
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
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
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
                        value={stockUser.stockCode + "|" + (stockUser.company as StockCompany)?._id}
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
            <p className="text-xl font-bold text-white mt-1">
              {formatCurrency(totals.buyValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Tổng giá trị bán</p>
            <p className="text-xl font-bold text-white mt-1">
              {formatCurrency(totals.sellValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Lợi nhuận trước phí</p>
            <p
              className={`text-xl font-bold mt-1 ${
                totals.profitBeforeFees >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {totals.profitBeforeFees >= 0 ? "+" : ""}
              {formatCurrency(totals.profitBeforeFees)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-linear-to-br from-slate-800/50 to-emerald-900/20 border-emerald-500/30">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Lợi nhuận sau phí</p>
            <p
              className={`text-xl font-bold mt-1 ${
                totals.profitAfterFees >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {totals.profitAfterFees >= 0 ? "+" : ""}
              {formatCurrency(totals.profitAfterFees)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Danh sách lệnh T0</CardTitle>
          <CardDescription className="text-slate-400">
            Tổng cộng {orders.length} lệnh giao dịch
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
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
                      Mã CP
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      CTCK
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      SL
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Giá mua
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Giá bán
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Phí + Thuế
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      LN sau phí
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
                        colSpan={9}
                        className="text-center text-slate-500 py-8"
                      >
                        Chưa có lệnh giao dịch nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow
                        key={order._id}
                        className="border-slate-700 hover:bg-slate-700/30"
                      >
                        <TableCell className="text-slate-300">
                          {formatDate(order.tradeDate)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-semibold text-yellow-400">
                            {order.stockCode}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {order.company?.name || "-"}
                        </TableCell>
                        <TableCell className="text-right text-slate-200">
                          {formatCurrency(order.quantity)}
                        </TableCell>
                        <TableCell className="text-right text-slate-200">
                          {formatCurrency(order.buyPrice)}
                        </TableCell>
                        <TableCell className="text-right text-slate-200">
                          {formatCurrency(order.sellPrice)}
                        </TableCell>
                        <TableCell className="text-right text-slate-400">
                          {formatCurrency(
                            order.buyFee + order.sellFee + order.sellTax
                          )}
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
                    ))
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

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
import {
  Plus,
  Pencil,
  Trash2,
  Coins,
  Filter,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateInput, formatPercent } from "@/lib/format";
import { ImportExportDialog } from "@/components/ImportExportDialog";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";
import { StockSelector } from "@/components/StockSelector";

interface Dividend {
  _id: string;
  dividendDate: string;
  stockCode: string;
  type: "STOCK" | "CASH";
  value: number;
  isUsed: boolean;
}

interface Stock {
  _id: string;
  code: string;
  name: string;
}

export default function DividendsPage() {
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDividend, setEditingDividend] = useState<Dividend | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);

  // Filters
  const [filterStock, setFilterStock] = useState("");
  const [filterType, setFilterType] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    dividendDate: formatDateInput(new Date()),
    stockCode: "",
    type: "CASH" as "STOCK" | "CASH",
    value: "",
    isUsed: false,
  });

  const fetchDividends = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStock) params.stockCode = filterStock;
      if (filterType) params.type = filterType;

      const { data } = await axiosClient.get("/dividends", { params });
      setDividends(data);
    } catch (error: unknown) {
      console.error("Error fetching dividends:", error);
      toast.error(getErrorMessage(error) || "Lỗi khi tải danh sách cổ tức");
    } finally {
      setLoading(false);
    }
  }, [filterStock, filterType]);

  useEffect(() => {
    fetchDividends();
    fetchStocks();
  }, [fetchDividends]);

  const fetchStocks = async () => {
    try {
      const { data } = await axiosClient.get("/stocks");
      setStocks(data);
    } catch (error: unknown) {
      console.error("Error fetching stocks:", error);
      toast.error(getErrorMessage(error) || "Lỗi khi tải danh sách cổ phiếu");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        value: parseFloat(formData.value),
      };

      if (editingDividend) {
        await axiosClient.put(`/dividends/${editingDividend._id}`, payload);
        toast.success("Cập nhật thành công");
      } else {
        await axiosClient.post("/dividends", payload);
        toast.success("Thêm cổ tức thành công");
      }

      setIsDialogOpen(false);
      setEditingDividend(null);
      resetForm();
      fetchDividends();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Có lỗi xảy ra");
    }
  };

  const handleEdit = (dividend: Dividend) => {
    setEditingDividend(dividend);
    setFormData({
      dividendDate: formatDateInput(dividend.dividendDate),
      stockCode: dividend.stockCode,
      type: dividend.type,
      value: dividend.value.toString(),
      isUsed: dividend.isUsed,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa cổ tức này?")) return;

    try {
      await axiosClient.delete(`/dividends/${id}`);
      toast.success("Xóa cổ tức thành công");
      fetchDividends();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Lỗi khi xóa cổ tức");
    }
  };

  const resetForm = () => {
    setFormData({
      dividendDate: formatDateInput(new Date()),
      stockCode: "",
      type: "CASH",
      value: "",
      isUsed: false,
    });
  };

  const openNewDialog = () => {
    setEditingDividend(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const clearFilters = () => {
    setFilterStock("");
    setFilterType("");
  };

  const handleAdjustOrders = async (dividend: Dividend) => {
    if (dividend.type !== "STOCK") {
      toast.info("Chỉ cổ tức cổ phiếu mới cần điều chỉnh lệnh");
      return;
    }

    if (
      !confirm(
        `Điều chỉnh tất cả lệnh giao dịch ${
          dividend.stockCode
        } trước ngày ${formatDate(
          dividend.dividendDate
        )}?\n\nSố lượng sẽ được nhân với ${(1 + dividend.value / 100).toFixed(
          2
        )} và giá sẽ được chia cho ${(1 + dividend.value / 100).toFixed(2)}.`
      )
    )
      return;

    setAdjusting(dividend._id);
    try {
      const { data } = await axiosClient.post("/dividends/adjust-orders", {
        dividendId: dividend._id,
      });
      toast.success(data.message || "Điều chỉnh lệnh thành công");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Có lỗi xảy ra");
    } finally {
      fetchDividends();
      setAdjusting(null);
    }
  };

  // Calculate totals
  const stockDividends = dividends.filter((d) => d.type === "STOCK");
  const cashDividends = dividends.filter((d) => d.type === "CASH");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Coins className="h-7 w-7 text-amber-400" />
            Quản lý cổ tức
          </h1>
          <p className="text-slate-400 mt-1">
            Danh sách cổ tức và chia tách cổ phiếu
          </p>
        </div>

        <div className="flex gap-2">
          <ImportExportDialog type="dividends" onSuccess={fetchDividends} />
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
                className="bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg shadow-amber-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm cổ tức
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingDividend ? "Sửa cổ tức" : "Thêm cổ tức mới"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Nhập thông tin chia cổ tức hoặc chia tách cổ phiếu
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Ngày chia tách</Label>
                      <Input
                        type="date"
                        value={formData.dividendDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dividendDate: e.target.value,
                          })
                        }
                        className="bg-slate-800 border-slate-600 text-white"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Loại</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: "STOCK" | "CASH") =>
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem
                            value="CASH"
                            className="text-amber-400 hover:bg-slate-700"
                          >
                            Tiền mặt
                          </SelectItem>
                          <SelectItem
                            value="STOCK"
                            className="text-purple-400 hover:bg-slate-700"
                          >
                            Cổ phiếu
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Mã cổ phiếu</Label>
                    <StockSelector
                      value={formData.stockCode}
                      onSelect={(stock) =>
                        setFormData({
                          ...formData,
                          stockCode: stock?.code || "",
                        })
                      }
                      placeholder="Chọn cổ phiếu..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      Giá trị chia tách (%)
                    </Label>
                    <Input
                      type="number"
                      placeholder="VD: 10 (tức 10%)"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData({ ...formData, value: e.target.value })
                      }
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      required
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-slate-500">
                      {formData.type === "CASH"
                        ? "Tỷ lệ cổ tức tiền mặt trên mệnh giá"
                        : "Tỷ lệ cổ phiếu thưởng"}
                    </p>
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
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {editingDividend ? "Cập nhật" : "Thêm"}
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
              <div className="space-y-2 min-w-[500px] w-auto">
                <Label className="text-slate-300">Mã cổ phiếu</Label>
                <StockSelector
                  value={filterStock}
                  onSelect={(stock) => setFilterStock(stock?.code || "")}
                  placeholder="Chọn cổ phiếu..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Loại</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px] bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">
                      Tất cả
                    </SelectItem>
                    <SelectItem value="CASH" className="text-amber-400">
                      Tiền mặt
                    </SelectItem>
                    <SelectItem value="STOCK" className="text-purple-400">
                      Cổ phiếu
                    </SelectItem>
                  </SelectContent>
                </Select>
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Tổng số cổ tức</p>
            <p className="text-2xl font-bold text-white mt-1">
              {dividends.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Cổ tức tiền mặt</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {cashDividends.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm">Cổ tức cổ phiếu</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">
              {stockDividends.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Danh sách cổ tức</CardTitle>
          <CardDescription className="text-slate-400">
            Lịch sử chia cổ tức và chia tách cổ phiếu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-700 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                    <TableHead className="text-slate-300 font-semibold">
                      STT
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      Ngày chia tách
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      Mã CP
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      Loại
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Giá trị (%)
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dividends.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-slate-500 py-8"
                      >
                        Chưa có cổ tức nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    dividends.map((dividend, index) => (
                      <TableRow
                        key={dividend._id}
                        className="border-slate-700 hover:bg-slate-700/30"
                      >
                        <TableCell className="text-slate-400">
                          {index + 1}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatDate(dividend.dividendDate)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-semibold text-amber-400">
                            {dividend.stockCode}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              dividend.type === "CASH"
                                ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
                                : "border-purple-500/50 text-purple-400 bg-purple-500/10"
                            }
                          >
                            {dividend.type === "CASH" ? "Tiền mặt" : "Cổ phiếu"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-white font-semibold">
                          {formatPercent(dividend.value)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {dividend.type === "STOCK" && !dividend.isUsed && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleAdjustOrders(dividend)}
                                disabled={adjusting === dividend._id}
                                className="h-8 w-8 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10"
                                title="Điều chỉnh lệnh giao dịch"
                              >
                                {adjusting === dividend._id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(dividend)}
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(dividend._id)}
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

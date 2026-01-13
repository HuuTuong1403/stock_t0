"use client";

import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, User, DollarSign } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { StockSelector } from "@/components/StockSelector";
import { CompanySelector } from "@/components/CompanySelector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import axiosClient from "@/lib/axiosClient";
import { Stock, StockCompany, StockUser } from "@/lib/interfaces";
import { getErrorMessage } from "@/lib/utils/error";

export default function StockUsersPage() {
  const [stockUsers, setStockUsers] = useState<StockUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStockUser, setEditingStockUser] = useState<StockUser | null>(
    null
  );
  const [formData, setFormData] = useState({
    stockCode: "",
    stockName: "",
    companyId: "",
    costPrice: "",
  });
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<StockCompany | null>(
    null
  );

  // Fetch stock users
  useEffect(() => {
    fetchStockUsers();
  }, []);

  const fetchStockUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axiosClient.get("/stock-users");
      if (data && Array.isArray(data)) {
        setStockUsers(data);
      }
    } catch (error: unknown) {
      console.error("Error fetching stock users:", error);
      toast.error(
        getErrorMessage(error) || "Lỗi khi tải danh sách cổ phiếu người dùng"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStock || !selectedCompany || !formData.costPrice) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      const costPrice = parseFloat(formData.costPrice);
      if (isNaN(costPrice) || costPrice <= 0) {
        toast.error("Giá vốn phải là số dương");
        return;
      }

      const payload = {
        stockCode: selectedStock.code,
        costPrice,
        company: selectedCompany._id,
      };

      if (editingStockUser) {
        // Update existing stock user
        await axiosClient.put(`/stock-users/${editingStockUser._id}`, payload);
        toast.success("Cập nhật thành công");
      } else {
        // Create new stock user
        await axiosClient.post("/stock-users", payload);
        toast.success("Thêm cổ phiếu thành công");
      }

      setIsDialogOpen(false);
      setEditingStockUser(null);
      resetForm();
      fetchStockUsers();
    } catch (error: unknown) {
      console.error("Error submitting form:", error);
      toast.error(getErrorMessage(error) || "Có lỗi xảy ra");
    }
  };

  const handleEdit = (stockUser: StockUser) => {
    setEditingStockUser(stockUser);
    const company =
      typeof stockUser.company === "object" ? stockUser.company : null;

    setFormData({
      stockCode: stockUser.stockCode,
      stockName: "", // Will be filled when stock is selected
      companyId: company?._id || "",
      costPrice: stockUser.costPrice.toString(),
    });

    // Set selected company
    if (company) {
      setSelectedCompany(company);
    }

    // Note: Stock will be set via StockSelector when it loads
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      stockCode: "",
      stockName: "",
      companyId: "",
      costPrice: "",
    });
    setSelectedStock(null);
    setSelectedCompany(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa cổ phiếu này?")) return;

    try {
      await axiosClient.delete(`/stock-users/${id}`);
      toast.success("Xóa cổ phiếu thành công");
      fetchStockUsers();
    } catch (error: unknown) {
      console.error("Error deleting stock user:", error);
      toast.error(getErrorMessage(error) || "Lỗi khi xóa cổ phiếu");
    }
  };

  const openNewDialog = () => {
    setEditingStockUser(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleStockSelect = (stock: Stock | null) => {
    setSelectedStock(stock);
    if (stock) {
      setFormData((prev) => ({
        ...prev,
        stockCode: stock.code,
        stockName: stock.name,
      }));
    }
  };

  const handleCompanySelect = (company: StockCompany | null) => {
    setSelectedCompany(company);
    if (company) {
      setFormData((prev) => ({
        ...prev,
        companyId: company._id,
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between items-start sm:items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="h-7 w-7 text-emerald-400" />
              Cổ phiếu của tôi
            </h1>
            <p className="text-slate-400 mt-1">
              Quản lý cổ phiếu và giá vốn của bạn
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openNewDialog}
                className="bg-linear-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm cổ phiếu
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingStockUser ? "Sửa cổ phiếu" : "Thêm cổ phiếu mới"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {editingStockUser
                    ? "Cập nhật thông tin cổ phiếu của bạn"
                    : "Chọn cổ phiếu và nhập giá vốn"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  {/* Stock Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="stock" className="text-slate-300">
                      Cổ phiếu *
                    </Label>
                    <StockSelector
                      value={formData.stockCode}
                      onSelect={handleStockSelect}
                      placeholder="Chọn cổ phiếu..."
                    />
                  </div>

                  {/* Company Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-slate-300">
                      Công ty chứng khoán *
                    </Label>
                    <CompanySelector
                      value={formData.companyId}
                      onSelect={handleCompanySelect}
                      placeholder="Chọn công ty chứng khoán..."
                    />
                  </div>

                  {/* Cost Price */}
                  <div className="space-y-2">
                    <Label htmlFor="costPrice" className="text-slate-300">
                      Giá vốn (VND) *
                    </Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="VD: 50000"
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: e.target.value })
                      }
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                    {formData.costPrice && (
                      <p className="text-xs text-slate-500">
                        {formatCurrency(parseFloat(formData.costPrice) || 0)}
                      </p>
                    )}
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
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {editingStockUser ? "Cập nhật" : "Thêm"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card className="bg-slate-800/50 border-slate-700/50 w-full flex-1">
          <CardHeader>
            <CardTitle className="text-white">Danh sách cổ phiếu</CardTitle>
            <CardDescription className="text-slate-400">
              Tổng cộng {stockUsers.length} cổ phiếu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-900/50 hover:bg-slate-900/50">
                      <TableHead className="text-slate-300 font-semibold">
                        Mã CP
                      </TableHead>
                      <TableHead className="text-slate-300 font-semibold">
                        Công ty chứng khoán
                      </TableHead>
                      <TableHead className="text-slate-300 font-semibold text-right">
                        Giá vốn
                      </TableHead>
                      <TableHead className="text-slate-300 font-semibold text-right">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockUsers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-slate-500 py-8"
                        >
                          Chưa có cổ phiếu nào. Nhấn &quot;Thêm cổ phiếu&quot;
                          để bắt đầu.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockUsers.map((stockUser) => {
                        const company =
                          typeof stockUser.company === "object"
                            ? stockUser.company
                            : null;

                        return (
                          <TableRow
                            key={stockUser._id}
                            className="border-slate-700 hover:bg-slate-700/30"
                          >
                            <TableCell>
                              <span className="font-mono font-semibold text-emerald-400">
                                {stockUser.stockCode}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-200">
                              {company ? company.name : "N/A"}
                              {company?.isDefault && (
                                <span className="ml-2 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                                  Mặc định
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-400" />
                                <span className="text-slate-200 font-medium">
                                  {formatCurrency(stockUser.costPrice)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEdit(stockUser)}
                                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDelete(stockUser._id)}
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
    </div>
  );
}

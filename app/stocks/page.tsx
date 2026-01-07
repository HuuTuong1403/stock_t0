"use client";

import { useState, useEffect } from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";

interface Stock {
  _id: string;
  code: string;
  name: string;
  marketPrice: number;
  currentCostBasis: number;
  createdAt: string;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    marketPrice: "",
    currentCostBasis: "",
  });

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    const filtered = stocks.filter(
      (stock) =>
        stock.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStocks(filtered);
  }, [stocks, searchTerm]);

  const fetchStocks = async () => {
    try {
      const res = await fetch("/api/stocks");
      const data = await res.json();
      setStocks(data);
    } catch (error) {
      console.error("Error fetching stocks:", error);
      toast.error("Lỗi khi tải danh sách cổ phiếu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStock
        ? `/api/stocks/${editingStock._id}`
        : "/api/stocks";
      const method = editingStock ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          marketPrice: formData.marketPrice
            ? parseFloat(formData.marketPrice)
            : 0,
          currentCostBasis: formData.currentCostBasis
            ? parseFloat(formData.currentCostBasis)
            : 0,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      toast.success(
        editingStock ? "Cập nhật thành công" : "Thêm cổ phiếu thành công"
      );
      setIsDialogOpen(false);
      setEditingStock(null);
      resetForm();
      fetchStocks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    }
  };

  const handleEdit = (stock: Stock) => {
    setEditingStock(stock);
    setFormData({
      code: stock.code,
      name: stock.name,
      marketPrice: stock.marketPrice?.toString() || "",
      currentCostBasis: stock.currentCostBasis?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ code: "", name: "", marketPrice: "", currentCostBasis: "" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa cổ phiếu này?")) return;

    try {
      const res = await fetch(`/api/stocks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi khi xóa");
      toast.success("Xóa cổ phiếu thành công");
      fetchStocks();
    } catch {
      toast.error("Lỗi khi xóa cổ phiếu");
    }
  };

  const openNewDialog = () => {
    setEditingStock(null);
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-7 w-7 text-emerald-400" />
            Quản lý cổ phiếu
          </h1>
          <p className="text-slate-400 mt-1">
            Danh sách các mã cổ phiếu đang theo dõi
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
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingStock ? "Sửa cổ phiếu" : "Thêm cổ phiếu mới"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingStock
                  ? "Cập nhật thông tin cổ phiếu"
                  : "Nhập thông tin cổ phiếu mới"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-slate-300">
                    Mã cổ phiếu
                  </Label>
                  <Input
                    id="code"
                    placeholder="VD: VNM, FPT, VIC..."
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    required
                    disabled={!!editingStock}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">
                    Tên doanh nghiệp
                  </Label>
                  <Input
                    id="name"
                    placeholder="VD: Công ty CP Sữa Việt Nam"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marketPrice" className="text-slate-300">
                      Giá thị trường
                    </Label>
                    <Input
                      id="marketPrice"
                      type="number"
                      placeholder="VD: 25000"
                      value={formData.marketPrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          marketPrice: e.target.value,
                        })
                      }
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="currentCostBasis"
                      className="text-slate-300"
                    >
                      Giá vốn hiện tại
                    </Label>
                    <Input
                      id="currentCostBasis"
                      type="number"
                      placeholder="Tự động tính từ lệnh dài hạn"
                      value={formData.currentCostBasis}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentCostBasis: e.target.value,
                        })
                      }
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
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
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {editingStock ? "Cập nhật" : "Thêm"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Tìm kiếm theo mã hoặc tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Danh sách cổ phiếu</CardTitle>
          <CardDescription className="text-slate-400">
            Tổng cộng {filteredStocks.length} cổ phiếu
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
                      STT
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      Mã CP
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold">
                      Tên doanh nghiệp
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Giá TT
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Giá HT
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStocks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-slate-500 py-8"
                      >
                        {searchTerm
                          ? "Không tìm thấy cổ phiếu"
                          : "Chưa có cổ phiếu nào"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStocks.map((stock, index) => {
                      return (
                        <TableRow
                          key={stock._id}
                          className="border-slate-700 hover:bg-slate-700/30"
                        >
                          <TableCell className="text-slate-400">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-semibold text-emerald-400">
                              {stock.code}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-200">
                            {stock.name}
                          </TableCell>
                          <TableCell className="text-right text-slate-200">
                            {stock.marketPrice && stock.marketPrice > 0
                              ? formatCurrency(stock.marketPrice)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right text-slate-200">
                            {stock.currentCostBasis &&
                            stock.currentCostBasis > 0
                              ? formatCurrency(stock.currentCostBasis)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(stock)}
                                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(stock._id)}
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

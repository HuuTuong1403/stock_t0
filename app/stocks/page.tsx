"use client";

import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import {
  deleteStock,
  editOrCreateStock,
  getStocks,
} from "@/lib/services/stock";
import { Pagination } from "@/components/ui/pagination";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImportExportDialog } from "@/components/ImportExportDialog";
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

interface Stock {
  code: string;
  name: string;
  industry: string;
  marketPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  openPrice?: number;
  volumn?: number;
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    industry: "",
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch stocks when page or search changes
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setLoading(true);
        const res = await getStocks({
          page: currentPage,
          limit: 50,
          search: debouncedSearchTerm,
        });

        if (res && typeof res === "object" && "data" in res) {
          setStocks(res.data as Stock[]);
          if ("pagination" in res) {
            setPagination(res.pagination as PaginationData);
          }
        } else {
          setStocks([]);
        }
      } catch (error) {
        console.error("Error fetching stocks:", error);
        toast.error("Lỗi khi tải danh sách cổ phiếu");
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, [currentPage, debouncedSearchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await editOrCreateStock(formData, editingStock ? "PUT" : "POST");

      toast.success(
        editingStock ? "Cập nhật thành công" : "Thêm cổ phiếu thành công"
      );
      setIsDialogOpen(false);
      setEditingStock(null);
      resetForm();
      // Trigger refetch by resetting to page 1
      setCurrentPage(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    }
  };

  const handleEdit = (stock: Stock) => {
    setEditingStock(stock);
    setFormData({
      code: stock.code,
      name: stock.name,
      industry: stock.industry,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ code: "", name: "", industry: "" });
  };

  const handleDelete = async (code: string) => {
    if (!confirm("Bạn có chắc muốn xóa cổ phiếu này?")) return;

    try {
      await deleteStock(code);

      toast.success("Xóa cổ phiếu thành công");
      // Refetch current page
      setCurrentPage(1);
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
      <div className="flex flex-col justify-between items-start sm:items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="h-7 w-7 text-emerald-400" />
              Quản lý cổ phiếu
            </h1>
            <p className="text-slate-400 mt-1">
              Danh sách các mã cổ phiếu đang theo dõi
            </p>
          </div>

          <div className="flex gap-2">
            <ImportExportDialog
              type="stocks"
              onSuccess={() => {
                // Trigger refetch by resetting page
                setCurrentPage(1);
              }}
            />
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

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-300">
                        Ngành hàng
                      </Label>
                      <Input
                        id="industry"
                        placeholder="VD: Công nghiệp, Ngân hàng, Bảo hiểm..."
                        value={formData.industry}
                        onChange={(e) =>
                          setFormData({ ...formData, industry: e.target.value })
                        }
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                        required
                      />
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
        </div>

        {/* Search */}
        <Card className="bg-slate-800/50 border-slate-700/50 flex-1 w-full">
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
        <Card className="bg-slate-800/50 border-slate-700/50 w-full flex-1">
          <CardHeader>
            <CardTitle className="text-white">Danh sách cổ phiếu</CardTitle>
            <CardDescription className="text-slate-400">
              Tổng cộng {pagination.total} cổ phiếu
              {debouncedSearchTerm && ` (tìm kiếm: "${debouncedSearchTerm}")`}
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
                      <TableHead className="text-slate-300 font-semibold">
                        Ngành hàng
                      </TableHead>
                      <TableHead className="text-slate-300 font-semibold text-right">
                        Giá thị trướng
                      </TableHead>
                      <TableHead className="text-slate-300 font-semibold text-right">
                        Giá thấp nhất
                      </TableHead>
                      <TableHead className="text-slate-300 font-semibold text-right">
                        Giá cao nhất
                      </TableHead>
                      <TableHead className="text-slate-300 font-semibold text-right">
                        Giá mở cửa
                      </TableHead>
                      <TableHead className="text-slate-300 font-semibold text-right">
                        Khối lượng giao dịch
                      </TableHead>
                      <TableHead className="text-slate-300 font-semibold text-right">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-slate-500 py-8"
                        >
                          {debouncedSearchTerm
                            ? "Không tìm thấy cổ phiếu"
                            : "Chưa có cổ phiếu nào"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      stocks.map((stock, index) => {
                        return (
                          <TableRow
                            key={stock.code}
                            className="border-slate-700 hover:bg-slate-700/30"
                          >
                            <TableCell className="text-slate-400">
                              {(currentPage - 1) * 50 + index + 1}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono font-semibold text-emerald-400">
                                {stock.code}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-200">
                              {stock.name}
                            </TableCell>
                            <TableCell className="text-slate-200">
                              {stock.industry}
                            </TableCell>
                            <TableCell className="text-right text-slate-200">
                              {stock.marketPrice && stock.marketPrice > 0
                                ? formatCurrency(stock.marketPrice)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right text-slate-200">
                              {stock.lowPrice && stock.lowPrice > 0
                                ? formatCurrency(stock.lowPrice)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right text-slate-200">
                              {stock.highPrice && stock.highPrice > 0
                                ? formatCurrency(stock.highPrice)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right text-slate-200">
                              {stock.openPrice && stock.openPrice > 0
                                ? formatCurrency(stock.openPrice)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right text-slate-200">
                              {stock.volumn && stock.volumn > 0
                                ? stock.volumn
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
                                  onClick={() => handleDelete(stock.code)}
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
            {!loading && pagination.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Landmark, Star } from "lucide-react";
import { toast } from "sonner";
import axiosClient from "@/lib/axiosClient";
import { getErrorMessage } from "@/lib/utils/error";
import { formatPercent } from "@/lib/format";

interface StockCompany {
  _id: string;
  name: string;
  buyFeeRate: number;
  sellFeeRate: number;
  taxRate: number;
  isDefault: boolean;
  createdAt: string;
}

export default function StockCompaniesPage() {
  const [companies, setCompanies] = useState<StockCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<StockCompany | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    buyFeeRate: "0.15",
    sellFeeRate: "0.15",
    taxRate: "0.1",
    isDefault: false,
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data } = await axiosClient.get("/stock-companies");
      setCompanies(data);
    } catch (error: unknown) {
      console.error("Error fetching companies:", error);
      toast.error(getErrorMessage(error) || "Lỗi khi tải danh sách công ty chứng khoán");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        buyFeeRate: parseFloat(formData.buyFeeRate) / 100,
        sellFeeRate: parseFloat(formData.sellFeeRate) / 100,
        taxRate: parseFloat(formData.taxRate) / 100,
        isDefault: formData.isDefault,
      };

      if (editingCompany) {
        await axiosClient.put(`/stock-companies/${editingCompany._id}`, payload);
        toast.success("Cập nhật thành công");
      } else {
        await axiosClient.post("/stock-companies", payload);
        toast.success("Thêm công ty thành công");
      }

      setIsDialogOpen(false);
      setEditingCompany(null);
      resetForm();
      fetchCompanies();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Có lỗi xảy ra");
    }
  };

  const handleEdit = (company: StockCompany) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      buyFeeRate: (company.buyFeeRate * 100).toString(),
      sellFeeRate: (company.sellFeeRate * 100).toString(),
      taxRate: (company.taxRate * 100).toString(),
      isDefault: company.isDefault,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa công ty chứng khoán này?")) return;

    try {
      await axiosClient.delete(`/stock-companies/${id}`);
      toast.success("Xóa công ty chứng khoán thành công");
      fetchCompanies();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Lỗi khi xóa công ty chứng khoán");
    }
  };

  const handleSetDefault = async (company: StockCompany) => {
    try {
      await axiosClient.put(`/stock-companies/${company._id}`, {
        isDefault: true,
      });
      toast.success(`Đã đặt ${company.name} làm mặc định`);
      fetchCompanies();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Lỗi khi cập nhật");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      buyFeeRate: "0.15",
      sellFeeRate: "0.15",
      taxRate: "0.1",
      isDefault: false,
    });
  };

  const openNewDialog = () => {
    setEditingCompany(null);
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Landmark className="h-7 w-7 text-violet-400" />
            Công ty chứng khoán
          </h1>
          <p className="text-slate-400 mt-1">
            Quản lý phí giao dịch và thuế cho từng công ty
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openNewDialog}
              className="bg-linear-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg shadow-violet-500/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm công ty
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingCompany ? "Sửa công ty" : "Thêm công ty mới"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Nhập thông tin công ty chứng khoán và tỷ lệ phí
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">
                    Tên công ty chứng khoán
                  </Label>
                  <Input
                    id="name"
                    placeholder="VD: VPS, SSI, VCBS..."
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Phí mua (%)</Label>
                    <Input
                      type="number"
                      placeholder="0.15"
                      value={formData.buyFeeRate}
                      onChange={(e) =>
                        setFormData({ ...formData, buyFeeRate: e.target.value })
                      }
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Phí bán (%)</Label>
                    <Input
                      type="number"
                      placeholder="0.15"
                      value={formData.sellFeeRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sellFeeRate: e.target.value,
                        })
                      }
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Thuế bán (%)</Label>
                    <Input
                      type="number"
                      placeholder="0.1"
                      value={formData.taxRate}
                      onChange={(e) =>
                        setFormData({ ...formData, taxRate: e.target.value })
                      }
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) =>
                      setFormData({ ...formData, isDefault: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                  />
                  <Label htmlFor="isDefault" className="text-slate-300">
                    Đặt làm mặc định
                  </Label>
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
                  className="bg-violet-500 hover:bg-violet-600 text-white"
                >
                  {editingCompany ? "Cập nhật" : "Thêm"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">
            Danh sách công ty chứng khoán
          </CardTitle>
          <CardDescription className="text-slate-400">
            Tổng cộng {companies.length} công ty
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400"></div>
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
                      Tên công ty
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Phí mua
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Phí bán
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Thuế bán
                    </TableHead>
                    <TableHead className="text-slate-300 font-semibold text-right">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-slate-500 py-8"
                      >
                        Chưa có công ty chứng khoán nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    companies.map((company, index) => (
                      <TableRow
                        key={company._id}
                        className="border-slate-700 hover:bg-slate-700/30"
                      >
                        <TableCell className="text-slate-400">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-violet-400">
                              {company.name}
                            </span>
                            {company.isDefault && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                <Star className="h-3 w-3 mr-1" />
                                Mặc định
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-emerald-400">
                          {formatPercent(company.buyFeeRate * 100)}
                        </TableCell>
                        <TableCell className="text-right text-red-400">
                          {formatPercent(company.sellFeeRate * 100)}
                        </TableCell>
                        <TableCell className="text-right text-amber-400">
                          {formatPercent(company.taxRate * 100)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!company.isDefault && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSetDefault(company)}
                                className="h-8 w-8 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10"
                                title="Đặt làm mặc định"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(company)}
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(company._id)}
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

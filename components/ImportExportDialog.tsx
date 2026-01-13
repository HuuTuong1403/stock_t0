"use client";

import { toast } from "sonner";

import { useState, useRef } from "react";
import { Download, Upload, FileSpreadsheet, X } from "lucide-react";

import {
  exportExcel,
  exportExcelTemplate,
  importExcel,
} from "@/lib/services/excel";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImportExportDialogProps {
  type: "t0-orders" | "long-term-orders" | "dividends" | "stocks";
  onSuccess?: () => void;
}

export function ImportExportDialog({
  type,
  onSuccess,
}: ImportExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeLabels = {
    "t0-orders": "Lệnh T0",
    "long-term-orders": "Lệnh dài hạn",
    dividends: "Cổ tức",
    stocks: "Cổ phiếu",
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const response = await exportExcel(type);

      const url = window.URL.createObjectURL(response);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      clearInterval(progressInterval);
      setProgress(100);
      toast.success(`Xuất ${typeLabels[type]} thành công`);
      setTimeout(() => {
        setIsExporting(false);
        setProgress(0);
      }, 500);
    } catch (error) {
      setIsExporting(false);
      setProgress(0);
      toast.error(
        error instanceof Error ? error.message : "Lỗi khi xuất dữ liệu"
      );
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await exportExcelTemplate(type);

      const url = window.URL.createObjectURL(response);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template-${type}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Tải template thành công");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Lỗi khi tải template"
      );
    }
  };

  const handleImport = async () => {
    const file = selectedFile || fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Vui lòng chọn file");
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setImportResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + 5;
        });
      }, 100);

      const formData = new FormData();
      formData.append("file", file);

      const response = await importExcel(type, formData);

      clearInterval(progressInterval);
      setProgress(90);

      if (response.error) {
        throw new Error(response.error || "Lỗi khi import dữ liệu");
      }

      setProgress(100);
      setImportResult(response);
      toast.success(response.message || "Import thành công");

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setIsImporting(false);
        setProgress(0);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 1000);
    } catch (error) {
      setIsImporting(false);
      setProgress(0);
      toast.error(
        error instanceof Error ? error.message : "Lỗi khi import dữ liệu"
      );
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-slate-600 text-slate-300 hover:bg-slate-800"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Import/Export
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Import/Export {typeLabels[type]}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Xuất dữ liệu ra Excel hoặc import từ file Excel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Export Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-300">
                Xuất dữ liệu
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleExport}
                  disabled={isExporting || isImporting}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Đang xuất..." : "Xuất Excel"}
                </Button>
                <Button
                  onClick={handleDownloadTemplate}
                  disabled={isExporting || isImporting}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Template
                </Button>
              </div>
              {isExporting && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-slate-400">{progress}%</p>
                </div>
              )}
            </div>

            {/* Import Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-300">
                Import dữ liệu
              </h3>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  id="file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                  }}
                />
                <label htmlFor="file-input" className="flex-1 cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExporting || isImporting}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Chọn file
                  </Button>
                </label>
                <Button
                  onClick={handleImport}
                  disabled={isExporting || isImporting || !selectedFile}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? "Đang import..." : "Import"}
                </Button>
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>{selectedFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {isImporting && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-slate-400">{progress}%</p>
                </div>
              )}
              {importResult && (
                <div className="mt-2 p-3 bg-slate-800 rounded-lg text-sm">
                  <p className="text-slate-300 mb-1">
                    Thành công:{" "}
                    <span className="text-emerald-400">
                      {importResult.success}
                    </span>{" "}
                    | Thất bại:{" "}
                    <span className="text-red-400">{importResult.failed}</span>
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-slate-400 cursor-pointer">
                        Chi tiết lỗi
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-red-400 max-h-32 overflow-y-auto">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsOpen(false);
                setImportResult(null);
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

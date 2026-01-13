import * as XLSX from "xlsx";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/mongodb";
import { Dividend } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const filter = { userId: user._id };

    const dividends = await Dividend.find(filter).sort({ dividendDate: -1 });

    // Prepare data for Excel
    const excelData = dividends.map((dividend) => ({
      "Ngày chia tách": new Date(dividend.dividendDate).toLocaleDateString(
        "vi-VN"
      ),
      "Mã CP": dividend.stockCode,
      Loại: dividend.type === "STOCK" ? "Cổ phiếu" : "Tiền mặt",
      "Giá trị": dividend.value,
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Ngày chia tách
      { wch: 10 }, // Mã CP
      { wch: 15 }, // Loại
      { wch: 15 }, // Giá trị
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Cổ tức");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="dividends-${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting dividends:", error);
    return NextResponse.json(
      { error: "Lỗi khi xuất dữ liệu" },
      { status: 500 }
    );
  }
}

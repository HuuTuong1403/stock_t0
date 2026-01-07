import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Stock } from "@/lib/models";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const stocks = await Stock.find({}).sort({ code: 1 });

    // Prepare data for Excel
    const excelData = stocks.map((stock) => ({
      "Mã CP": stock.code,
      "Tên doanh nghiệp": stock.name,
      "Giá thị trường": stock.marketPrice,
      "Giá vốn hiện tại": stock.currentCostBasis,
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 10 }, // Mã CP
      { wch: 30 }, // Tên doanh nghiệp
      { wch: 15 }, // Giá thị trường
      { wch: 18 }, // Giá vốn hiện tại
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Cổ phiếu");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="stocks-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting stocks:", error);
    return NextResponse.json(
      { error: "Lỗi khi xuất dữ liệu" },
      { status: 500 }
    );
  }
}


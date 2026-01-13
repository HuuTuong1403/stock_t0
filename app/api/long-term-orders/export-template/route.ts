import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    // Create template data with headers and example row
    const templateData = [
      {
        "Ngày giao dịch": "2024-01-15",
        "Mã CP": "VIC",
        "CTCK": "ID của công ty chứng khoán",
        "Loại": "BUY",
        "Số lượng": 1000,
        "Giá": 50000,
      },
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Ngày giao dịch
      { wch: 10 }, // Mã CP
      { wch: 30 }, // CTCK
      { wch: 8 }, // Loại
      { wch: 12 }, // Số lượng
      { wch: 12 }, // Giá
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template-long-term-orders.xlsx"',
      },
    });
  } catch (error) {
    console.error("Error generating template:", error);
    return NextResponse.json(
      { error: "Lỗi khi tạo template" },
      { status: 500 }
    );
  }
}


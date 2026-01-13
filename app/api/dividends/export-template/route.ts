import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Create template data with headers and example row
    const templateData = [
      {
        "Ngày chia tách": "2024-01-15",
        "Mã CP": "VIC",
        Loại: "CASH",
        "Giá trị": 1000,
      },
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Ngày chia tách
      { wch: 10 }, // Mã CP
      { wch: 15 }, // Loại
      { wch: 15 }, // Giá trị
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template-dividends.xlsx"',
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

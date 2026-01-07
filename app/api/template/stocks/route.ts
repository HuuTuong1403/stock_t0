import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    // Create template data with headers and example row
    const templateData = [
      {
        "Mã CP": "VIC",
        "Tên doanh nghiệp": "Tập đoàn Vingroup",
        "Giá thị trường": 50000,
        "Giá vốn hiện tại": 45000,
      },
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    const columnWidths = [
      { wch: 10 }, // Mã CP
      { wch: 30 }, // Tên doanh nghiệp
      { wch: 15 }, // Giá thị trường
      { wch: 18 }, // Giá vốn hiện tại
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="template-stocks.xlsx"',
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


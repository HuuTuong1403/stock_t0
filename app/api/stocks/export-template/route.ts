import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    // Create template data with headers and example row
    const templateData = [
      {
        "Mã CP": "VIC",
        "Tên doanh nghiệp": "Tập đoàn Vingroup",
        "Ngành hàng": "Bất động sản",
      },
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    const columnWidths = [
      { wch: 10 }, // Mã CP
      { wch: 30 }, // Tên doanh nghiệp
      { wch: 18 }, // Ngành hàng
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

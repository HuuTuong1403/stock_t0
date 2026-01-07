import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { LongTermOrder } from "@/lib/models";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const orders = await LongTermOrder.find({})
      .populate({ path: "companyId", select: "name", strictPopulate: false })
      .sort({ tradeDate: -1 });

    // Prepare data for Excel
    const excelData = orders.map((order) => ({
      "Ngày giao dịch": new Date(order.tradeDate).toLocaleDateString("vi-VN"),
      "Mã CP": order.stockCode,
      "CTCK": typeof order.companyId === "object" ? order.companyId?.name : "-",
      "Loại": order.type === "BUY" ? "MUA" : "BÁN",
      "Số lượng": order.quantity,
      "Giá": order.price,
      "Phí": order.fee,
      "Thuế": order.tax,
      "Giá vốn": order.costBasis,
      "Lợi nhuận": order.profit,
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Ngày giao dịch
      { wch: 10 }, // Mã CP
      { wch: 20 }, // CTCK
      { wch: 8 }, // Loại
      { wch: 12 }, // Số lượng
      { wch: 12 }, // Giá
      { wch: 12 }, // Phí
      { wch: 12 }, // Thuế
      { wch: 15 }, // Giá vốn
      { wch: 15 }, // Lợi nhuận
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Lệnh dài hạn");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="long-term-orders-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting long-term orders:", error);
    return NextResponse.json(
      { error: "Lỗi khi xuất dữ liệu" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { T0Order } from "@/lib/models";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const filter = user.type === "admin" ? {} : { userId: user._id };

    const orders = await T0Order.find(filter)
      .populate({ path: "companyId", select: "name", strictPopulate: false })
      .sort({ tradeDate: -1 });

    // Prepare data for Excel
    const excelData = orders.map((order) => ({
      "Ngày giao dịch": new Date(order.tradeDate).toLocaleDateString("vi-VN"),
      "Mã CP": order.stockCode,
      "CTCK": typeof order.companyId === "object" ? (order.companyId as unknown as { name: string })?.name : "-",
      "Số lượng": order.quantity,
      "Giá mua": order.buyPrice,
      "Giá bán": order.sellPrice,
      "Giá trị mua": order.buyValue,
      "Giá trị bán": order.sellValue,
      "Phí mua": order.buyFee,
      "Phí bán": order.sellFee,
      "Thuế": order.sellTax,
      "Lợi nhuận trước phí": order.profitBeforeFees,
      "Lợi nhuận sau phí": order.profitAfterFees,
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Ngày giao dịch
      { wch: 10 }, // Mã CP
      { wch: 20 }, // CTCK
      { wch: 12 }, // Số lượng
      { wch: 12 }, // Giá mua
      { wch: 12 }, // Giá bán
      { wch: 15 }, // Giá trị mua
      { wch: 15 }, // Giá trị bán
      { wch: 12 }, // Phí mua
      { wch: 12 }, // Phí bán
      { wch: 12 }, // Thuế
      { wch: 20 }, // Lợi nhuận trước phí
      { wch: 20 }, // Lợi nhuận sau phí
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Lệnh T0");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="t0-orders-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting T0 orders:", error);
    return NextResponse.json(
      { error: "Lỗi khi xuất dữ liệu" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { T0Order, StockCompany } from "@/lib/models";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Không có file được tải lên" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "File Excel không có dữ liệu" },
        { status: 400 }
      );
    }

    // Get all companies for lookup
    const companyFilter = { userId: user._id };
    const companies = await StockCompany.find(companyFilter);
    const companyMap = new Map(
      companies.map((c) => [c.name, c._id.toString()])
    );

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as Record<string, unknown>;

        // Map Excel columns to model fields
        const tradeDateStr = String(row["Ngày giao dịch"] || "");
        const stockCode = String(row["Mã CP"] || "")
          .toUpperCase()
          .trim();
        const companyName = String(row["CTCK"] || "").trim();
        const quantity = Number(row["Số lượng"] || 0);
        const buyPrice = Number(row["Giá mua"] || 0);
        const sellPrice = Number(row["Giá bán"] || 0);

        // Validation
        if (
          !tradeDateStr ||
          !stockCode ||
          !companyName ||
          !quantity ||
          !buyPrice ||
          !sellPrice
        ) {
          results.failed++;
          results.errors.push(`Dòng ${i + 2}: Thiếu thông tin bắt buộc`);
          continue;
        }

        // Parse date
        const tradeDate = new Date(tradeDateStr);
        if (isNaN(tradeDate.getTime())) {
          results.failed++;
          results.errors.push(`Dòng ${i + 2}: Ngày giao dịch không hợp lệ`);
          continue;
        }

        // Find company - try by ID first, then by name
        let company = companies.find((c) => c._id.toString() === companyName);
        if (!company) {
          const companyId = companyMap.get(companyName);
          if (companyId) {
            company = companies.find((c) => c._id.toString() === companyId);
          }
        }

        if (!company) {
          results.failed++;
          results.errors.push(
            `Dòng ${
              i + 2
            }: Không tìm thấy công ty chứng khoán "${companyName}" (nhập ID hoặc tên công ty)`
          );
          continue;
        }

        // Create order
        const orderData = {
          tradeDate,
          stockCode,
          company: company._id.toString(),
          userId: user._id,
          quantity,
          buyPrice,
          sellPrice,
        };

        const order = new T0Order(orderData);
        await order.save();
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Dòng ${i + 2}: ${
            error instanceof Error ? error.message : "Lỗi không xác định"
          }`
        );
      }
    }

    return NextResponse.json({
      message: `Import hoàn tất: ${results.success} thành công, ${results.failed} thất bại`,
      ...results,
    });
  } catch (error) {
    console.error("Error importing T0 orders:", error);
    return NextResponse.json(
      { error: "Lỗi khi import dữ liệu" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Dividend } from "@/lib/models";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
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
        const dividendDateStr = String(row["Ngày chia tách"] || "");
        const stockCode = String(row["Mã CP"] || "").toUpperCase().trim();
        const typeStr = String(row["Loại"] || "").toUpperCase().trim();
        const value = Number(row["Giá trị"] || 0);

        // Validation
        if (!dividendDateStr || !stockCode || !typeStr || !value) {
          results.failed++;
          results.errors.push(`Dòng ${i + 2}: Thiếu thông tin bắt buộc`);
          continue;
        }

        // Validate type
        let type: "STOCK" | "CASH";
        if (typeStr === "STOCK" || typeStr === "CỔ PHIẾU") {
          type = "STOCK";
        } else if (typeStr === "CASH" || typeStr === "TIỀN MẶT") {
          type = "CASH";
        } else {
          results.failed++;
          results.errors.push(`Dòng ${i + 2}: Loại không hợp lệ (phải là STOCK/CỔ PHIẾU hoặc CASH/TIỀN MẶT)`);
          continue;
        }

        // Parse date
        const dividendDate = new Date(dividendDateStr);
        if (isNaN(dividendDate.getTime())) {
          results.failed++;
          results.errors.push(`Dòng ${i + 2}: Ngày chia tách không hợp lệ`);
          continue;
        }

        // Create dividend
        const dividend = await Dividend.create({
          dividendDate,
          stockCode,
          type,
          value,
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Dòng ${i + 2}: ${error instanceof Error ? error.message : "Lỗi không xác định"}`
        );
      }
    }

    return NextResponse.json({
      message: `Import hoàn tất: ${results.success} thành công, ${results.failed} thất bại`,
      ...results,
    });
  } catch (error) {
    console.error("Error importing dividends:", error);
    return NextResponse.json(
      { error: "Lỗi khi import dữ liệu" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Stock } from "@/lib/models";
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
        const code = String(row["Mã CP"] || "").toUpperCase().trim();
        const name = String(row["Tên doanh nghiệp"] || "").trim();
        const marketPrice = Number(row["Giá thị trường"] || 0);
        const currentCostBasis = Number(row["Giá vốn hiện tại"] || 0);

        // Validation
        if (!code || !name) {
          results.failed++;
          results.errors.push(`Dòng ${i + 2}: Thiếu mã CP hoặc tên doanh nghiệp`);
          continue;
        }

        // Check if stock already exists
        const existingStock = await Stock.findOne({ code });
        if (existingStock) {
          // Update existing stock
          existingStock.name = name;
          existingStock.marketPrice = marketPrice;
          existingStock.currentCostBasis = currentCostBasis;
          await existingStock.save();
          results.success++;
        } else {
          // Create new stock
          await Stock.create({
            code,
            name,
            marketPrice,
            currentCostBasis,
          });
          results.success++;
        }
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
    console.error("Error importing stocks:", error);
    return NextResponse.json(
      { error: "Lỗi khi import dữ liệu" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StockCompany } from "@/lib/models";

export async function GET() {
  try {
    await dbConnect();
    const companies = await StockCompany.find({}).sort({ name: 1 });
    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching stock companies:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách công ty chứng khoán" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    // If this company is set as default, unset other defaults
    if (body.isDefault) {
      await StockCompany.updateMany({}, { isDefault: false });
    }

    const company = await StockCompany.create(body);
    return NextResponse.json(company, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating stock company:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Tên công ty chứng khoán đã tồn tại" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Lỗi khi tạo công ty chứng khoán" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StockCompany } from "@/lib/models";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const companies = await StockCompany.find({ userId: user._id }).sort({
      name: 1,
    });
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
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const body = await request.json();

    // If this company is set as default, unset other defaults
    if (body.isDefault) {
      await StockCompany.updateMany({ userId: user._id }, { isDefault: false });
    }

    const company = await StockCompany.create({
      ...body,
      userId: user._id,
    });
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

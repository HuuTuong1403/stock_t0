import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Stock } from "@/lib/models";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;

    const stocks = await Stock.find({ userId: user._id }).sort({ code: 1 });
    console.log("🚀 => stocks:", stocks)

    return NextResponse.json(stocks);
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách cổ phiếu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;

    const stock = await Stock.create({ ...body, userId: user._id });
    return NextResponse.json(stock, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating stock:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Mã cổ phiếu đã tồn tại" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Lỗi khi tạo cổ phiếu" },
      { status: 500 }
    );
  }
}

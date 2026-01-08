import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Dividend } from "@/lib/models";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const searchParams = request.nextUrl.searchParams;
    const stockCode = searchParams.get("stockCode");
    const type = searchParams.get("type");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    if (user.type !== "admin") {
      filter.userId = user._id;
    }

    if (stockCode) {
      filter.stockCode = stockCode === "all" ? { $exists: true } : stockCode.toUpperCase();
    }

    if (type && (type === "STOCK" || type === "CASH")) {
      filter.type = type;
    }

    const dividends = await Dividend.find(filter).sort({ dividendDate: -1 });
    return NextResponse.json(dividends);
  } catch (error) {
    console.error("Error fetching dividends:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách cổ tức" },
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
    const dividend = await Dividend.create({
      ...body,
      userId: user._id,
    });
    return NextResponse.json(dividend, { status: 201 });
  } catch (error) {
    console.error("Error creating dividend:", error);
    return NextResponse.json({ error: "Lỗi khi tạo cổ tức" }, { status: 500 });
  }
}

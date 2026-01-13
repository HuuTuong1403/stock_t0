import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/mongodb";
import { IUser, Stock, User } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";
import { subscribeStock } from "@/lib/services/wss-client";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await requireAuth(request);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const industry = searchParams.get("industry") || "";

    // Build filter
    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { industry: { $regex: search, $options: "i" } },
      ];
    }
    if (industry) {
      filter.industry = industry;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Stock.countDocuments(filter);

    // Get stocks with pagination
    const stocks = await Stock.find(filter)
      .sort({ code: 1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      data: stocks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
    const user = await User.findById(auth.user._id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { investorToken, investorId } = user as IUser;

    if (user.type !== "admin") {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập" },
        { status: 403 }
      );
    }

    const stock = await Stock.create({ ...body });
    if (investorToken && investorId) {
      await subscribeStock(
        stock.code,
        investorToken,
        investorId,
        user._id.toString()
      ).catch(console.error);
    }
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

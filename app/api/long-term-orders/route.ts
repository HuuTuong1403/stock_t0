import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { LongTermOrder, StockCompany } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const companyId = searchParams.get("companyId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { userId: user._id };

    if (stockCode) {
      filter.stockCode =
        stockCode === "all" ? { $exists: true } : stockCode.toUpperCase();
    }

    if (companyId) {
      filter.company = companyId;
    }

    if (type && (type === "BUY" || type === "SELL")) {
      filter.type = type;
    }

    if (startDate || endDate) {
      filter.tradeDate = {};
      if (startDate) {
        filter.tradeDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.tradeDate.$lte = new Date(endDate);
      }
    }

    const orders = await LongTermOrder.find(filter)
      .populate({
        path: "company",
        select: "name buyFeeRate sellFeeRate taxRate",
        strictPopulate: false,
      })
      .sort({ tradeDate: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching long-term orders:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách lệnh dài hạn" },
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

    const orderData = {
      ...body,
      userId: user._id,
    };

    const order = new LongTermOrder(orderData);
    await order.save();
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating long-term order:", error);
    return NextResponse.json(
      { error: "Lỗi khi tạo lệnh dài hạn" },
      { status: 500 }
    );
  }
}

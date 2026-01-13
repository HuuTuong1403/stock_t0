import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { T0Order } from "@/lib/models";
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
    const companyId = searchParams.get("companyId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { userId: user._id };

    if (stockCode) {
      filter.stockCode =
        stockCode === "all" ? { $exists: true } : stockCode.toUpperCase();
    }

    if (companyId) {
      filter.company = companyId;
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

    const orders = await T0Order.find(filter)
      .populate({ path: "stockUser", select: "name", strictPopulate: false })
      .populate({
        path: "company",
        select: "name buyFeeRate sellFeeRate taxRate",
        strictPopulate: false,
      })
      .sort({ tradeDate: -1 });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching T0 orders:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách lệnh T0" },
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

    // Add fee rates to the order
    const orderData = {
      ...body,
      userId: user._id,
    };

    const order = new T0Order(orderData);
    await order.save();
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating T0 order:", error);
    return NextResponse.json({ error: "Lỗi khi tạo lệnh T0" }, { status: 500 });
  }
}

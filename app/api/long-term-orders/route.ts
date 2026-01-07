import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { LongTermOrder, StockCompany } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const searchParams = request.nextUrl.searchParams;
    const stockCode = searchParams.get("stockCode");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (stockCode) {
      filter.stockCode =
        stockCode === "all" ? { $exists: true } : stockCode.toUpperCase();
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
      .populate({ path: "companyId", select: "name", strictPopulate: false })
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
    const body = await request.json();

    // Get the company to fetch fee rates
    const company = await StockCompany.findById(body.companyId);
    if (!company) {
      return NextResponse.json(
        { error: "Không tìm thấy công ty chứng khoán" },
        { status: 400 }
      );
    }

    // Add fee rates to the order
    // For BUY: use buyFeeRate, For SELL: use sellFeeRate
    const orderData = {
      ...body,
      feeRate: body.type === "BUY" ? company.buyFeeRate : company.sellFeeRate,
      taxRate: company.taxRate,
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

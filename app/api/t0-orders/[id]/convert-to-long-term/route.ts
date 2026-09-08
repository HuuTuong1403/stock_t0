import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { LongTermOrder, T0Order } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const { id } = await params;
    const body = await request.json();
    const { accountType } = body;

    if (accountType !== "NORMAL" && accountType !== "MARGIN") {
      return NextResponse.json(
        { error: "Loại tài khoản phải là NORMAL hoặc MARGIN" },
        { status: 400 }
      );
    }

    const t0Order = await T0Order.findOne({
      _id: id,
      userId: user._id,
    });

    if (!t0Order) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh T0" },
        { status: 404 }
      );
    }

    const companyId =
      typeof t0Order.company === "object" &&
      t0Order.company !== null &&
      "_id" in t0Order.company
        ? t0Order.company._id
        : t0Order.company;

    const longTermOrder = new LongTermOrder({
      tradeDate: t0Order.tradeDate,
      stockCode: t0Order.stockCode,
      company: companyId,
      userId: user._id,
      type: "BUY",
      accountType,
      quantity: t0Order.quantity,
      price: t0Order.buyPrice,
    });
    await longTermOrder.save();

    try {
      await T0Order.deleteOne({ _id: t0Order._id });
    } catch (deleteError) {
      console.error("Error deleting original T0 order:", deleteError);
      return NextResponse.json(
        {
          error:
            "Đã tạo lệnh dài hạn nhưng không xóa được lệnh T0 gốc. Vui lòng xóa thủ công.",
          longTermOrder,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(longTermOrder, { status: 201 });
  } catch (error) {
    console.error("Error converting T0 order to long-term:", error);
    return NextResponse.json(
      { error: "Lỗi khi chuyển lệnh T0 thành dài hạn" },
      { status: 500 }
    );
  }
}

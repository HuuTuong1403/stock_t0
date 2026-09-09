import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { LongTermOrder, T0Order } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";
import { recalculateSubsequentLongTermOrders } from "@/lib/utils/recalc-subsequent-long-term";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseConvertQuantity(
  raw: unknown,
  originalQuantity: number
): number | null {
  if (raw === undefined || raw === null || raw === "") {
    return originalQuantity;
  }
  const qty = Number(raw);
  if (!Number.isInteger(qty) || qty < 1 || qty > originalQuantity) {
    return null;
  }
  return qty;
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
    const { accountType, quantity } = body;

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

    const convertQty = parseConvertQuantity(quantity, t0Order.quantity);
    if (convertQty === null) {
      return NextResponse.json(
        {
          error: `Số lượng chuyển phải là số nguyên từ 1 đến ${t0Order.quantity}`,
        },
        { status: 400 }
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
      quantity: convertQty,
      price: t0Order.buyPrice,
    });
    await longTermOrder.save();

    try {
      await recalculateSubsequentLongTermOrders({
        _id: longTermOrder._id,
        userId: longTermOrder.userId,
        stockCode: longTermOrder.stockCode,
        company: companyId,
        tradeDate: longTermOrder.tradeDate,
        createdAt: longTermOrder.createdAt,
      });
    } catch (recalcError) {
      console.error(
        "Error recalculating subsequent long-term orders:",
        recalcError
      );
      return NextResponse.json(
        {
          error:
            "Đã tạo lệnh dài hạn nhưng không tính lại được giá TB các lệnh sau. Vui lòng kiểm tra thủ công.",
          longTermOrder,
        },
        { status: 500 }
      );
    }

    try {
      if (convertQty === t0Order.quantity) {
        await T0Order.deleteOne({ _id: t0Order._id });
      } else {
        t0Order.quantity = t0Order.quantity - convertQty;
        await t0Order.save();
      }
    } catch (updateError) {
      console.error("Error updating original T0 order:", updateError);
      return NextResponse.json(
        {
          error:
            "Đã tạo lệnh dài hạn nhưng không cập nhật được lệnh T0 gốc. Vui lòng xử lý thủ công.",
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

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { LongTermOrder, T0Order } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

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
    const { tradeDate, sellPrice, quantity } = body;

    if (!tradeDate || sellPrice === undefined || sellPrice === null) {
      return NextResponse.json(
        { error: "Ngày giao dịch và giá bán là bắt buộc" },
        { status: 400 }
      );
    }

    const parsedSellPrice = Number(sellPrice);
    if (Number.isNaN(parsedSellPrice) || parsedSellPrice < 0) {
      return NextResponse.json(
        { error: "Giá bán không hợp lệ" },
        { status: 400 }
      );
    }

    const longTermOrder = await LongTermOrder.findOne({
      _id: id,
      userId: user._id,
    });

    if (!longTermOrder) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh dài hạn" },
        { status: 404 }
      );
    }

    if (longTermOrder.type !== "BUY") {
      return NextResponse.json(
        { error: "Chỉ có thể chuyển lệnh MUA dài hạn thành lệnh T0" },
        { status: 400 }
      );
    }

    const convertQty = parseConvertQuantity(quantity, longTermOrder.quantity);
    if (convertQty === null) {
      return NextResponse.json(
        {
          error: `Số lượng chuyển phải là số nguyên từ 1 đến ${longTermOrder.quantity}`,
        },
        { status: 400 }
      );
    }

    const companyId =
      typeof longTermOrder.company === "object" &&
      longTermOrder.company !== null &&
      "_id" in longTermOrder.company
        ? longTermOrder.company._id
        : longTermOrder.company;

    const t0Order = new T0Order({
      tradeDate,
      stockCode: longTermOrder.stockCode,
      company: companyId,
      userId: user._id,
      quantity: convertQty,
      buyPrice: longTermOrder.price,
      sellPrice: parsedSellPrice,
    });
    await t0Order.save();

    try {
      if (convertQty === longTermOrder.quantity) {
        await LongTermOrder.deleteOne({ _id: longTermOrder._id });
      } else {
        longTermOrder.quantity = longTermOrder.quantity - convertQty;
        await longTermOrder.save();
      }
    } catch (updateError) {
      console.error("Error updating original long-term order:", updateError);
      return NextResponse.json(
        {
          error:
            "Đã tạo lệnh T0 nhưng không cập nhật được lệnh dài hạn gốc. Vui lòng xử lý thủ công.",
          t0Order,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(t0Order, { status: 201 });
  } catch (error) {
    console.error("Error converting long-term order to T0:", error);
    return NextResponse.json(
      { error: "Lỗi khi chuyển lệnh dài hạn thành T0" },
      { status: 500 }
    );
  }
}

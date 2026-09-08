import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Dividend, LongTermOrder } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";
import { getCashDividendPriceReduction } from "@/lib/constants/dividend";
import {
  applyCashDividend,
  applyStockDividend,
  getStockSplitRatio,
} from "@/lib/utils/dividend-adjust";

/**
 * Adjust stock orders based on dividend (both STOCK and CASH)
 *
 * STOCK DIVIDEND (cổ tức cổ phiếu):
 *   - Số lượng cổ phiếu tăng theo tỷ lệ (1 + value/100)
 *   - Giá giảm tương ứng theo thang 1000
 *
 * CASH DIVIDEND (cổ tức tiền mặt):
 *   - Số lượng cổ phiếu không đổi
 *   - Giá giảm theo mệnh giá 10.000đ × tỷ lệ %
 *
 * POST /api/dividends/adjust-orders
 * Body: { dividendId: string }
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const body = await request.json();
    const { dividendId } = body;

    if (!dividendId) {
      return NextResponse.json(
        { error: "dividendId là bắt buộc" },
        { status: 400 }
      );
    }

    const dividend = await Dividend.findOne({
      _id: dividendId,
      userId: user._id,
    });

    if (!dividend) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ tức" },
        { status: 404 }
      );
    }

    if (dividend.isUsed) {
      return NextResponse.json(
        { error: "Cổ tức này đã được điều chỉnh lệnh" },
        { status: 400 }
      );
    }

    const longTermOrders = await LongTermOrder.find({
      stockCode: dividend.stockCode,
      tradeDate: { $lt: dividend.dividendDate },
      userId: user._id,
    });

    if (longTermOrders.length === 0) {
      return NextResponse.json({
        message: "Không có lệnh dài hạn nào cần điều chỉnh",
        adjusted: 0,
      });
    }

    const splitRatio = getStockSplitRatio(dividend.value);
    let adjustedCount = 0;

    for (const order of longTermOrders) {
      if (dividend.type === "STOCK") {
        applyStockDividend(order, splitRatio);
      } else {
        applyCashDividend(order, dividend.value);
      }
      await order.save();
      adjustedCount++;
    }

    await Dividend.findByIdAndUpdate(dividendId, { isUsed: true });

    return NextResponse.json({
      message: `Đã điều chỉnh ${adjustedCount} lệnh dài hạn`,
      adjusted: adjustedCount,
      dividend: {
        stockCode: dividend.stockCode,
        dividendDate: dividend.dividendDate,
        value: dividend.value,
        type: dividend.type,
      },
      adjustmentType:
        dividend.type === "STOCK"
          ? "Tăng số lượng, giảm giá (stock dividend)"
          : `Giảm giá ${getCashDividendPriceReduction(dividend.value)}đ (mệnh giá 10.000đ × ${dividend.value}%), số lượng không đổi (cash dividend)`,
      note: "Lệnh T0 (giao dịch trong ngày) không bị điều chỉnh vì đã đóng vị thế",
    });
  } catch (error) {
    console.error("Error adjusting orders:", error);
    return NextResponse.json(
      { error: "Lỗi khi điều chỉnh lệnh giao dịch" },
      { status: 500 }
    );
  }
}

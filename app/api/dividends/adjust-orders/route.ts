import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Dividend, LongTermOrder } from "@/lib/models";
import { requireAuth } from "@/lib/auth";

/**
 * Adjust stock orders based on dividend split
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

    // Get dividend information
    const dividend = await Dividend.findOne({
      _id: dividendId,
      ...(user.type !== "admin" ? { userId: user._id } : {}),
    });
    if (!dividend) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ tức" },
        { status: 404 }
      );
    }

    // Only adjust for stock dividends, not cash
    if (dividend.type !== "STOCK") {
      return NextResponse.json({
        message: "Cổ tức tiền mặt không cần điều chỉnh",
        adjusted: 0,
      });
    }

    const splitRatio = 1 + dividend.value / 100; // e.g., 10% -> 1.1

    // Find all long-term orders before the split date with the same stock code
    // Note: T0 orders are intraday trades (closed positions), so they are NOT adjusted
    const longTermOrders = await LongTermOrder.find({
      stockCode: dividend.stockCode,
      tradeDate: { $lt: dividend.dividendDate },
      ...(user.type !== "admin" ? { userId: user._id } : {}),
    });

    let adjustedCount = 0;

    // ===== Adjust Long-term Orders =====
    if (longTermOrders.length > 0) {
      // Calculate total quantity
      const totalLTQuantity = longTermOrders.reduce(
        (sum, order) => sum + order.quantity,
        0
      );

      // Calculate new total quantity (round properly to avoid fractional shares)
      const newTotalLTQuantity = Math.round(totalLTQuantity * splitRatio);

      // Adjust each order proportionally with proper rounding
      let totalAdjusted = 0;
      const adjustedQuantities: number[] = [];

      for (let i = 0; i < longTermOrders.length; i++) {
        const order = longTermOrders[i];
        const proportion = order.quantity / totalLTQuantity;
        const adjustedQuantity = Math.round(newTotalLTQuantity * proportion);

        adjustedQuantities.push(adjustedQuantity);
        totalAdjusted += adjustedQuantity;
      }

      // Fix rounding differences to ensure total matches exactly
      let difference = newTotalLTQuantity - totalAdjusted;
      while (difference !== 0) {
        for (
          let i = 0;
          i < adjustedQuantities.length && difference !== 0;
          i++
        ) {
          if (difference > 0) {
            adjustedQuantities[i]++;
            difference--;
          } else {
            if (adjustedQuantities[i] > 0) {
              adjustedQuantities[i]--;
              difference++;
            }
          }
        }
      }

      // Apply the adjusted quantities
      for (let i = 0; i < longTermOrders.length; i++) {
        const order = longTermOrders[i];

        order.quantity = adjustedQuantities[i];

        // New price = old price / split ratio (round down)
        order.price = Math.floor(order.price / splitRatio);

        // For BUY orders, costBasis will be recalculated in middleware
        // For SELL orders, adjust costBasis proportionally
        if (order.type === "SELL" && order.costBasis > 0) {
          // costBasis increases proportionally with quantity
          order.costBasis = Math.floor(order.costBasis * splitRatio);
        }

        // Recalculate will happen in pre-save middleware
        await order.save();
        adjustedCount++;
      }
    }

    return NextResponse.json({
      message: `Đã điều chỉnh ${adjustedCount} lệnh dài hạn`,
      adjusted: adjustedCount,
      dividend: {
        stockCode: dividend.stockCode,
        dividendDate: dividend.dividendDate,
        value: dividend.value,
        type: dividend.type,
      },
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

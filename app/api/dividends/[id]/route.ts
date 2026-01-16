import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/mongodb";
import { Dividend, LongTermOrder } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const { id } = await params;
    const dividendId = new Types.ObjectId(id);
    const userId = new Types.ObjectId(String(user._id));
    const dividend = await Dividend.findOne({
      _id: dividendId,
      userId,
    });

    if (!dividend) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ tức" },
        { status: 404 }
      );
    }
    return NextResponse.json(dividend);
  } catch (error) {
    console.error("Error fetching dividend:", error);
    return NextResponse.json({ error: "Lỗi khi tải cổ tức" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const { id } = await params;
    const dividendId = new Types.ObjectId(id);
    const userId = new Types.ObjectId(String(user._id));
    const body = await request.json();
    const dividend = await Dividend.findOneAndUpdate(
      {
        _id: dividendId,
        userId,
      },
      body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!dividend) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ tức" },
        { status: 404 }
      );
    }
    return NextResponse.json(dividend);
  } catch (error) {
    console.error("Error updating dividend:", error);
    return NextResponse.json(
      { error: "Lỗi khi cập nhật cổ tức" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const { id } = await params;
    const dividendId = new Types.ObjectId(id);
    const userId = new Types.ObjectId(String(user._id));

    // First, find the dividend to check if it was used
    const dividend = await Dividend.findOne({
      _id: dividendId,
      userId,
    });

    if (!dividend) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ tức" },
        { status: 404 }
      );
    }

    let revertedCount = 0;

    // If dividend was used (adjustments were made), revert them
    if (dividend.isUsed) {
      // Find all long-term orders that were adjusted
      const longTermOrders = await LongTermOrder.find({
        stockCode: dividend.stockCode,
        tradeDate: { $lt: dividend.dividendDate },
        userId: user._id,
      });

      if (longTermOrders.length > 0) {
        if (dividend.type === "STOCK") {
          // REVERT STOCK DIVIDEND: Giảm số lượng, tăng giá về ban đầu
          const splitRatio = 1 + dividend.value / 100; // e.g., 10% -> 1.1

          // Calculate current total quantity
          const totalCurrentQuantity = longTermOrders.reduce(
            (sum, order) => sum + order.quantity,
            0
          );

          // Calculate original total quantity (before split)
          const totalOriginalQuantity = Math.round(
            totalCurrentQuantity / splitRatio
          );

          // Adjust each order back proportionally
          let totalAdjusted = 0;
          const originalQuantities: number[] = [];

          for (let i = 0; i < longTermOrders.length; i++) {
            const order = longTermOrders[i];
            const proportion = order.quantity / totalCurrentQuantity;
            const originalQuantity = Math.round(
              totalOriginalQuantity * proportion
            );

            originalQuantities.push(originalQuantity);
            totalAdjusted += originalQuantity;
          }

          // Fix rounding differences
          let difference = totalOriginalQuantity - totalAdjusted;
          while (difference !== 0) {
            for (
              let i = 0;
              i < originalQuantities.length && difference !== 0;
              i++
            ) {
              if (difference > 0) {
                originalQuantities[i]++;
                difference--;
              } else {
                if (originalQuantities[i] > 0) {
                  originalQuantities[i]--;
                  difference++;
                }
              }
            }
          }

          // Apply the original quantities and prices
          for (let i = 0; i < longTermOrders.length; i++) {
            const order = longTermOrders[i];

            order.quantity = originalQuantities[i];

            // Original price = current price * split ratio
            order.price = Math.floor(order.price * splitRatio);

            // For SELL orders, revert costBasis
            if (order.type === "SELL" && order.costBasis > 0) {
              order.costBasis = Math.floor(order.costBasis / splitRatio);
            }

            await order.save();
            revertedCount++;
          }
        } else {
          // REVERT CASH DIVIDEND: Tăng giá về ban đầu, số lượng không đổi
          const priceAdjustmentRatio = 1 - dividend.value / 100; // e.g., 10% -> 0.9
          const revertRatio = 1 / priceAdjustmentRatio; // e.g., 0.9 -> 1.111...

          for (const order of longTermOrders) {
            // Revert price back to original
            order.price = Math.floor(order.price * revertRatio);

            // Quantity remains the same
            await order.save();
            revertedCount++;
          }
        }
      }
    }

    // Now delete the dividend
    await Dividend.findByIdAndDelete(dividendId);

    return NextResponse.json({
      message: "Đã xóa cổ tức thành công",
      reverted: revertedCount,
      note:
        revertedCount > 0
          ? `Đã hoàn tác điều chỉnh cho ${revertedCount} lệnh dài hạn`
          : "Không có lệnh nào cần hoàn tác",
    });
  } catch (error) {
    console.error("Error deleting dividend:", error);
    return NextResponse.json({ error: "Lỗi khi xóa cổ tức" }, { status: 500 });
  }
}

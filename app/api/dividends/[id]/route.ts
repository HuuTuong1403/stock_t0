import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/mongodb";
import { Dividend, LongTermOrder } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";
import {
  getStockSplitRatio,
  revertCashDividend,
  revertStockDividend,
} from "@/lib/utils/dividend-adjust";

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

    if (dividend.isUsed) {
      const longTermOrders = await LongTermOrder.find({
        stockCode: dividend.stockCode,
        tradeDate: { $lt: dividend.dividendDate },
        userId: user._id,
      });

      const splitRatio = getStockSplitRatio(dividend.value);

      for (const order of longTermOrders) {
        if (dividend.type === "STOCK") {
          revertStockDividend(order, splitRatio);
        } else {
          revertCashDividend(order, dividend.value);
        }
        await order.save();
        revertedCount++;
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

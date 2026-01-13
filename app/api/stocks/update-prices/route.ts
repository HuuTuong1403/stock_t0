import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/mongodb";
import { IUser } from "@/lib/models/User";
import { Stock, User } from "@/lib/models";
import { subscribeBatch } from "@/lib/services/wss-client";

/**
 * Shared function để update prices
 */
async function updatePrices() {
  await dbConnect();

  // Get user credentials (using hardcoded user ID for now, same as subscribe route)
  const userId = "6965f14d5ad4273f2010d5a4";
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const { investorToken, investorId } = user as IUser;

  if (!investorToken || !investorId) {
    throw new Error("Token và investorId là bắt buộc");
  }

  // Get all stocks
  const stocks = await Stock.find({}).select("code");
  const stockCodes = stocks.map((stock) => stock.code);

  if (stockCodes.length === 0) {
    return {
      message: "Không có cổ phiếu nào để cập nhật",
      success: 0,
      failed: 0,
      total: 0,
    };
  }

  console.log(
    `Starting to update prices for ${
      stockCodes.length
    } stocks at ${new Date().toISOString()}`
  );

  const result = await subscribeBatch(
    stockCodes,
    investorToken,
    investorId,
    userId
  );

  return result;
}

/**
 * GET /api/stocks/update-prices
 * Cập nhật giá thị trường cho tất cả cổ phiếu
 * Được gọi bởi Vercel Cron Job
 */
export async function GET(request: NextRequest) {
  try {
    console.log(
      `[CRON] Update prices job triggered at ${new Date().toISOString()}`
    );
    const result = await updatePrices();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CRON] Error updating stock prices:", error);
    return NextResponse.json(
      {
        error: "Lỗi khi cập nhật giá thị trường",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stocks/update-prices
 * Cập nhật giá thị trường cho tất cả cổ phiếu
 * Có thể được gọi manually
 */
export async function POST(request: NextRequest) {
  try {
    console.log(
      `[MANUAL] Update prices triggered at ${new Date().toISOString()}`
    );
    const result = await updatePrices();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[MANUAL] Error updating stock prices:", error);
    return NextResponse.json(
      {
        error: "Lỗi khi cập nhật giá thị trường",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/mongodb";
import { IUser } from "@/lib/models/User";
import { Stock, StockUser, User } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";
import { DNSE_TOKEN_EXPIRED_CODE } from "@/lib/constants/dnse";
import {
  validateInvestorToken,
} from "@/lib/services/dnse";
import { subscribeBatch } from "@/lib/services/wss-client";

const CRON_USER_ID = "6965f14d5ad4273f2010d5a4";

async function updatePricesForCodes(
  userId: string,
  stockCodes: string[],
  emptyMessage: string
) {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const { investorToken } = user as IUser;

  if (!investorToken) {
    const error = new Error(
      "Chưa có token DNSE. Vui lòng cập nhật token trong Cài đặt."
    ) as Error & { code?: string };
    error.code = DNSE_TOKEN_EXPIRED_CODE;
    throw error;
  }

  const tokenValidation = await validateInvestorToken(userId, investorToken);
  if (!tokenValidation.valid) {
    if (tokenValidation.reason === "expired") {
      const error = new Error(
        "Token DNSE đã hết hạn. Vui lòng cập nhật lại trong Cài đặt."
      ) as Error & { code?: string };
      error.code = DNSE_TOKEN_EXPIRED_CODE;
      throw error;
    }
    throw new Error("Không thể kiểm tra token DNSE. Vui lòng thử lại sau.");
  }

  const investorId = tokenValidation.investorId;

  if (stockCodes.length === 0) {
    return {
      message: emptyMessage,
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

  return subscribeBatch(stockCodes, investorToken, investorId, userId);
}

async function updateAllPrices() {
  await dbConnect();
  const stocks = await Stock.find({}).select("code");
  const stockCodes = stocks.map((stock) => stock.code);

  return updatePricesForCodes(
    CRON_USER_ID,
    stockCodes,
    "Không có cổ phiếu nào để cập nhật"
  );
}

async function updateUserPrices(userId: string) {
  await dbConnect();
  const stockCodes = await StockUser.distinct("stockCode", { userId });

  return updatePricesForCodes(
    userId,
    stockCodes,
    "Bạn chưa có cổ phiếu nào để cập nhật"
  );
}

/**
 * GET /api/stocks/update-prices
 * Cập nhật giá thị trường cho tất cả cổ phiếu
 * Được gọi bởi Vercel Cron Job
 */
export async function GET(_request: NextRequest) {
  try {
    console.log(
      `[CRON] Update prices job triggered at ${new Date().toISOString()}`
    );
    const result = await updateAllPrices();
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
 * Cập nhật giá thị trường cho cổ phiếu của user đang đăng nhập
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (auth.user.type !== "admin") {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập" },
        { status: 403 }
      );
    }

    console.log(
      `[MANUAL] Update prices triggered at ${new Date().toISOString()}`
    );
    const result = await updateUserPrices(String(auth.user._id));
    return NextResponse.json(result);
  } catch (error) {
    console.error("[MANUAL] Error updating stock prices:", error);
    const err = error as Error & { code?: string };
    if (err.code === DNSE_TOKEN_EXPIRED_CODE) {
      return NextResponse.json(
        {
          error: err.message,
          code: DNSE_TOKEN_EXPIRED_CODE,
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        error: "Lỗi khi cập nhật giá thị trường",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

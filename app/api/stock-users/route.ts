import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StockUser } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

/**
 * GET /api/stock-users
 * Lấy danh sách StockUser với thông tin company được populate
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;

    const searchParams = request.nextUrl.searchParams;
    const stockCode = searchParams.get("stockCode");
    const companyId = searchParams.get("companyId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { userId: user._id };

    if (stockCode) {
      filter.stockCode = stockCode.toUpperCase();
    }

    if (companyId) {
      filter.company = companyId;
    }

    // Populate company information từ ref StockCompany
    const stockUsers = await StockUser.find(filter)
      .populate({
        path: "company",
        select: "name buyFeeRate sellFeeRate taxRate isDefault",
        strictPopulate: false,
      })
      .sort({ stockCode: 1 });

    return NextResponse.json(stockUsers);
  } catch (error) {
    console.error("Error fetching stock users:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách cổ phiếu người dùng" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stock-users
 * Tạo mới StockUser
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
    const { stockCode, costPrice, company } = body;

    if (!stockCode || !costPrice || !company) {
      return NextResponse.json(
        { error: "Mã cổ phiếu, giá vốn và công ty chứng khoán là bắt buộc" },
        { status: 400 }
      );
    }

    // Kiểm tra xem đã tồn tại StockUser với stockCode và userId chưa
    const existingStockUser = await StockUser.findOne({
      stockCode: stockCode.toUpperCase(),
      userId: user._id,
      company,
    });

    if (existingStockUser) {
      return NextResponse.json(
        { error: "Cổ phiếu đã tồn tại với công ty chứng khoán này" },
        { status: 400 }
      );
    }

    const stockUser = await StockUser.create({
      stockCode: stockCode.toUpperCase(),
      costPrice,
      company,
      userId: user._id,
    });

    // Populate company information trước khi trả về
    const populatedStockUser = await StockUser.findById(stockUser._id)
      .populate({
        path: "company",
        select: "name buyFeeRate sellFeeRate taxRate isDefault",
        strictPopulate: false,
      })
      .exec();

    return NextResponse.json(populatedStockUser, { status: 201 });
  } catch (error) {
    console.error("Error creating stock user:", error);
    return NextResponse.json(
      {
        error: "Lỗi khi tạo cổ phiếu người dùng",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

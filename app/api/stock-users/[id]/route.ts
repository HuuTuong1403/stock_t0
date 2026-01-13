import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StockUser } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/stock-users/[id]
 * Lấy thông tin StockUser theo ID với company được populate
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const { id } = await params;

    const stockUser = await StockUser.findOne({
      _id: id,
      userId: user._id,
    }).populate({
      path: "company",
      select: "name buyFeeRate sellFeeRate taxRate isDefault",
      strictPopulate: false,
    });

    if (!stockUser) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ phiếu người dùng" },
        { status: 404 }
      );
    }

    return NextResponse.json(stockUser);
  } catch (error) {
    console.error("Error fetching stock user:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải thông tin cổ phiếu người dùng" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stock-users/[id]
 * Cập nhật thông tin StockUser
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const { id } = await params;

    const body = await request.json();
    const { costPrice, company } = body;

    const stockUser = await StockUser.findOne({
      _id: id,
      userId: user._id,
    });

    if (!stockUser) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ phiếu người dùng" },
        { status: 404 }
      );
    }

    // Cập nhật các trường
    if (costPrice !== undefined) {
      stockUser.costPrice = costPrice;
    }
    if (company) {
      stockUser.company = company;
    }

    await stockUser.save();

    // Populate company information trước khi trả về
    const populatedStockUser = await StockUser.findById(stockUser._id)
      .populate({
        path: "company",
        select: "name buyFeeRate sellFeeRate taxRate isDefault",
        strictPopulate: false,
      })
      .exec();

    return NextResponse.json(populatedStockUser);
  } catch (error) {
    console.error("Error updating stock user:", error);
    return NextResponse.json(
      {
        error: "Lỗi khi cập nhật cổ phiếu người dùng",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stock-users/[id]
 * Xóa StockUser
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const { id } = await params;

    const stockUser = await StockUser.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!stockUser) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ phiếu người dùng" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Đã xóa cổ phiếu người dùng" });
  } catch (error) {
    console.error("Error deleting stock user:", error);
    return NextResponse.json(
      { error: "Lỗi khi xóa cổ phiếu người dùng" },
      { status: 500 }
    );
  }
}

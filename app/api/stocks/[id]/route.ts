import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Stock } from "@/lib/models";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stock = await Stock.findOne({
      _id: id,
      userId: auth.user._id,
    });
    if (!stock) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ phiếu" },
        { status: 404 }
      );
    }
    return NextResponse.json(stock);
  } catch (error) {
    console.error("Error fetching stock:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải cổ phiếu" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const stock = await Stock.findOneAndUpdate(
      {
        _id: id,
        userId: user._id,
      },
      body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!stock) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ phiếu" },
        { status: 404 }
      );
    }
    return NextResponse.json(stock);
  } catch (error: unknown) {
    console.error("Error updating stock:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Mã cổ phiếu đã tồn tại" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Lỗi khi cập nhật cổ phiếu" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const stock = await Stock.findOneAndDelete({
      _id: id,
      userId: user._id,
    });
    if (!stock) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ phiếu" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Đã xóa cổ phiếu thành công" });
  } catch (error) {
    console.error("Error deleting stock:", error);
    return NextResponse.json(
      { error: "Lỗi khi xóa cổ phiếu" },
      { status: 500 }
    );
  }
}

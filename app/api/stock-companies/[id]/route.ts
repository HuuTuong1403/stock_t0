import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StockCompany } from "@/lib/models";
import { requireAuth } from "@/lib/auth";

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
    const company = await StockCompany.findOne({
      _id: id,
      userId: user._id,
    });
    if (!company) {
      return NextResponse.json(
        { error: "Không tìm thấy công ty chứng khoán" },
        { status: 404 }
      );
    }
    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching stock company:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải công ty chứng khoán" },
      { status: 500 }
    );
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
    const body = await request.json();

    // If this company is set as default, unset other defaults
    if (body.isDefault) {
      await StockCompany.updateMany(
        {
          userId: user._id,
          _id: { $ne: id },
        },
        { isDefault: false }
      );
    }

    const company = await StockCompany.findOneAndUpdate(
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
    if (!company) {
      return NextResponse.json(
        { error: "Không tìm thấy công ty chứng khoán" },
        { status: 404 }
      );
    }
    return NextResponse.json(company);
  } catch (error: unknown) {
    console.error("Error updating stock company:", error);
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json(
        { error: "Tên công ty chứng khoán đã tồn tại" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Lỗi khi cập nhật công ty chứng khoán" },
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
    const company = await StockCompany.findOneAndDelete({
      _id: id,
      userId: user._id,
    });
    if (!company) {
      return NextResponse.json(
        { error: "Không tìm thấy công ty chứng khoán" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Đã xóa công ty chứng khoán thành công" });
  } catch (error) {
    console.error("Error deleting stock company:", error);
    return NextResponse.json(
      { error: "Lỗi khi xóa công ty chứng khoán" },
      { status: 500 }
    );
  }
}


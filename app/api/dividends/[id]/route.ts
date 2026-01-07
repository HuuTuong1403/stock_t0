import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Dividend } from "@/lib/models";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const dividend = await Dividend.findById(id);
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
    const { id } = await params;
    const body = await request.json();
    const dividend = await Dividend.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
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
    const { id } = await params;
    const dividend = await Dividend.findByIdAndDelete(id);
    if (!dividend) {
      return NextResponse.json(
        { error: "Không tìm thấy cổ tức" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Đã xóa cổ tức thành công" });
  } catch (error) {
    console.error("Error deleting dividend:", error);
    return NextResponse.json({ error: "Lỗi khi xóa cổ tức" }, { status: 500 });
  }
}

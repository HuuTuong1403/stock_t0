import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { LongTermOrder, StockCompany } from "@/lib/models";
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
    const order = await LongTermOrder.findOne({
      _id: id,
      userId: user._id,
    }).populate({ path: "company", select: "name", strictPopulate: false });

    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh dài hạn" },
        { status: 404 }
      );
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching long-term order:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải lệnh dài hạn" },
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

    const order = await LongTermOrder.findOne({
      _id: id,
      userId: user._id,
    });
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh dài hạn" },
        { status: 404 }
      );
    }

    Object.assign(order, body);
    await order.save();

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating long-term order:", error);
    return NextResponse.json(
      { error: "Lỗi khi cập nhật lệnh dài hạn" },
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
    const order = await LongTermOrder.findOneAndDelete({
      _id: id,
      userId: user._id,
    });
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh dài hạn" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Đã xóa lệnh dài hạn thành công" });
  } catch (error) {
    console.error("Error deleting long-term order:", error);
    return NextResponse.json(
      { error: "Lỗi khi xóa lệnh dài hạn" },
      { status: 500 }
    );
  }
}

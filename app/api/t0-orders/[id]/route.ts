import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { T0Order } from "@/lib/models";
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
    const order = await T0Order.findOne({
      _id: id,
      userId: user._id,
    }).populate({ path: "company", select: "name", strictPopulate: false });

    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh T0" },
        { status: 404 }
      );
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching T0 order:", error);
    return NextResponse.json({ error: "Lỗi khi tải lệnh T0" }, { status: 500 });
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

    // Get the order
    const order = await T0Order.findOne({
      _id: id,
      userId: user._id,
    });
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh T0" },
        { status: 404 }
      );
    }

    // Update fields
    Object.assign(order, body);
    await order.save(); // This will trigger the pre-save middleware

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating T0 order:", error);
    return NextResponse.json(
      { error: "Lỗi khi cập nhật lệnh T0" },
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
    const order = await T0Order.findOneAndDelete({
      _id: id,
      userId: user._id,
    });
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh T0" },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: "Đã xóa lệnh T0 thành công" });
  } catch (error) {
    console.error("Error deleting T0 order:", error);
    return NextResponse.json({ error: "Lỗi khi xóa lệnh T0" }, { status: 500 });
  }
}

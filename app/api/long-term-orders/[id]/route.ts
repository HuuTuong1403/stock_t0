import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { LongTermOrder, StockCompany } from "@/lib/models";
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
    const order = await LongTermOrder.findOne(
      {
        _id: id,
        userId: user._id,
      }
    ).populate({ path: "companyId", select: "name", strictPopulate: false });
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

    // If company changed or type changed, fetch new fee rates
    const companyChanged =
      body.companyId && body.companyId !== order.companyId.toString();
    const typeChanged = body.type && body.type !== order.type;

    if (companyChanged || typeChanged) {
      const companyId = body.companyId || order.companyId;
      const company = await StockCompany.findOne({
        _id: companyId,
        userId: user._id,
      });
      if (!company) {
        return NextResponse.json(
          { error: "Không tìm thấy công ty chứng khoán" },
          { status: 400 }
        );
      }
      const orderType = body.type || order.type;
      body.feeRate =
        orderType === "BUY" ? company.buyFeeRate : company.sellFeeRate;
      body.taxRate = company.taxRate;
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

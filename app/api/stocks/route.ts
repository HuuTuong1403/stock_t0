import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Stock } from '@/lib/models';

export async function GET() {
  try {
    await dbConnect();
    const stocks = await Stock.find({}).sort({ code: 1 });
    return NextResponse.json(stocks);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json({ error: 'Lỗi khi tải danh sách cổ phiếu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const stock = await Stock.create(body);
    return NextResponse.json(stock, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating stock:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Mã cổ phiếu đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi khi tạo cổ phiếu' }, { status: 500 });
  }
}


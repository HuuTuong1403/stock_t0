import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { username, password, fullName, avatar, type } = await request.json();

    if (!username || !password || !fullName) {
      return NextResponse.json(
        { error: "Username, password và họ tên là bắt buộc" },
        { status: 400 }
      );
    }

    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
      const auth = await requireAuth(request);
      if (!auth || auth.user.type !== "admin") {
        return NextResponse.json(
          { error: "Chỉ admin mới được tạo tài khoản mới" },
          { status: 403 }
        );
      }
    }

    const normalizedUsername = String(username).toLowerCase().trim();
    const user = await User.create({
      username: normalizedUsername,
      password,
      fullName,
      avatar,
      type: type === "admin" ? "admin" : "user",
    });

    return NextResponse.json(
      {
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          avatar: user.avatar,
          type: user.type,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error registering user:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "Username đã tồn tại" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Lỗi tạo tài khoản" }, { status: 500 });
  }
}

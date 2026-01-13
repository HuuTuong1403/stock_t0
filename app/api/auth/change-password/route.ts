import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/services/auth";
import { User } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = auth;
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại và mật khẩu mới là bắt buộc" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 6 ký tự" },
        { status: 400 }
      );
    }

    // Get full user with password
    const fullUser = await User.findById(user._id);
    if (!fullUser) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    // Verify current password
    const isValid = await fullUser.comparePassword(currentPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng" },
        { status: 401 }
      );
    }

    // Update password
    fullUser.password = newPassword;
    await fullUser.save();

    return NextResponse.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Lỗi khi đổi mật khẩu" },
      { status: 500 }
    );
  }
}

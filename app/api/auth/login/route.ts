import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/models";
import { createSession, setSessionCookie } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username và password là bắt buộc" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: "Sai tài khoản hoặc mật khẩu" },
        { status: 401 }
      );
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Sai tài khoản hoặc mật khẩu" },
        { status: 401 }
      );
    }

    const token = createSession({
      _id: user._id.toString(),
      username: user.username,
      type: user.type,
    });

    const response = NextResponse.json({
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar,
        type: user.type,
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json({ error: "Lỗi đăng nhập" }, { status: 500 });
  }
}

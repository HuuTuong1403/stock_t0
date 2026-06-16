import { NextRequest, NextResponse } from "next/server";

import User from "@/lib/models/User";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/services/auth";
import {
  authenticateDnse,
  getDnseCredentialsFromEnv,
} from "@/lib/services/dnse";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let username: string | undefined;
    let password: string | undefined;

    try {
      const body = await request.json();
      username = body.username;
      password = body.password;
    } catch {
      // Empty body: use env credentials
    }

    const envCredentials = getDnseCredentialsFromEnv();
    username = username?.trim() || envCredentials?.username;
    password = password || envCredentials?.password;

    if (!username || !password) {
      return NextResponse.json(
        {
          error:
            "Chưa cấu hình DNSE_USERNAME và DNSE_PASSWORD trong biến môi trường",
        },
        { status: 400 },
      );
    }

    const { token, investorId, investorInfo } = await authenticateDnse(
      username,
      password,
    );

    await User.findByIdAndUpdate(auth.user._id, {
      investorToken: token,
      investorId,
      dnseUsername: username,
    });

    return NextResponse.json({
      token,
      investorId,
      investorInfo,
    });
  } catch (error) {
    console.error("Error in authentication:", error);
    return NextResponse.json(
      {
        error: "Lỗi xác thực DNSE",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

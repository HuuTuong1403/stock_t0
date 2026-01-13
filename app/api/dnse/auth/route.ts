import { NextRequest, NextResponse } from "next/server";

import User from "@/lib/models/User";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username và password là bắt buộc" },
        { status: 400 }
      );
    }

    // Authenticate with DNSE API
    const response = await fetch(
      "https://api.dnse.com.vn/user-service/api/auth",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Authentication failed", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const token = data.token;

    if (!token) {
      return NextResponse.json(
        { error: "Token không tìm thấy trong response" },
        { status: 500 }
      );
    }

    // Get investor info
    const investorResponse = await fetch(
      "https://api.dnse.com.vn/user-service/api/me",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );

    if (!investorResponse.ok) {
      return NextResponse.json(
        { error: "Failed to get investor info" },
        { status: investorResponse.status }
      );
    }

    const investorInfo = await investorResponse.json();
    const investorId = investorInfo.investorId?.toString();

    if (!investorId) {
      return NextResponse.json(
        { error: "Investor ID không tìm thấy" },
        { status: 500 }
      );
    }

    // Update user với token và lưu credentials để có thể auto-refresh sau này
    await User.findByIdAndUpdate(auth.user._id, {
      investorToken: token,
      investorId: investorId,
      dnseUsername: username,
      dnsePassword: password,
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
        error: "Lỗi xác thực",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

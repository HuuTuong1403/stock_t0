import mqtt from "mqtt";
import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import dbConnect from "@/lib/mongodb";
import { IUser, Stock, User } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await requireAuth(request);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;

    if (user.type !== "admin") {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const industry = searchParams.get("industry") || "";

    // Build filter
    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { industry: { $regex: search, $options: "i" } },
      ];
    }
    if (industry) {
      filter.industry = industry;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Stock.countDocuments(filter);

    // Get stocks with pagination
    const stocks = await Stock.find(filter)
      .sort({ code: 1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      data: stocks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách cổ phiếu" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await User.findById(auth.user._id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const { investorToken, investorId } = user as IUser;

    if (user.type !== "admin") {
      return NextResponse.json(
        { error: "Bạn không có quyền truy cập" },
        { status: 403 }
      );
    }

    const stock = await Stock.create({ ...body });
    if (investorToken && investorId) {
      // Gọi async nhưng không await để không làm chậm quá trình import
      subscribeStockFromServer(
        stock.code,
        investorToken,
        investorId,
        user._id.toString()
      ).catch((error) => {
        console.error(`Error subscribing ${stock.code} after create:`, error);
      });
    }
    return NextResponse.json(stock, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating stock:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Mã cổ phiếu đã tồn tại" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Lỗi khi tạo cổ phiếu" },
      { status: 500 }
    );
  }
}

async function subscribeStockFromServer(
  code: string,
  investorToken: string,
  investorId: string,
  userId: string
) {
  try {
    const BROKER_HOST = "datafeed-lts-krx.dnse.com.vn";
    const BROKER_PORT = 443;
    const CLIENT_ID_PREFIX = "dnse-price-json-mqtt-ws-sub-";
    const clientId = `${CLIENT_ID_PREFIX}${randomInt(1000, 2000)}`;
    const topic = `plaintext/quotes/krx/mdds/v2/ohlc/stock/1D/${code}`;

    return new Promise<void>((resolve, reject) => {
      const client = mqtt.connect(`wss://${BROKER_HOST}:${BROKER_PORT}/wss`, {
        clientId: clientId,
        username: investorId,
        password: investorToken,
        rejectUnauthorized: false,
        protocolVersion: 5,
      });

      const timeout = setTimeout(() => {
        client.end();
        reject(new Error("Subscribe timeout"));
      }, 10000); // 10 seconds timeout

      let messageReceived = false;

      client.on("connect", () => {
        client.subscribe(topic, { qos: 1 }, (err) => {
          if (err) {
            clearTimeout(timeout);
            client.end();
            reject(err);
          }
        });
      });

      // Khi nhận được message, cập nhật giá và disconnect
      client.on("message", async (receivedTopic, message) => {
        try {
          if (!messageReceived) {
            messageReceived = true;
            const payload = JSON.parse(message.toString());
            console.log("🚀 => payload:", payload);
            const stock = await Stock.findOne({ code: payload.symbol });

            if (stock && payload.close) {
              stock.marketPrice = payload.close * 1000;
              await stock.save();
            }

            clearTimeout(timeout);
            client.end();
            resolve();
          }
        } catch (error) {
          console.error(`Error processing message for ${code}:`, error);
        }
      });

      client.on("error", async (error) => {
        const errorMessage = error.message || String(error);

        // Check if it's an authentication error
        if (
          errorMessage.includes("Bad User Name or Password") ||
          errorMessage.includes("Not authorized") ||
          errorMessage.includes("Authentication failed")
        ) {
          console.log(
            `MQTT authentication failed for ${code}, attempting to refresh token...`
          );

          try {
            // Try to refresh token
            const { refreshDnseToken } = await import("@/lib/services/dnse");
            const newCredentials = await refreshDnseToken(userId);

            if (newCredentials) {
              console.log(
                `Token refreshed for ${code}, retrying connection...`
              );

              // Close old client
              clearTimeout(timeout);
              client.removeAllListeners();
              if (client.connected) {
                try {
                  client.unsubscribe(topic);
                  client.end();
                } catch {
                  // Ignore errors during cleanup
                }
              }

              // Retry with new credentials
              setTimeout(() => {
                subscribeStockFromServer(
                  code,
                  newCredentials.investorToken,
                  newCredentials.investorId,
                  userId
                )
                  .then(resolve)
                  .catch(reject);
              }, 1000);

              return; // Don't reject, we're retrying
            }
          } catch (refreshError) {
            console.error(`Failed to refresh token for ${code}:`, refreshError);
          }
        }

        // Other errors or refresh failed
        clearTimeout(timeout);
        client.end();
        reject(error);
      });

      // Nếu không nhận được message sau 5 giây, vẫn disconnect (có thể stock chưa có data)
      setTimeout(() => {
        if (!messageReceived) {
          clearTimeout(timeout);
          client.end();
          resolve(); // Resolve thay vì reject để không làm gián đoạn import
        }
      }, 5000);
    });
  } catch (error) {
    console.error(`Error subscribing stock ${code}:`, error);
    // Không throw error để không làm gián đoạn quá trình import
  }
}

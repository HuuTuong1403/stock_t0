import * as XLSX from "xlsx";
import { NextRequest, NextResponse } from "next/server";
import mqtt from "mqtt";
import { randomInt } from "crypto";

import dbConnect from "@/lib/mongodb";
import { Stock, User } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";
import { IUser } from "@/lib/models/User";

export const runtime = "nodejs";

/**
 * Helper function để subscribe stock từ server-side
 * Tạo MQTT connection, subscribe topic để lấy giá, sau đó disconnect
 */
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
            console.log("🚀 => payload:", payload)
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
          console.log(`MQTT authentication failed for ${code}, attempting to refresh token...`);
          
          try {
            // Try to refresh token
            const { refreshDnseToken } = await import("@/lib/services/dnse");
            const newCredentials = await refreshDnseToken(userId);
            
            if (newCredentials) {
              console.log(`Token refreshed for ${code}, retrying connection...`);
              
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
                subscribeStockFromServer(code, newCredentials.investorToken, newCredentials.investorId, userId)
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lấy user để có investorToken và investorId
    const user = await User.findById(auth.user._id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { investorToken, investorId } = user as IUser;

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Không có file được tải lên" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "File Excel không có dữ liệu" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      data: [] as string[],
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as Record<string, unknown>;

        // Map Excel columns to model fields
        const code = String(row["Mã CP"] || "")
          .toUpperCase()
          .trim();
        const name = String(row["Tên doanh nghiệp"] || "").trim();
        const industry = String(row["Ngành hàng"] || "").trim();

        // Validation
        if (!code || !name || !industry) {
          results.failed++;
          results.errors.push(
            `Dòng ${i + 2}: Thiếu mã CP hoặc tên doanh nghiệp hoặc ngành hàng`
          );
          continue;
        }

        // Check if stock already exists
        const existingStock = await Stock.findOne({ code });
        if (existingStock) {
          // Update existing stock
          existingStock.name = name;
          existingStock.marketPrice = 0;
          existingStock.industry = industry;
          await existingStock.save();
          results.success++;
        } else {
          // Create new stock
          await Stock.create({
            code,
            name,
            marketPrice: 0,
            industry,
          });
          results.data.push(code);
          results.success++;

          // Gọi subscribeStock ngay sau khi tạo stock mới để lấy giá
          if (investorToken && investorId) {
            // Gọi async nhưng không await để không làm chậm quá trình import
            subscribeStockFromServer(code, investorToken, investorId, user._id.toString()).catch(
              (error) => {
                console.error(`Error subscribing ${code} after import:`, error);
              }
            );
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Dòng ${i + 2}: ${
            error instanceof Error ? error.message : "Lỗi không xác định"
          }`
        );
      }
    }

    return NextResponse.json({
      message: `Import hoàn tất: ${results.success} thành công, ${results.failed} thất bại`,
      ...results,
    });
  } catch (error) {
    console.error("Error importing stocks:", error);
    return NextResponse.json(
      { error: "Lỗi khi import dữ liệu" },
      { status: 500 }
    );
  }
}

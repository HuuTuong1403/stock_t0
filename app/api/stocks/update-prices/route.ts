import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Stock, User } from "@/lib/models";
import { IUser } from "@/lib/models/User";
import mqtt from "mqtt";
import { randomInt } from "crypto";
import { refreshDnseToken } from "@/lib/services/dnse";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes - Vercel Pro plan allows up to 300s

/**
 * Helper function để subscribe stock từ server-side
 * Tạo MQTT connection, subscribe topic để lấy giá, sau đó disconnect
 */
async function subscribeStockFromServer(
  code: string,
  investorToken: string,
  investorId: string,
  userId: string
): Promise<void> {
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
          resolve(); // Resolve thay vì reject để không làm gián đoạn process
        }
      }, 5000);
    });
  } catch (error) {
    console.error(`Error subscribing stock ${code}:`, error);
    throw error;
  }
}

/**
 * Shared function để update prices
 */
async function updatePrices() {
  await dbConnect();

  // Get user credentials (using hardcoded user ID for now, same as subscribe route)
  const userId = "6963b7df5d7abb8710455ab1";
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const { investorToken, investorId } = user as IUser;

  if (!investorToken || !investorId) {
    throw new Error("Token và investorId là bắt buộc");
  }

  // Get all stocks
  const stocks = await Stock.find({}).select("code");
  const stockCodes = stocks.map((stock) => stock.code);

  if (stockCodes.length === 0) {
    return {
      message: "Không có cổ phiếu nào để cập nhật",
      success: 0,
      failed: 0,
      total: 0,
    };
  }

  console.log(
    `Starting to update prices for ${
      stockCodes.length
    } stocks at ${new Date().toISOString()}`
  );

  // Update prices in batches to avoid overwhelming the MQTT broker
  const BATCH_SIZE = 10;
  let successCount = 0;
  let failedCount = 0;
  const failedCodes: string[] = [];

  for (let i = 0; i < stockCodes.length; i += BATCH_SIZE) {
    const batch = stockCodes.slice(i, i + BATCH_SIZE);

    // Process batch in parallel with delay between batches
    const batchPromises = batch.map((code) =>
      subscribeStockFromServer(code, investorToken, investorId, userId)
        .then(() => {
          successCount++;
          console.log(`✓ Updated price for ${code}`);
        })
        .catch((error) => {
          failedCount++;
          failedCodes.push(code);
          console.error(`✗ Failed to update price for ${code}:`, error);
        })
    );

    await Promise.all(batchPromises);

    // Add delay between batches to avoid rate limiting (except for the last batch)
    if (i + BATCH_SIZE < stockCodes.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds delay
    }
  }

  console.log(
    `Finished updating prices at ${new Date().toISOString()}. Success: ${successCount}, Failed: ${failedCount}`
  );

  return {
    message: "Cập nhật giá thị trường hoàn tất",
    success: successCount,
    failed: failedCount,
    total: stockCodes.length,
    failedCodes: failedCodes.slice(0, 10), // Return first 10 failed codes
  };
}

/**
 * GET /api/stocks/update-prices
 * Cập nhật giá thị trường cho tất cả cổ phiếu
 * Được gọi bởi Vercel Cron Job
 */
export async function GET(request: NextRequest) {
  try {
    console.log(
      `[CRON] Update prices job triggered at ${new Date().toISOString()}`
    );
    const result = await updatePrices();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CRON] Error updating stock prices:", error);
    return NextResponse.json(
      {
        error: "Lỗi khi cập nhật giá thị trường",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stocks/update-prices
 * Cập nhật giá thị trường cho tất cả cổ phiếu
 * Có thể được gọi manually
 */
export async function POST(request: NextRequest) {
  try {
    console.log(
      `[MANUAL] Update prices triggered at ${new Date().toISOString()}`
    );
    const result = await updatePrices();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[MANUAL] Error updating stock prices:", error);
    return NextResponse.json(
      {
        error: "Lỗi khi cập nhật giá thị trường",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

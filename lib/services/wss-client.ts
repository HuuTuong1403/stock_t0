/**
 * WebSocket Client Service
 *
 * Kết nối tới MQTT WebSocket Server để subscribe stock prices
 * Server phải chạy ở mqtt-wss-server/ folder
 *
 * Usage:
 *   1. Start WebSocket server: cd mqtt-wss-server && npm start
 *   2. Import và sử dụng functions này từ Next.js API routes
 */

import WebSocket from "ws";

const WSS_URL = process.env.WSS_URL || "ws://localhost:8080";

/**
 * Subscribe single stock price từ MQTT broker via WebSocket server
 *
 * @param code - Stock code (e.g., "VND", "HPG")
 * @param investorToken - DNSE investor token
 * @param investorId - DNSE investor ID
 * @param userId - MongoDB user ID
 * @returns Promise<void>
 *
 * @example
 * await subscribeStock("VND", token, id, userId);
 */
export async function subscribeStock(
  code: string,
  investorToken: string,
  investorId: string,
  userId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WSS_URL);

    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Subscribe timeout"));
    }, 15000);

    ws.on("open", () => {
      console.log(`📡 Subscribing to ${code}`);
      ws.send(
        JSON.stringify({
          type: "subscribe",
          code,
          investorToken,
          investorId,
          userId,
        })
      );
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "connected":
            console.log(`✅ Connected for ${code}`);
            break;

          case "subscribed":
            console.log(`✅ Subscribed to ${code}`);
            break;

          case "price_update":
            console.log(
              `💰 Price updated for ${code}: ${message.data.marketPrice}`
            );
            clearTimeout(timeout);
            ws.close();
            resolve();
            break;

          case "error":
          case "auth_error":
            console.error(`❌ Error for ${code}: ${message.error}`);
            clearTimeout(timeout);
            ws.close();
            reject(new Error(message.error || "Unknown error"));
            break;

          case "timeout":
            console.log(`⏰ No data for ${code}`);
            clearTimeout(timeout);
            ws.close();
            resolve(); // Resolve anyway, stock might not have data
            break;

          default:
            console.log(`ℹ️ ${code}: ${message.type}`);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    ws.on("error", (error) => {
      console.error(`❌ WebSocket error for ${code}:`, error);
      clearTimeout(timeout);
      reject(error);
    });

    ws.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Subscribe multiple stocks (batch) từ MQTT broker via WebSocket server
 *
 * Server sẽ process từng batch 10 stocks cùng lúc để tránh overwhelming broker.
 *
 * @param codes - Array of stock codes (e.g., ["VND", "HPG", "VIC"])
 * @param investorToken - DNSE investor token
 * @param investorId - DNSE investor ID
 * @param userId - MongoDB user ID
 * @returns Promise with result summary
 *
 * @example
 * const result = await subscribeBatch(
 *   ["VND", "HPG", "VIC"],
 *   token,
 *   id,
 *   userId
 * );
 * console.log(result); // { message: "...", success: 3, failed: 0, total: 3 }
 */
export async function subscribeBatch(
  codes: string[],
  investorToken: string,
  investorId: string,
  userId: string
): Promise<{
  message: string;
  success: number;
  failed: number;
  total: number;
}> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WSS_URL);

    // Timeout after 5 minutes (for large batches)
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Batch subscribe timeout"));
    }, 300000);

    ws.on("open", () => {
      console.log(`📦 Sending batch subscribe for ${codes.length} stocks`);
      ws.send(
        JSON.stringify({
          type: "subscribe_batch",
          codes,
          investorToken,
          investorId,
          userId,
        })
      );
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "connected":
            console.log("✅ Connected to WebSocket server");
            break;

          case "batch_start":
            console.log(`📊 Batch started: ${message.total} stocks`);
            break;

          case "batch_progress":
            console.log(
              `⏳ Progress: ${message.processed}/${message.total} (Success: ${message.success}, Failed: ${message.failed})`
            );
            break;

          case "batch_complete":
            console.log(
              `✅ Batch complete: ${message.success} success, ${message.failed} failed`
            );
            clearTimeout(timeout);
            ws.close();
            resolve({
              message: "Cập nhật giá thị trường hoàn tất",
              success: message.success,
              failed: message.failed,
              total: message.total,
            });
            break;

          case "error":
            console.error(`❌ Batch error: ${message.error}`);
            clearTimeout(timeout);
            ws.close();
            reject(new Error(message.error || "Unknown error"));
            break;

          default:
            console.log(`ℹ️ Received: ${message.type}`);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
      clearTimeout(timeout);
      reject(error);
    });

    ws.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

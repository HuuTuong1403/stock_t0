import mqtt from "mqtt";
import { randomInt } from "crypto";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/services/auth";
import { Stock, User } from "@/lib/models";
import { IUser } from "@/lib/models/User";
import { refreshDnseToken } from "@/lib/services/dnse";
import dbConnect from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await dbConnect();

  const searchParams = request.nextUrl.searchParams;
  const topic =
    searchParams.get("topic") || "plaintext/quotes/krx/mdds/v2/ohlc/index/1D/+";

  const user = await User.findById("6965f14d5ad4273f2010d5a4");
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const type = searchParams.get("type");
  const { investorToken, investorId } = user as IUser;

  if (!investorToken || !investorId) {
    return new Response(
      JSON.stringify({ error: "Token và investorId là bắt buộc" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Create a ReadableStream for SSE
  const encoder = new TextEncoder();
  let mqttClient: mqtt.MqttClient | null = null;
  const subscribedTopic = topic; // Store topic for cleanup
  let isControllerClosed = false;

  // Helper function to safely enqueue data
  const safeEnqueue = (
    controller: ReadableStreamDefaultController,
    data: string
  ) => {
    if (!isControllerClosed) {
      try {
        controller.enqueue(encoder.encode(data));
      } catch (error) {
        if (error instanceof TypeError && error.message.includes("closed")) {
          isControllerClosed = true;
        } else {
          console.error("Error enqueueing data:", error);
        }
      }
    }
  };

  // Helper to close controller and cleanup
  let controllerRef: ReadableStreamDefaultController | null = null;

  const closeController = () => {
    if (!isControllerClosed && controllerRef) {
      isControllerClosed = true;
      try {
        controllerRef.close();
      } catch {
        // Controller might already be closed
      }
    }
    // Remove all event listeners to prevent further events
    if (mqttClient) {
      mqttClient.removeAllListeners();
      if (mqttClient.connected) {
        try {
          mqttClient.unsubscribe(subscribedTopic);
          mqttClient.end();
        } catch {
          // Ignore errors during cleanup
        }
      }
    }
  };

  // Helper function to setup MQTT listeners (for reuse after token refresh)
  const setupMqttListeners = (
    client: mqtt.MqttClient,
    controller: ReadableStreamDefaultController
  ) => {
    client.on("connect", () => {
      safeEnqueue(
        controller,
        `data: ${JSON.stringify({
          type: "connected",
          message: "Đã kết nối thành công",
        })}\n\n`
      );

      // Subscribe to topic
      client.subscribe(subscribedTopic, { qos: 1 }, (err) => {
        if (err) {
          safeEnqueue(
            controller,
            `data: ${JSON.stringify({
              type: "error",
              error: `Failed to subscribe: ${err.message}`,
            })}\n\n`
          );
        } else {
          safeEnqueue(
            controller,
            `data: ${JSON.stringify({
              type: "subscribed",
              topic: subscribedTopic,
              message: "Đã subscribe thành công",
            })}\n\n`
          );
        }
      });
    });

    // Message callback
    client.on("message", async (receivedTopic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        const sendingTime = payload.sendingTime;
        const matchPrice = parseFloat(payload.matchPrice);
        const matchQuantity = parseInt(payload.matchQtty);

        const data = {
          type: "message",
          topic: receivedTopic,
          payload: {
            symbol: payload.symbol,
            matchPrice,
            matchQuantity,
            side: payload.side,
            sendingTime,
            ...payload,
          },
        };

        if (type === "addStock") {
          const stock = await Stock.findOne({ code: payload.symbol });

          if (stock) {
            stock.marketPrice = payload.close * 1000;
            await stock.save();
          }
          closeController();
        }

        safeEnqueue(controller, `data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        safeEnqueue(
          controller,
          `data: ${JSON.stringify({
            type: "error",
            error: `Failed to parse message: ${
              error instanceof Error ? error.message : String(error)
            }`,
          })}\n\n`
        );
      }
    });

    // Error callback
    client.on("error", async (error) => {
      const errorMessage = error.message || String(error);

      // Check if it's an authentication error
      if (
        errorMessage.includes("Bad User Name or Password") ||
        errorMessage.includes("Not authorized") ||
        errorMessage.includes("Authentication failed")
      ) {
        console.log(
          "MQTT authentication failed, attempting to refresh token..."
        );

        // Try to refresh token
        const newCredentials = await refreshDnseToken(
          "6965f14d5ad4273f2010d5a4"
        );

        if (newCredentials) {
          safeEnqueue(
            controller,
            `data: ${JSON.stringify({
              type: "info",
              message: "Token đã được làm mới tự động, đang thử kết nối lại...",
            })}\n\n`
          );

          // Close old client
          client.removeAllListeners();
          if (client.connected) {
            try {
              client.unsubscribe(subscribedTopic);
              client.end();
            } catch {
              // Ignore errors during cleanup
            }
          }

          // Create new MQTT client with refreshed credentials
          const BROKER_HOST = "datafeed-lts-krx.dnse.com.vn";
          const BROKER_PORT = 443;
          const CLIENT_ID_PREFIX = "dnse-price-json-mqtt-ws-sub-";
          const newClientId = `${CLIENT_ID_PREFIX}${randomInt(1000, 2000)}`;
          const newClient = mqtt.connect({
            host: BROKER_HOST,
            port: BROKER_PORT,
            protocol: "wss",
            path: "/wss",
            clientId: newClientId,
            username: newCredentials.investorId,
            password: newCredentials.investorToken,
            rejectUnauthorized: false,
            protocolVersion: 5,
          });

          mqttClient = newClient;

          // Re-attach all event listeners to new client
          setupMqttListeners(newClient, controller);

          return; // Don't send error, we're retrying
        } else {
          safeEnqueue(
            controller,
            `data: ${JSON.stringify({
              type: "error",
              error:
                "Không thể làm mới token tự động. Vui lòng đăng nhập lại DNSE.",
            })}\n\n`
          );
          closeController();
          return;
        }
      }

      // Other errors
      safeEnqueue(
        controller,
        `data: ${JSON.stringify({
          type: "error",
          error: `MQTT error: ${errorMessage}`,
        })}\n\n`
      );
    });

    // Close callback
    client.on("close", () => {
      safeEnqueue(
        controller,
        `data: ${JSON.stringify({
          type: "closed",
          message: "Đã ngắt kết nối",
        })}\n\n`
      );
      closeController();
    });

    // Handle client disconnect
    client.on("disconnect", () => {
      safeEnqueue(
        controller,
        `data: ${JSON.stringify({
          type: "disconnected",
          message: "Đã ngắt kết nối",
        })}\n\n`
      );
      closeController();
    });
  };

  const stream = new ReadableStream({
    async start(controller) {
      controllerRef = controller;
      // Configuration
      const BROKER_HOST = "datafeed-lts-krx.dnse.com.vn";
      const BROKER_PORT = 443;
      const CLIENT_ID_PREFIX = "dnse-price-json-mqtt-ws-sub-";

      // Generate random client ID
      const clientId = `${CLIENT_ID_PREFIX}${randomInt(1000, 2000)}`;

      // Create MQTT client
      mqttClient = mqtt.connect({
        host: BROKER_HOST,
        port: BROKER_PORT,
        protocol: "wss",
        path: "/wss",
        clientId: clientId,
        username: investorId,
        password: investorToken,
        rejectUnauthorized: false, // Bỏ qua kiểm tra SSL (giống Python)
        protocolVersion: 5, // MQTTv5
      });

      // Send initial connection message
      safeEnqueue(
        controller,
        `data: ${JSON.stringify({
          type: "connecting",
          message: "Đang kết nối...",
        })}\n\n`
      );

      // Setup MQTT listeners
      setupMqttListeners(mqttClient, controller);
    },
    cancel() {
      // Cleanup on cancellation
      isControllerClosed = true;
      if (mqttClient) {
        try {
          mqttClient.removeAllListeners();
          if (mqttClient.connected) {
            mqttClient.unsubscribe(subscribedTopic);
            mqttClient.end();
          }
        } catch (error) {
          console.error("Error cleaning up MQTT client:", error);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

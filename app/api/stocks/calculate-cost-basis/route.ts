import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Stock, LongTermOrder } from "@/lib/models";

/**
 * Calculate current cost basis for all stocks based on long-term orders
 * POST /api/stocks/calculate-cost-basis
 */
export async function POST() {
  try {
    await dbConnect();

    // Get all stocks
    const stocks = await Stock.find({});

    let updatedCount = 0;

    for (const stock of stocks) {
      // Get all long-term orders for this stock
      const longTermOrders = await LongTermOrder.find({
        stockCode: stock.code,
        type: "BUY", // Only consider BUY orders for cost basis
      });

      if (longTermOrders.length > 0) {
        // Calculate total cost and total quantity
        let totalCost = 0;
        let totalQuantity = 0;

        for (const order of longTermOrders) {
          totalCost += order.costBasis; // costBasis is already calculated as quantity * price + fee
          totalQuantity += order.quantity;
        }

        // Calculate current cost basis per share
        const currentCostBasis = totalQuantity > 0 ? totalCost / totalQuantity : 0;

        // Update stock
        stock.currentCostBasis = Math.round(currentCostBasis);
        await stock.save();
        updatedCount++;
      }
    }

    return NextResponse.json({
      message: `Đã cập nhật giá vốn cho ${updatedCount} cổ phiếu`,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Error calculating cost basis:", error);
    return NextResponse.json(
      { error: "Lỗi khi tính toán giá vốn" },
      { status: 500 }
    );
  }
}


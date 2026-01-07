import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Stock, T0Order, LongTermOrder, Dividend } from "@/lib/models";

export async function GET() {
  try {
    await dbConnect();

    // Get counts
    const [stockCount, t0OrderCount, longTermOrderCount, dividendCount] =
      await Promise.all([
        Stock.countDocuments(),
        T0Order.countDocuments(),
        LongTermOrder.countDocuments(),
        Dividend.countDocuments(),
      ]);

    // Get T0 profit summary
    const t0ProfitResult = await T0Order.aggregate([
      {
        $group: {
          _id: null,
          totalProfitBeforeFees: { $sum: "$profitBeforeFees" },
          totalProfitAfterFees: { $sum: "$profitAfterFees" },
          totalBuyValue: { $sum: "$buyValue" },
          totalSellValue: { $sum: "$sellValue" },
        },
      },
    ]);

    // Get long-term profit summary (only SELL orders have profit)
    const longTermProfitResult = await LongTermOrder.aggregate([
      { $match: { type: "SELL" } },
      {
        $group: {
          _id: null,
          totalProfit: { $sum: "$profit" },
        },
      },
    ]);

    // Get dividend summary
    const dividendResult = await Dividend.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
        },
      },
    ]);

    // Get recent T0 orders
    const recentT0Orders = await T0Order.find({})
      .sort({ tradeDate: -1 })
      .limit(5)
      .select("tradeDate stockCode quantity profitAfterFees");

    // Get T0 profit by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyT0Profit = await T0Order.aggregate([
      { $match: { tradeDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$tradeDate" },
            month: { $month: "$tradeDate" },
          },
          totalProfit: { $sum: "$profitAfterFees" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Get T0 stats by stock code
    const t0StatsByStock = await T0Order.aggregate([
      {
        $group: {
          _id: "$stockCode",
          orderCount: { $sum: 1 },
          totalProfitBeforeFees: { $sum: "$profitBeforeFees" },
          totalProfitAfterFees: { $sum: "$profitAfterFees" },
          totalBuyValue: { $sum: "$buyValue" },
          totalSellValue: { $sum: "$sellValue" },
        },
      },
      {
        $sort: {
          totalProfitAfterFees: -1,
        },
      },
    ]);

    // Get long-term stats by stock code
    const longTermStatsByStock = await LongTermOrder.aggregate([
      {
        $group: {
          _id: "$stockCode",
          buyOrders: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "BUY"] },
                then: 1,
                else: 0,
              },
            },
          },
          sellOrders: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "SELL"] },
                then: 1,
                else: 0,
              },
            },
          },
          totalBuyQuantity: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "BUY"] },
                then: "$quantity",
                else: 0,
              },
            },
          },
          totalSellQuantity: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "SELL"] },
                then: "$quantity",
                else: 0,
              },
            },
          },
          totalBuyValue: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "BUY"] },
                then: { $multiply: ["$quantity", "$price"] },
                else: 0,
              },
            },
          },
          totalSellValue: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "SELL"] },
                then: { $multiply: ["$quantity", "$price"] },
                else: 0,
              },
            },
          },
          totalProfit: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "SELL"] },
                then: "$profit",
                else: 0,
              },
            },
          },
        },
      },
      {
        $sort: {
          totalProfit: -1,
        },
      },
    ]);

    // Get dividend stats by stock code
    const dividendStatsByStock = await Dividend.aggregate([
      {
        $group: {
          _id: "$stockCode",
          count: { $sum: 1 },
          stockDividends: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "STOCK"] },
                then: 1,
                else: 0,
              },
            },
          },
          cashDividends: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "CASH"] },
                then: 1,
                else: 0,
              },
            },
          },
          totalValue: { $sum: "$value" },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    // Get long-term portfolio (current holdings with market price)
    const longTermPortfolio = await LongTermOrder.aggregate([
      {
        $group: {
          _id: "$stockCode",
          totalQuantity: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "BUY"] },
                then: "$quantity",
                else: { $multiply: ["$quantity", -1] },
              },
            },
          },
          totalCostBasis: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "BUY"] },
                then: "$costBasis",
                else: 0,
              },
            },
          },
          buyOrders: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "BUY"] },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      {
        $match: {
          totalQuantity: { $gt: 0 }, // Only stocks with positive holdings
        },
      },
      {
        $lookup: {
          from: "stocks",
          localField: "_id",
          foreignField: "code",
          as: "stockInfo",
        },
      },
      {
        $unwind: {
          path: "$stockInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          stockCode: "$_id",
          quantity: "$totalQuantity",
          averageCostBasis: {
            $cond: {
              if: { $gt: ["$totalCostBasis", 0] },
              then: { $divide: ["$totalCostBasis", "$totalQuantity"] },
              else: 0,
            },
          },
          marketPrice: { $ifNull: ["$stockInfo.marketPrice", 0] },
          currentCostBasis: { $ifNull: ["$stockInfo.currentCostBasis", 0] },
          _id: 0,
        },
      },
      {
        $match: {
          quantity: { $gt: 0 },
        },
      },
      {
        $sort: {
          stockCode: 1,
        },
      },
    ]);

    return NextResponse.json({
      counts: {
        stocks: stockCount,
        t0Orders: t0OrderCount,
        longTermOrders: longTermOrderCount,
        dividends: dividendCount,
      },
      t0Summary: t0ProfitResult[0] || {
        totalProfitBeforeFees: 0,
        totalProfitAfterFees: 0,
        totalBuyValue: 0,
        totalSellValue: 0,
      },
      longTermSummary: longTermProfitResult[0] || { totalProfit: 0 },
      dividendSummary: dividendResult,
      recentT0Orders,
      monthlyT0Profit,
      longTermPortfolio,
      t0StatsByStock,
      longTermStatsByStock,
      dividendStatsByStock,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải thống kê" },
      { status: 500 }
    );
  }
}

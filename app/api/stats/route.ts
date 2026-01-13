import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { T0Order, LongTermOrder, Dividend, StockUser } from "@/lib/models";
import { requireAuth } from "@/lib/services/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = await requireAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { user } = auth;
    const ownerFilter = { userId: user._id };

    // Get counts
    const [stockCount, t0OrderCount, longTermOrderCount, dividendCount] =
      await Promise.all([
        StockUser.countDocuments(ownerFilter),
        T0Order.countDocuments(ownerFilter),
        LongTermOrder.countDocuments(ownerFilter),
        Dividend.countDocuments(ownerFilter),
      ]);

    // Get T0 profit summary
    const t0ProfitResult = await T0Order.aggregate([
      { $match: ownerFilter },
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
      { $match: { ...ownerFilter, type: "SELL" } },
      {
        $group: {
          _id: null,
          totalProfit: { $sum: "$profit" },
        },
      },
    ]);

    // Get dividend summary
    const dividendResult = await Dividend.aggregate([
      { $match: ownerFilter },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalValue: { $sum: "$value" },
        },
      },
    ]);

    // Get recent T0 orders
    const recentT0Orders = await T0Order.find(ownerFilter)
      .sort({ tradeDate: -1 })
      .limit(5)
      .select("tradeDate stockCode quantity profitAfterFees");

    // Get T0 profit by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyT0Profit = await T0Order.aggregate([
      { $match: { ...ownerFilter, tradeDate: { $gte: sixMonthsAgo } } },
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

    // Get T0 stats by stock code and company
    const t0StatsByStock = await T0Order.aggregate([
      { $match: ownerFilter },
      {
        $group: {
          _id: {
            stockCode: "$stockCode",
            company: "$company",
          },
          orderCount: { $sum: 1 },
          totalProfitBeforeFees: { $sum: "$profitBeforeFees" },
          totalProfitAfterFees: { $sum: "$profitAfterFees" },
          totalBuyValue: { $sum: "$buyValue" },
          totalSellValue: { $sum: "$sellValue" },
        },
      },
      {
        $lookup: {
          from: "stockcompanies",
          localField: "_id.company",
          foreignField: "_id",
          as: "companyInfo",
        },
      },
      {
        $unwind: {
          path: "$companyInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "stocks",
          localField: "_id.stockCode",
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
          stockCode: "$_id.stockCode",
          company: "$_id.company",
          companyName: { $ifNull: ["$companyInfo.name", ""] },
          marketPrice: { $ifNull: ["$stockInfo.marketPrice", 0] },
          orderCount: 1,
          totalProfitBeforeFees: 1,
          totalProfitAfterFees: 1,
          totalBuyValue: 1,
          totalSellValue: 1,
          _id: 0,
        },
      },
      {
        $sort: {
          companyName: 1,
          totalProfitAfterFees: -1,
        },
      },
    ]);

    // Get long-term stats by stock code and company
    const longTermStatsByStock = await LongTermOrder.aggregate([
      { $match: ownerFilter },
      {
        $group: {
          _id: {
            stockCode: "$stockCode",
            company: "$company",
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
        $lookup: {
          from: "stockcompanies",
          localField: "_id.company",
          foreignField: "_id",
          as: "companyInfo",
        },
      },
      {
        $unwind: {
          path: "$companyInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "stocks",
          localField: "_id.stockCode",
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
          stockCode: "$_id.stockCode",
          company: "$_id.company",
          companyName: { $ifNull: ["$companyInfo.name", ""] },
          marketPrice: { $ifNull: ["$stockInfo.marketPrice", 0] },
          buyOrders: 1,
          sellOrders: 1,
          totalBuyQuantity: 1,
          totalSellQuantity: 1,
          totalBuyValue: 1,
          totalSellValue: 1,
          totalProfit: 1,
          _id: 0,
        },
      },
      {
        $sort: {
          companyName: 1,
          totalProfit: -1,
        },
      },
    ]);

    // Get dividend stats by stock code
    const dividendStatsByStock = await Dividend.aggregate([
      { $match: ownerFilter },
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

    // Get long-term portfolio (current holdings with market price) - group by stockCode and company
    const longTermPortfolio = await LongTermOrder.aggregate([
      { $match: ownerFilter },
      // First lookup to get current company from StockUser
      {
        $lookup: {
          from: "stockusers",
          let: { stockCode: "$stockCode", userId: ownerFilter.userId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$stockCode", "$$stockCode"] },
                    { $eq: ["$userId", "$$userId"] },
                  ],
                },
              },
            },
          ],
          as: "stockUserInfo",
        },
      },
      {
        $unwind: {
          path: "$stockUserInfo",
          preserveNullAndEmptyArrays: false, // Only keep orders that have stockUser
        },
      },
      // Filter to only keep orders with matching company
      {
        $match: {
          $expr: {
            $eq: ["$company", "$stockUserInfo.company"],
          },
        },
      },
      {
        $group: {
          _id: {
            stockCode: "$stockCode",
            company: "$company",
          },
          totalQuantity: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "BUY"] },
                then: "$quantity",
                else: 0,
              },
            },
          },
          totalQuantitySell: {
            $sum: {
              $cond: {
                if: { $eq: ["$type", "SELL"] },
                then: "$quantity",
                else: 0,
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
          stockUserCostPrice: { $first: "$stockUserInfo.costPrice" },
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
          localField: "_id.stockCode",
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
        $lookup: {
          from: "stockcompanies",
          localField: "_id.company",
          foreignField: "_id",
          as: "companyInfo",
        },
      },
      {
        $unwind: {
          path: "$companyInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          stockCode: "$_id.stockCode",
          company: "$_id.company",
          companyName: { $ifNull: ["$companyInfo.name", ""] },
          quantity: "$totalQuantity",
          quantitySell: "$totalQuantitySell",
          averageCostBasis: {
            $cond: {
              if: { $gt: ["$totalCostBasis", 0] },
              then: { $divide: ["$totalCostBasis", "$totalQuantity"] },
              else: 0,
            },
          },
          marketPrice: { $ifNull: ["$stockInfo.marketPrice", 0] },
          currentCostBasis: { $ifNull: ["$stockUserCostPrice", 0] },
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
          companyName: 1,
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

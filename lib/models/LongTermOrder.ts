import mongoose, { Document, Model, Types } from "mongoose";
import StockUser from "./StockUser";
import StockCompany, { IStockCompany } from "./StockCompany";

export type OrderType = "BUY" | "SELL";

export type AccountType = "NORMAL" | "MARGIN";

export interface ILongTermOrder extends Document {
  tradeDate: Date;
  stockCode: string;
  userId: Types.ObjectId;
  company: Types.ObjectId | IStockCompany; // Có thể là ObjectId hoặc populated IStockCompany
  type: OrderType;
  accountType: AccountType; // [Tài khoản thường hoặc tài khoản vay (margin)] - chọn khi MUA
  quantity: number;
  price: number;
  fee: number;
  tax: number;
  marginFee: number; // [Phí margin tính khi BÁN lô mua bằng tài khoản vay, theo số ngày nắm giữ]
  isAdditionalIssuance: boolean;
  costBasis: number;
  avgCost: number;
  profit: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tính phí margin cho một lệnh BÁN bằng cách khớp FIFO với các lô MUA trước đó.
 * Chỉ các lô mua bằng tài khoản vay (MARGIN) mới phát sinh phí.
 * Phí = SL khớp × giá mua × lãi suất margin/năm × số ngày nắm giữ / 365
 */
function computeMarginFeeForSell(
  previousOrders: ILongTermOrder[],
  sell: { quantity: number; tradeDate: Date },
  marginFeeRate: number
): number {
  if (!marginFeeRate || marginFeeRate <= 0) return 0;

  // Dựng hàng đợi các lô MUA còn mở, đã trừ phần bị bán bởi các lệnh BÁN trước đó (FIFO)
  const lots: {
    remaining: number;
    buyDate: Date;
    isMargin: boolean;
    pricePerShare: number;
  }[] = [];

  for (const order of previousOrders) {
    if (order.type === "BUY") {
      lots.push({
        remaining: order.quantity,
        buyDate: new Date(order.tradeDate),
        isMargin: order.accountType === "MARGIN",
        pricePerShare: order.price,
      });
    } else {
      let toConsume = order.quantity;
      while (toConsume > 0 && lots.length > 0) {
        const lot = lots[0];
        const used = Math.min(lot.remaining, toConsume);
        lot.remaining -= used;
        toConsume -= used;
        if (lot.remaining <= 0) lots.shift();
      }
    }
  }

  // Khớp lệnh bán hiện tại với các lô còn mở
  let toSell = sell.quantity;
  const sellDate = new Date(sell.tradeDate);
  const DAY_MS = 1000 * 60 * 60 * 24;
  let fee = 0;

  for (const lot of lots) {
    if (toSell <= 0) break;
    const used = Math.min(lot.remaining, toSell);
    toSell -= used;
    if (lot.isMargin) {
      const days = Math.max(
        0,
        Math.round((sellDate.getTime() - lot.buyDate.getTime()) / DAY_MS)
      );
      fee += (used * lot.pricePerShare * marginFeeRate * days) / 365;
    }
  }

  return Math.round(fee);
}

const LongTermOrderSchema = new mongoose.Schema(
  {
    tradeDate: {
      type: Date,
      required: [true, "Ngày giao dịch là bắt buộc"],
    },
    stockCode: {
      type: String,
      required: [true, "Mã cổ phiếu là bắt buộc"],
      ref: "StockUser",
      uppercase: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockCompany",
    },
    type: {
      type: String,
      enum: ["BUY", "SELL"],
      required: [true, "Loại giao dịch là bắt buộc"],
    },
    accountType: {
      type: String,
      enum: ["NORMAL", "MARGIN"],
      default: "NORMAL",
    },
    quantity: {
      type: Number,
      required: [true, "Số lượng là bắt buộc"],
      min: [1, "Số lượng phải lớn hơn 0"],
    },
    price: {
      type: Number,
      required: [true, "Giá là bắt buộc"],
      min: [0, "Giá không được âm"],
    },
    fee: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    marginFee: {
      type: Number,
      default: 0,
    },
    isAdditionalIssuance: {
      type: Boolean,
      default: false,
    },
    costBasis: {
      type: Number,
      default: 0,
    },
    avgCost: {
      type: Number,
      default: 0,
    },
    profit: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    strictPopulate: false,
  }
);

// Pre-save middleware to calculate values based on fee rates
LongTermOrderSchema.pre("save", async function () {
  const doc = this as ILongTermOrder;
  const value = doc.quantity * doc.price;

  // If company is not set, get it from stockUser
  if (!doc.company) {
    const stockUser = await StockUser.findOne({
      stockCode: doc.stockCode,
      userId: doc.userId,
    }).populate({
      path: "company",
      select: "buyFeeRate sellFeeRate taxRate",
      strictPopulate: false,
    });

    if (!stockUser || !stockUser.company) {
      throw new Error("Không tìm thấy công ty chứng khoán");
    }

    // Set companyId from stockUser
    const companyId =
      typeof stockUser.company === "object"
        ? stockUser.company._id
        : stockUser.company;
    doc.company = companyId as Types.ObjectId;
  }

  // Populate company if it's an ObjectId
  let company: IStockCompany;
  if (doc.populated("company")) {
    company = doc.company as IStockCompany;
  } else {
    const companyDoc = await StockCompany.findById(doc.company);
    if (!companyDoc) {
      throw new Error("Không tìm thấy công ty chứng khoán");
    }
    company = companyDoc;
  }

  // Calculate avgCost based on previous orders
  if (
    doc.isNew ||
    this.isModified("stockCode") ||
    this.isModified("quantity") ||
    this.isModified("price") ||
    this.isModified("tradeDate") ||
    this.isModified("isAdditionalIssuance")
  ) {
    // Get all orders before this one (excluding current order)
    const previousOrders = await mongoose.models.LongTermOrder.find({
      stockCode: doc.stockCode,
      company: doc.company,
      userId: doc.userId,
      $or: [
        { tradeDate: { $lt: doc.tradeDate } },
        {
          tradeDate: doc.tradeDate,
          createdAt: { $lt: doc.createdAt || new Date() },
        },
      ],
    }).sort({ tradeDate: 1, createdAt: 1 });

    let totalBuyQuantity = 0;
    let totalBuyCostBasis = 0;

    // Calculate cumulative quantity and cost from previous orders
    for (const order of previousOrders) {
      if (order.type === "BUY") {
        totalBuyQuantity += order.quantity;
        totalBuyCostBasis += order.costBasis;
      } else {
        totalBuyQuantity -= order.quantity;
        totalBuyCostBasis -= order.costBasis;
      }
    }

    // Get the most recent order (BUY or SELL) to inherit avgCost
    const lastOrder = previousOrders[previousOrders.length - 1];
    const previousAvgCost = lastOrder?.avgCost || 0;

    if (doc.type === "BUY") {
      doc.fee = doc.isAdditionalIssuance
        ? 0
        : Math.round(value * company.buyFeeRate);
      doc.tax = 0;
      doc.costBasis = value + doc.fee;
      doc.profit = 0;
      doc.marginFee = 0;

      // Calculate avgCost based on previous avgCost and new purchase
      if (previousAvgCost > 0 && totalBuyQuantity > 0) {
        // Weighted average: (previous avgCost × remaining quantity + new costBasis) / new total quantity
        const newTotalQuantity = totalBuyQuantity + doc.quantity;
        const newTotalCostBasis =
          previousAvgCost * totalBuyQuantity + doc.costBasis;
        doc.avgCost = Math.round(newTotalCostBasis / newTotalQuantity);
      } else {
        // First BUY order or no previous avgCost
        const newTotalQuantity = totalBuyQuantity + doc.quantity;
        const newTotalCostBasis = totalBuyCostBasis + doc.costBasis;
        doc.avgCost = Math.round(newTotalCostBasis / newTotalQuantity);
      }
    } else {
      // SELL - use sell fee rate
      doc.fee = Math.round(value * company.sellFeeRate);
      doc.tax = Math.round(value * company.taxRate);

      if (previousAvgCost > 0) {
        // Use avgCost from the most recent order (BUY or SELL)
        doc.avgCost = previousAvgCost;
        doc.costBasis = previousAvgCost * doc.quantity;

        const sellValue = doc.quantity * doc.price;
        const feeAndTaxRate = company.sellFeeRate + company.taxRate;
        const firstPart = sellValue - sellValue * feeAndTaxRate;
        const secondPart = doc.quantity * previousAvgCost;

        doc.profit = Math.round(firstPart - secondPart);
      } else if (totalBuyQuantity > 0) {
        // Fallback: calculate weighted average if no previous order has avgCost
        const averageCost = totalBuyCostBasis / totalBuyQuantity;
        const averageCostPerShare = Math.round(averageCost);

        doc.avgCost = averageCostPerShare;
        doc.costBasis = averageCostPerShare * doc.quantity;

        const sellValue = doc.quantity * doc.price;
        const feeAndTaxRate = company.sellFeeRate + company.taxRate;
        const firstPart = sellValue - sellValue * feeAndTaxRate;
        const secondPart = doc.quantity * averageCostPerShare;

        doc.profit = Math.round(firstPart - secondPart);
      } else {
        // No previous BUY orders found
        doc.avgCost = 0;
        doc.costBasis = 0;
        doc.profit = Math.round(value - doc.fee - doc.tax);
      }

      // Phí margin: khớp FIFO với các lô mua bằng tài khoản vay theo số ngày nắm giữ
      doc.marginFee = computeMarginFeeForSell(
        previousOrders as ILongTermOrder[],
        { quantity: doc.quantity, tradeDate: doc.tradeDate },
        company.marginFeeRate || 0
      );
      doc.profit -= doc.marginFee;
      doc.accountType = doc.marginFee > 0 ? "MARGIN" : "NORMAL";
    }
  } else {
    // If not modifying key fields, just update fees for existing order
    if (doc.type === "BUY") {
      doc.fee = doc.isAdditionalIssuance
        ? 0
        : Math.round(value * company.buyFeeRate);
      doc.tax = 0;
      doc.costBasis = value + doc.fee;
      doc.profit = 0;
      doc.marginFee = 0;
    } else {
      doc.fee = Math.round(value * company.sellFeeRate);
      doc.tax = Math.round(value * company.taxRate);
    }
  }
});

const LongTermOrder: Model<ILongTermOrder> =
  mongoose.models.LongTermOrder ||
  mongoose.model<ILongTermOrder>("LongTermOrder", LongTermOrderSchema);

export default LongTermOrder;

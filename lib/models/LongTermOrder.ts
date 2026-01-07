import mongoose, { Document, Model, Types } from "mongoose";

export type OrderType = "BUY" | "SELL";

export interface ILongTermOrder extends Document {
  tradeDate: Date;
  stockCode: string;
  companyId: Types.ObjectId;
  type: OrderType;
  quantity: number;
  price: number;
  feeRate: number;
  taxRate: number;
  fee: number;
  tax: number;
  costBasis: number;
  profit: number;
  createdAt: Date;
  updatedAt: Date;
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
      uppercase: true,
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockCompany",
      required: [true, "Công ty chứng khoán là bắt buộc"],
    },
    type: {
      type: String,
      enum: ["BUY", "SELL"],
      required: [true, "Loại giao dịch là bắt buộc"],
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
    feeRate: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    fee: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    costBasis: {
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

  if (doc.type === "BUY") {
    doc.fee = Math.round(value * doc.feeRate);
    doc.tax = 0;
    doc.costBasis = value + doc.fee;
    doc.profit = 0;
  } else {
    // SELL - use sell fee rate (feeRate is set to sellFeeRate in API)
    doc.fee = Math.round(value * doc.feeRate);
    doc.tax = Math.round(value * doc.taxRate);

    // Calculate cost basis and profit based on average cost basis of previous BUY orders
    if (
      doc.isNew ||
      this.isModified("stockCode") ||
      this.isModified("quantity") ||
      this.isModified("tradeDate")
    ) {
      const buyOrders = await mongoose.models.LongTermOrder.find({
        stockCode: doc.stockCode,
        type: "BUY",
        tradeDate: { $lte: doc.tradeDate },
      }).sort({ tradeDate: 1, createdAt: 1 });

      if (buyOrders.length > 0) {
        let totalBuyQuantity = 0;
        let totalBuyCostBasis = 0;

        for (const buyOrder of buyOrders) {
          totalBuyQuantity += buyOrder.quantity;
          totalBuyCostBasis += buyOrder.costBasis;
        }

        const averageCostPerShare = totalBuyCostBasis / totalBuyQuantity;

        doc.costBasis = Math.round(averageCostPerShare * doc.quantity);
        const sellValue = doc.quantity * doc.price;
        const feeAndTaxRate = doc.feeRate + doc.taxRate;

        const remainingQtyAfterSell = totalBuyQuantity - doc.quantity;

        const firstPart = sellValue - sellValue * feeAndTaxRate;

        const secondPart = remainingQtyAfterSell * averageCostPerShare;

        doc.profit = Math.round(firstPart - secondPart);
      } else {
        // No previous BUY orders found, set costBasis to 0
        doc.costBasis = 0;
        doc.profit = Math.round(value - doc.fee - doc.tax);
      }
    }
  }
});

const LongTermOrder: Model<ILongTermOrder> =
  mongoose.models.LongTermOrder ||
  mongoose.model<ILongTermOrder>("LongTermOrder", LongTermOrderSchema);

export default LongTermOrder;

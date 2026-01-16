import mongoose, { Document, Model, Types } from "mongoose";
import StockUser from "./StockUser";
import StockCompany, { IStockCompany } from "./StockCompany";

export type OrderType = "BUY" | "SELL";

export interface ILongTermOrder extends Document {
  tradeDate: Date;
  stockCode: string;
  userId: Types.ObjectId;
  company: Types.ObjectId | IStockCompany; // Có thể là ObjectId hoặc populated IStockCompany
  type: OrderType;
  quantity: number;
  price: number;
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

  if (doc.type === "BUY") {
    doc.fee = Math.round(value * company.buyFeeRate);
    doc.tax = 0;
    doc.costBasis = value + doc.fee;
    doc.profit = 0;
  } else {
    // SELL - use sell fee rate (feeRate is set to sellFeeRate in API)
    doc.fee = Math.round(value * company.sellFeeRate);
    doc.tax = Math.round(value * company.taxRate);

    // Calculate cost basis and profit based on average cost basis of previous BUY orders
    if (
      doc.isNew ||
      this.isModified("stockCode") ||
      this.isModified("quantity") ||
      this.isModified("tradeDate")
    ) {
      // Only take BUY orders strictly before this SELL order's trade date, same company and same user
      const longTermOrders = await mongoose.models.LongTermOrder.find({
        stockCode: doc.stockCode,
        company: doc.company,
        userId: doc.userId,
        tradeDate: { $lte: doc.tradeDate },
      }).sort({ tradeDate: 1, createdAt: 1 });

      if (longTermOrders.length > 0) {
        let totalBuyQuantity = 0;
        let totalBuyCostBasis = 0;

        for (const order of longTermOrders) {
          if (order.type === "BUY") {
            totalBuyQuantity += order.quantity;
            totalBuyCostBasis += order.costBasis;
          } else {
            totalBuyQuantity -= order.quantity;
            totalBuyCostBasis -= order.costBasis;
          }
        }

        const averageCost = totalBuyCostBasis / totalBuyQuantity;
        const averageCostPerShare = Math.round(averageCost);

        doc.costBasis = averageCostPerShare * doc.quantity;
        const sellValue = doc.quantity * doc.price;
        const feeAndTaxRate = company.sellFeeRate + company.taxRate;

        const firstPart = sellValue - sellValue * feeAndTaxRate;

        const secondPart = doc.quantity * averageCostPerShare;

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

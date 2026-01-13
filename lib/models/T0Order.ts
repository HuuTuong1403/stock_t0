import mongoose, { Document, Model, Types } from "mongoose";
import StockUser from "./StockUser";
import StockCompany, { IStockCompany } from "./StockCompany";

export interface IT0Order extends Document {
  tradeDate: Date;
  stockCode: string;
  userId: Types.ObjectId;
  company: Types.ObjectId | IStockCompany; // Có thể là ObjectId hoặc populated IStockCompany
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyValue: number;
  sellValue: number;
  buyFeeRate: number;
  sellFeeRate: number;
  taxRate: number;
  buyFee: number;
  sellFee: number;
  sellTax: number;
  profitBeforeFees: number;
  profitAfterFees: number;
  createdAt: Date;
  updatedAt: Date;
}

const T0OrderSchema = new mongoose.Schema(
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
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockCompany",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, "Số lượng là bắt buộc"],
      min: [1, "Số lượng phải lớn hơn 0"],
    },
    buyPrice: {
      type: Number,
      required: [true, "Giá mua là bắt buộc"],
      min: [0, "Giá mua không được âm"],
    },
    sellPrice: {
      type: Number,
      required: [true, "Giá bán là bắt buộc"],
      min: [0, "Giá bán không được âm"],
    },
    buyValue: {
      type: Number,
      default: 0,
    },
    sellValue: {
      type: Number,
      default: 0,
    },
    buyFeeRate: {
      type: Number,
      default: 0,
    },
    sellFeeRate: {
      type: Number,
      default: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    buyFee: {
      type: Number,
      default: 0,
    },
    sellFee: {
      type: Number,
      default: 0,
    },
    sellTax: {
      type: Number,
      default: 0,
    },
    profitBeforeFees: {
      type: Number,
      default: 0,
    },
    profitAfterFees: {
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
T0OrderSchema.pre("save", async function () {
  const doc = this as IT0Order;

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

  doc.buyValue = doc.quantity * doc.buyPrice;
  doc.sellValue = doc.quantity * doc.sellPrice;
  doc.buyFeeRate = company.buyFeeRate;
  doc.sellFeeRate = company.sellFeeRate;
  doc.taxRate = company.taxRate;
  doc.buyFee = Math.round(doc.buyValue * company.buyFeeRate);
  doc.sellFee = Math.round(doc.sellValue * company.sellFeeRate);
  doc.sellTax = Math.round(doc.sellValue * company.taxRate);
  doc.profitBeforeFees = doc.sellValue - doc.buyValue;
  doc.profitAfterFees =
    doc.profitBeforeFees - doc.buyFee - doc.sellFee - doc.sellTax;
});

const T0Order: Model<IT0Order> =
  mongoose.models.T0Order || mongoose.model<IT0Order>("T0Order", T0OrderSchema);

export default T0Order;

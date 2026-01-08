import mongoose, { Document, Model, Types } from "mongoose";

export interface IT0Order extends Document {
  tradeDate: Date;
  stockCode: string;
  companyId: Types.ObjectId;
  userId: Types.ObjectId;
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
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockCompany",
      required: [true, "Công ty chứng khoán là bắt buộc"],
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

  doc.buyValue = doc.quantity * doc.buyPrice;
  doc.sellValue = doc.quantity * doc.sellPrice;
  doc.buyFee = Math.round(doc.buyValue * doc.buyFeeRate);
  doc.sellFee = Math.round(doc.sellValue * doc.sellFeeRate);
  doc.sellTax = Math.round(doc.sellValue * doc.taxRate);
  doc.profitBeforeFees = doc.sellValue - doc.buyValue;
  doc.profitAfterFees =
    doc.profitBeforeFees - doc.buyFee - doc.sellFee - doc.sellTax;
});

const T0Order: Model<IT0Order> =
  mongoose.models.T0Order || mongoose.model<IT0Order>("T0Order", T0OrderSchema);

export default T0Order;

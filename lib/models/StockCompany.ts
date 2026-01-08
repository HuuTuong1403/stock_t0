import mongoose, { Document, Model } from "mongoose";

export interface IStockCompany extends Document {
  name: string;
  buyFeeRate: number;
  sellFeeRate: number;
  taxRate: number;
  isDefault: boolean;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockCompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên công ty chứng khoán là bắt buộc"],
      trim: true,
    },
    buyFeeRate: {
      type: Number,
      required: [true, "Phí mua là bắt buộc"],
      default: 0.0015, // 0.15%
      min: [0, "Phí mua không được âm"],
    },
    sellFeeRate: {
      type: Number,
      required: [true, "Phí bán là bắt buộc"],
      default: 0.0015, // 0.15%
      min: [0, "Phí bán không được âm"],
    },
    taxRate: {
      type: Number,
      required: [true, "Thuế là bắt buộc"],
      default: 0.001, // 0.1%
      min: [0, "Thuế không được âm"],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

StockCompanySchema.index({ userId: 1, name: 1 }, { unique: true });

const StockCompany: Model<IStockCompany> =
  mongoose.models.StockCompany ||
  mongoose.model<IStockCompany>("StockCompany", StockCompanySchema);

export default StockCompany;

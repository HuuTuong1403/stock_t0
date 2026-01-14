import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStock extends Document {
  code: string;
  name: string;
  industry: string;
  marketPrice?: number;
  openPrice?: number;
  closePrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
  createdAt: Date;
  updatedAt: Date;
}

const StockSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Mã cổ phiếu là bắt buộc"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [3, "Mã cổ phiếu không quá 3 ký tự"],
    },
    name: {
      type: String,
      required: [true, "Tên doanh nghiệp là bắt buộc"],
      trim: true,
    },
    industry: {
      type: String,
      required: [true, "Ngành hàng là bắt buộc"],
      trim: true,
    },
    marketPrice: {
      type: Number,
      default: 0,
    },
    openPrice: {
      type: Number,
      default: 0,
    },
    highPrice: {
      type: Number,
      default: 0,
    },
    lowPrice: {
      type: Number,
      default: 0,
    },
    volume: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Stock: Model<IStock> =
  mongoose.models.Stock || mongoose.model<IStock>("Stock", StockSchema);

export default Stock;

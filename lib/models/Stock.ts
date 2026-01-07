import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStock extends Document {
  code: string;
  name: string;
  marketPrice: number;
  currentCostBasis: number;
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
      maxlength: [10, "Mã cổ phiếu không quá 10 ký tự"],
    },
    name: {
      type: String,
      required: [true, "Tên doanh nghiệp là bắt buộc"],
      trim: true,
    },
    marketPrice: {
      type: Number,
      default: 0,
      min: [0, "Giá thị trường không được âm"],
    },
    currentCostBasis: {
      type: Number,
      default: 0,
      min: [0, "Giá vốn không được âm"],
    },
  },
  {
    timestamps: true,
  }
);

const Stock: Model<IStock> =
  mongoose.models.Stock || mongoose.model<IStock>("Stock", StockSchema);

export default Stock;

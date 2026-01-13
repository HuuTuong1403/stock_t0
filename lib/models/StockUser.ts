import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { IStockCompany } from "./StockCompany";

export interface IStockUser extends Document {
  stockCode: string;
  costPrice: number; // [Giá vốn trung bình]
  userId: Types.ObjectId;
  company: Types.ObjectId | IStockCompany; // Có thể là ObjectId hoặc populated IStockCompany
  createdAt: Date;
  updatedAt: Date;
}

// Type helper cho StockUser với company đã được populate
export type StockUserWithCompany = Omit<IStockUser, "company"> & {
  company: IStockCompany;
};

const StockUserSchema = new Schema(
  {
    stockCode: {
      type: String,
      required: [true, "Mã cổ phiếu là bắt buộc"],
      uppercase: true,
      trim: true,
    },
    costPrice: {
      type: Number,
      required: [true, "Giá vốn là bắt buộc"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "StockCompany",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const StockUser: Model<IStockUser> =
  mongoose.models.StockUser ||
  mongoose.model<IStockUser>("StockUser", StockUserSchema);

export default StockUser;

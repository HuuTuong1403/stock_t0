import mongoose, { Schema, Document, Model } from "mongoose";

export type DividendType = "STOCK" | "CASH";

export interface IDividend extends Document {
  dividendDate: Date;
  stockCode: string;
  type: DividendType;
  value: number;
  userId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DividendSchema: Schema = new Schema(
  {
    dividendDate: {
      type: Date,
      required: [true, "Ngày chia tách là bắt buộc"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    stockCode: {
      type: String,
      required: [true, "Mã cổ phiếu là bắt buộc"],
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["STOCK", "CASH"],
      required: [true, "Loại chia tách là bắt buộc"],
    },
    value: {
      type: Number,
      required: [true, "Giá trị chia tách là bắt buộc"],
      min: [0, "Giá trị không được âm"],
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Dividend: Model<IDividend> =
  mongoose.models.Dividend ||
  mongoose.model<IDividend>("Dividend", DividendSchema);

export default Dividend;

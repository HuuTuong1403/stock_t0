// scripts/migrate-add-field.ts
// Script để cập nhật/thêm field mới cho MongoDB documents
import mongoose from "mongoose";
import { config } from "dotenv";

// Load .env (cần có MONGODB_URI)
config();

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI");
}

// ==== IMPORT MODEL ====
// Import model bạn muốn migrate (bỏ comment khi cần dùng)
import {
  Dividend,
  LongTermOrder,
  Stock,
  StockCompany,
  T0Order,
  User,
} from "../lib/models";
// import { Stock, T0Order, LongTermOrder } from "../lib/models";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // ============================================
  // CÁC VÍ DỤ UPDATE FIELD:
  // ============================================

  // === VÍ DỤ 1: Thêm field mới với giá trị mặc định cho tất cả documents ===
  // const res = await Dividend.updateMany(
  //   {}, // Không có filter = update tất cả
  //   {
  //     $set: {
  //       newField: "default value",
  //     },
  //   }
  // );

  // === VÍ DỤ 2: Thêm field mới CHỈ cho documents chưa có field đó ===
  // const res = await Dividend.updateMany(
  //   { isUsed: { $exists: false } }, // Lọc documents chưa có field "isUsed"
  //   {
  //     $set: {
  //       isUsed: false, // Giá trị mặc định
  //     },
  //   }
  // );

  // === VÍ DỤ 3: Cập nhật field dựa trên điều kiện ===
  // const res = await Dividend.updateMany(
  //   { type: "CASH", value: { $lt: 1000 } }, // Điều kiện: type = CASH và value < 1000
  //   {
  //     $set: {
  //       isLowValue: true,
  //     },
  //   }
  // );

  // === VÍ DỤ 4: Cập nhật field dựa trên giá trị của field khác ===
  // const res = await Dividend.updateMany(
  //   {}, // Tất cả documents
  //   [
  //     {
  //       $set: {
  //         // Tính toán giá trị mới dựa trên field hiện có
  //         calculatedField: { $multiply: ["$value", 1.1] }, // value * 1.1
  //       },
  //     },
  //   ]
  // );

  // === VÍ DỤ 5: Update nhiều collections cùng lúc ===
  // const dividendRes = await Dividend.updateMany(
  //   { isUsed: { $exists: false } },
  //   { $set: { isUsed: false } }
  // );
  // const stockRes = await Stock.updateMany(
  //   { currentCostBasis: { $exists: false } },
  //   { $set: { currentCostBasis: 0 } }
  // );
  // console.log("Dividends:", dividendRes.modifiedCount);
  // console.log("Stocks:", stockRes.modifiedCount);

  // === VÍ DỤ 6: Rename field (đổi tên field) ===
  // const res = await Dividend.updateMany(
  //   {},
  //   [
  //     {
  //       $set: {
  //         newFieldName: "$oldFieldName", // Copy giá trị từ field cũ
  //       },
  //     },
  //   ]
  // );
  // // Sau đó có thể xóa field cũ:
  // // await Dividend.updateMany({}, { $unset: { oldFieldName: "" } });

  // ============================================
  // MIGRATION CỤ THỂ - SỬA DÒNG NÀY:
  // ============================================

  // Ví dụ: Thêm field userId cho documents chưa có
  const res = await User.updateMany(
    { investorToken: { $exists: false } }, // Lọc documents chưa có userId
    {
      $set: {
        investorToken: "",
        investorId: "",
      },
    }
  );

  console.log("📊 Migration Results:");
  console.log(`   Matched: ${res.matchedCount} documents`);
  console.log(`   Modified: ${res.modifiedCount} documents`);

  await mongoose.disconnect();
  console.log("✅ Done! Disconnected from MongoDB");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

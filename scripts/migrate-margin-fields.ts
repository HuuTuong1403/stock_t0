// scripts/migrate-margin-fields.ts
// Thêm các field phục vụ tính phí margin:
//  - StockCompany.marginFeeRate (lãi suất margin/năm, mặc định 0)
//  - LongTermOrder.accountType  (NORMAL | MARGIN, mặc định NORMAL)
//  - LongTermOrder.marginFee    (phí margin đã tính khi bán, mặc định 0)
//
// Chạy: npm run migrate:margin
import mongoose from "mongoose";
import { config } from "dotenv";

config();

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI");
}

import { StockCompany, LongTermOrder } from "../lib/models";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const companyRes = await StockCompany.updateMany(
    { marginFeeRate: { $exists: false } },
    { $set: { marginFeeRate: 0 } }
  );

  const orderAccountRes = await LongTermOrder.updateMany(
    { accountType: { $exists: false } },
    { $set: { accountType: "NORMAL" } }
  );

  const orderMarginRes = await LongTermOrder.updateMany(
    { marginFee: { $exists: false } },
    { $set: { marginFee: 0 } }
  );

  console.log("📊 Migration Results:");
  console.log(
    `   StockCompany.marginFeeRate → matched: ${companyRes.matchedCount}, modified: ${companyRes.modifiedCount}`
  );
  console.log(
    `   LongTermOrder.accountType  → matched: ${orderAccountRes.matchedCount}, modified: ${orderAccountRes.modifiedCount}`
  );
  console.log(
    `   LongTermOrder.marginFee    → matched: ${orderMarginRes.matchedCount}, modified: ${orderMarginRes.modifiedCount}`
  );

  await mongoose.disconnect();
  console.log("✅ Done! Disconnected from MongoDB");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

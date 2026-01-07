// scripts/migrate-add-field.ts
import mongoose from "mongoose";
import { config } from "dotenv";

// Load .env (cần có MONGODB_URI)
config();

// TODO: sửa URI nếu bạn không dùng .env
const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI");
}

// ==== IMPORT MODEL ====
// Giả sử bạn có LongTermOrder, sửa đường dẫn tùy cấu trúc dự án:
import { Dividend } from "../lib/models";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected");

  // Ví dụ: thêm field mới "newField" với default = 0 nếu chưa có
  // Bạn có thể đổi logic bên dưới để tính toán theo document
  const res = await Dividend.updateMany(
    { isUsed: { $exists: false } }, // lọc doc chưa có field
    {
      $set: {
        isUsed: false, // TODO: đặt giá trị mặc định hoặc tính toán khác
      },
    }
  );

  console.log("Matched:", res.matchedCount, "Modified:", res.modifiedCount);

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

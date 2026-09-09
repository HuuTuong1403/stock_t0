import { Types } from "mongoose";
import LongTermOrder from "@/lib/models/LongTermOrder";

export type LongTermOrderAnchor = {
  _id: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  stockCode: string;
  company: Types.ObjectId | { _id: Types.ObjectId } | string;
  tradeDate: Date;
  createdAt?: Date;
};

function companyIdOf(company: LongTermOrderAnchor["company"]) {
  if (typeof company === "object" && company !== null && "_id" in company) {
    return company._id;
  }
  return company;
}

/** Tính lại avgCost / costBasis / lãi các lệnh dài hạn đứng sau mốc (cùng mã, công ty, user). */
export async function recalculateSubsequentLongTermOrders(
  anchor: LongTermOrderAnchor
) {
  const companyId = companyIdOf(anchor.company);
  const createdAt = anchor.createdAt ?? new Date(0);

  const laterOrders = await LongTermOrder.find({
    userId: anchor.userId,
    stockCode: anchor.stockCode,
    company: companyId,
    _id: { $ne: anchor._id },
    $or: [
      { tradeDate: { $gt: anchor.tradeDate } },
      {
        tradeDate: anchor.tradeDate,
        createdAt: { $gt: createdAt },
      },
    ],
  }).sort({ tradeDate: 1, createdAt: 1 });

  for (const order of laterOrders) {
    order.$locals.forceAvgRecalc = true;
    await order.save();
  }
}

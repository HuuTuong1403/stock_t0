import { getCashDividendPriceReduction } from "@/lib/constants/dividend";
import { scalePriceByRatio } from "@/lib/utils/price-scale";

interface AdjustableOrder {
  quantity: number;
  price: number;
}

export function getStockSplitRatio(percent: number): number {
  return 1 + percent / 100;
}

export function applyStockDividend(order: AdjustableOrder, splitRatio: number): void {
  order.quantity = Math.round(order.quantity * splitRatio);
  order.price = scalePriceByRatio(order.price, 1 / splitRatio);
}

export function revertStockDividend(order: AdjustableOrder, splitRatio: number): void {
  order.quantity = Math.round(order.quantity / splitRatio);
  order.price = scalePriceByRatio(order.price, splitRatio);
}

export function applyCashDividend(order: Pick<AdjustableOrder, "price">, percent: number): void {
  const reduction = getCashDividendPriceReduction(percent);
  order.price = Math.max(0, order.price - reduction);
}

export function revertCashDividend(order: Pick<AdjustableOrder, "price">, percent: number): void {
  order.price = order.price + getCashDividendPriceReduction(percent);
}

export const PRICE_SCALE = 1000;

export function roundToPriceScale(value: number): number {
  return Math.round(value * PRICE_SCALE) / PRICE_SCALE;
}

/** Nhân giá (đã scale) với ratio rồi chia lại PRICE_SCALE. */
export function scalePriceByRatio(price: number, ratio: number): number {
  const scaled = Math.round(price * PRICE_SCALE);
  return Math.round(scaled * ratio) / PRICE_SCALE;
}

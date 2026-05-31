export const CASH_DIVIDEND_PAR_VALUE = 10_000;

export function getCashDividendPriceReduction(percent: number): number {
  return Math.round((CASH_DIVIDEND_PAR_VALUE * percent) / 100);
}

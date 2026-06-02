/** Giờ giao dịch HOSE/HNX (UTC+7): 9:00–11:30, 13:00–15:00, T2–T6 */
export function isTradingHours(now = new Date()): boolean {
  const vn = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })
  );
  const day = vn.getDay();
  if (day === 0 || day === 6) return false;

  const minutes = vn.getHours() * 60 + vn.getMinutes();
  const inMorning = minutes >= 9 * 60 && minutes < 11 * 60 + 30;
  const inAfternoon = minutes >= 13 * 60 && minutes < 15 * 60;
  return inMorning || inAfternoon;
}

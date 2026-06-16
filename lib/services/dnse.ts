import User from "@/lib/models/User";
import dbConnect from "@/lib/mongodb";

const DNSE_AUTH_URL = "https://api.dnse.com.vn/user-service/api/auth";
const DNSE_ME_URL = "https://api.dnse.com.vn/user-service/api/me";

export function getDnseCredentialsFromEnv() {
  const username = process.env.DNSE_USERNAME?.trim();
  const password = process.env.DNSE_PASSWORD?.trim();
  if (!username || !password) return null;
  return { username, password };
}

export async function authenticateDnse(username: string, password: string) {
  const response = await fetch(DNSE_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "DNSE authentication failed");
  }

  const data = await response.json();
  const token = data.token as string | undefined;
  if (!token) {
    throw new Error("Token không tìm thấy trong response DNSE");
  }

  const investorResponse = await fetch(DNSE_ME_URL, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });

  if (!investorResponse.ok) {
    throw new Error("Failed to get investor info");
  }

  const investorInfo = await investorResponse.json();
  const investorId = investorInfo.investorId?.toString();
  if (!investorId) {
    throw new Error("Investor ID không tìm thấy");
  }

  return { token, investorId, investorInfo };
}

export async function clearInvestorToken(userId: string): Promise<void> {
  await dbConnect();
  await User.findByIdAndUpdate(userId, {
    investorToken: "",
    investorId: "",
  });
}

export type ValidateInvestorTokenResult =
  | { valid: true; investorId: string }
  | { valid: false; reason: "expired" }
  | { valid: false; reason: "error" };

/**
 * Kiểm tra investorToken còn hợp lệ với DNSE hay không.
 * Nếu hết hạn/không hợp lệ thì xóa token khỏi DB.
 */
export async function validateInvestorToken(
  userId: string,
  investorToken: string
): Promise<ValidateInvestorTokenResult> {
  try {
    const response = await fetch(DNSE_ME_URL, {
      method: "GET",
      headers: {
        authorization: `Bearer ${investorToken}`,
      },
    });

    if (!response.ok) {
      await clearInvestorToken(userId);
      return { valid: false, reason: "expired" };
    }

    const investorInfo = await response.json();
    const investorId = investorInfo.investorId?.toString();

    if (!investorId) {
      await clearInvestorToken(userId);
      return { valid: false, reason: "expired" };
    }

    return { valid: true, investorId };
  } catch (error) {
    console.error("Error validating DNSE token:", error);
    return { valid: false, reason: "error" };
  }
}

/**
 * Refresh DNSE token tự động khi gặp lỗi authentication
 * @param userId - User ID cần refresh token
 * @returns New token và investorId hoặc null nếu không thể refresh
 */
export async function refreshDnseToken(
  userId: string
): Promise<{ investorToken: string; investorId: string } | null> {
  try {
    await dbConnect();

    const credentials = getDnseCredentialsFromEnv();
    if (!credentials) {
      console.error(
        "DNSE credentials not configured. Set DNSE_USERNAME and DNSE_PASSWORD."
      );
      return null;
    }

    const { token, investorId } = await authenticateDnse(
      credentials.username,
      credentials.password,
    );

    await User.findByIdAndUpdate(userId, {
      investorToken: token,
      investorId,
    });

    return { investorToken: token, investorId };
  } catch (error) {
    console.error("Error refreshing DNSE token:", error);
    return null;
  }
}

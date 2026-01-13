import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { IUser } from "@/lib/models/User";

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

    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found for token refresh:", userId);
      return null;
    }

    // const { dnseUsername, dnsePassword } = user as IUser;

    // if (!dnseUsername || !dnsePassword) {
    //   console.error(
    //     "DNSE credentials not found for user. User needs to authenticate manually."
    //   );
    //   return null;
    // }

    // Authenticate with DNSE API
    const response = await fetch(
      "https://api.dnse.com.vn/user-service/api/auth",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "064C084832",
          password: "1403@TomL",
        }),
      }
    );
    console.log("🚀 => response:", response);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DNSE authentication failed:", errorText);
      return null;
    }

    const data = await response.json();
    const token = data.token;

    if (!token) {
      console.error("Token not found in DNSE response");
      return null;
    }

    // Get investor info
    const investorResponse = await fetch(
      "https://api.dnse.com.vn/user-service/api/me",
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );

    if (!investorResponse.ok) {
      console.error("Failed to get investor info after token refresh");
      return null;
    }

    const investorInfo = await investorResponse.json();
    const investorId = investorInfo.investorId?.toString();

    if (!investorId) {
      console.error("Investor ID not found after token refresh");
      return null;
    }

    // Update user với token mới
    await User.findByIdAndUpdate(userId, {
      investorToken: token,
      investorId: investorId,
    });

    console.log("DNSE token refreshed successfully for user:", userId);

    return {
      investorToken: token,
      investorId: investorId,
    };
  } catch (error) {
    console.error("Error refreshing DNSE token:", error);
    return null;
  }
}

/**
 * Extract error message from axios error or any error
 */
export function getErrorMessage(error: unknown | { error?: string }): string {
  if (error && typeof error === "object") {
    console.log("🚀 => error:", error);
    // Axios error structure
    if ("response" in error && error.response) {
      const response = error.response as { data?: { error?: string } };
      if (response.data?.error) {
        return response.data.error;
      }
    } else if ((error as { error?: string })?.error) {
      return (error as { error?: string })?.error || "";
    } 
    // Error object with message
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }
  // String error
  if (typeof error === "string") {
    return error;
  }
  // Default fallback
  return "Đã xảy ra lỗi không xác định";
}

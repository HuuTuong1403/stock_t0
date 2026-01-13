import axiosClient from "../axiosClient";

export const exportExcel = async (
  type: "stocks" | "t0-orders" | "long-term-orders" | "dividends"
) => {
  try {
    const { data } = await axiosClient.get(`/${type}/export`, {
      responseType: "blob",
    });

    if (!data) throw new Error("Lỗi khi xuất dữ liệu");

    return data;
  } catch (error) {
    return error;
  }
};

export const exportExcelTemplate = async (
  type: "stocks" | "t0-orders" | "long-term-orders" | "dividends"
) => {
  try {
    const { data } = await axiosClient.get(`/${type}/export-template`, {
      responseType: "blob",
    });

    if (!data) throw new Error("Lỗi khi tải template");

    return data;
  } catch (error) {
    return error;
  }
};

export const importExcel = async (
  type: "stocks" | "t0-orders" | "long-term-orders" | "dividends",
  formData: FormData
) => {
  try {
    const { data } = await axiosClient.post(`/${type}/import`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (!data) throw new Error("Lỗi khi import dữ liệu");

    // Với type "stocks", subscribeStock đã được gọi từ server-side ngay sau khi tạo mỗi stock
    // Không cần gọi lại từ client-side

    return data;
  } catch (error) {
    return error;
  }
};

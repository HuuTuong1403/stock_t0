import { IStock } from "../models";
import axiosClient from "../axiosClient";

export const editOrCreateStock = async (
  stock: Pick<IStock, "code" | "name" | "industry" | "marketPrice">,
  method: "PUT" | "POST"
) => {
  try {
    const { data } = await axiosClient.request({
      url: method === "PUT" ? `/stocks/${stock.code}` : "/stocks",
      method,
      data: stock,
    });

    if (!data)
      throw new Error(
        method === "PUT" ? "Lỗi khi cập nhật cổ phiếu" : "Lỗi khi tạo cổ phiếu"
      );

    return data;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Lỗi khi cập nhật cổ phiếu"
    );
  }
};

export const getStocks = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
}) => {
  try {
    const { data } = await axiosClient.get("/stocks", {
      params: {
        page: params?.page || 1,
        limit: params?.limit || 50,
        search: params?.search || "",
        ...(params?.industry && { industry: params.industry }),
      },
    });

    if (!data)
      return {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      };

    return data;
  } catch (error) {
    return error;
  }
};

export const deleteStock = async (code: string) => {
  try {
    const { data } = await axiosClient.delete(`/stocks/${code}`);

    if (!data) throw new Error("Lỗi khi xóa cổ phiếu");

    return data;
  } catch (error) {
    return error;
  }
};

export const exportStocks = async () => {
  try {
    const { data } = await axiosClient.get("/stocks/export");

    if (!data) throw new Error("Lỗi khi xuất dữ liệu");

    return data;
  } catch (error) {
    return error;
  }
};

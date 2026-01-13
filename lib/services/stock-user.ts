import axiosClient from "../axiosClient";
import { StockUser } from "../interfaces";

export const getStockUsers = async () => {
  try {
    const { data } = await axiosClient.get("/stock-users");
    console.log("🚀 => data:", data);

    if (!data) return [];

    return data;
  } catch (error) {
    return error;
  }
};

export const createStockUser = async (stockUser: StockUser) => {
  try {
    const { data } = await axiosClient.post("/stock-users", stockUser);

    if (data.error) throw new Error(data.error);

    return data;
  } catch (error) {
    console.log("🚀 => error:", error);
    return error;
  }
};

export const updateStockUser = async (stockUser: StockUser) => {
  try {
    const { data } = await axiosClient.put(
      `/stock-users/${stockUser._id}`,
      stockUser
    );

    if (data.error) throw new Error(data.error);

    return data;
  } catch (error) {
    console.log("🚀 => error:", error);
    return error;
  }
};

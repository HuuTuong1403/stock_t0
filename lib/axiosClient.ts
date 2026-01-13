import axios from "axios";
import { Agent } from "https";
import queryString from "query-string";

const axiosClient = axios.create({
  timeout: 250000,
  baseURL: `/api`,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  },
  withCredentials: true,
  paramsSerializer: (params) => {
    return queryString.stringify(params, {
      skipNull: true,
      skipEmptyString: true,
    });
  },
});

axiosClient.interceptors.request.use(
  async (config) => {
    config.httpsAgent = new Agent({
      rejectUnauthorized: false,
    });

    return config;
  },
  (err) => {
    return Promise.reject(err);
  }
);

axiosClient.interceptors.response.use(
  (res) => {
    return res;
  },
  (err) => {
    // Always reject to let callers handle errors via try/catch
    if (err.response && err.response.data) {
      return Promise.reject(err.response.data);
    }
    return Promise.reject(err);
  }
);

export default axiosClient;

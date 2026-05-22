import axios from "axios";

export const jikanApi = axios.create({
  baseURL: "https://api.jikan.moe/v4",
  timeout: 10000,
});

// Rate limiting: Jikan allows 3 requests/second
jikanApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      // Wait 1 second and retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return jikanApi.request(error.config);
    }
    return Promise.reject(error);
  },
);

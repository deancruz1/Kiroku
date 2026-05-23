import axios from "axios";

export const jikanApi = axios.create({
  baseURL: "https://api.jikan.moe/v4",
  timeout: 15000,
});

// Rate limiting + timeout retries
jikanApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    config.retryCount = config.retryCount || 0;

    const shouldRetry =
      error.response?.status === 429 ||
      error.response?.status === 504 ||
      error.code === "ECONNABORTED";

    if (shouldRetry && config.retryCount < 3) {
      config.retryCount++;
      const delay = 1000 * config.retryCount;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return jikanApi.request(config);
    }

    return Promise.reject(error);
  },
);
